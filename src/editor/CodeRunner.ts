import * as WebIFC from 'web-ifc';
import * as THREE from 'three';
import { transform } from 'sucrase';
import { ifcEngine } from '../core/IfcEngine';
import { SceneManager } from '../viewer/SceneManager';
import { logger } from '../logging/Logger';

export interface RunCodeResult {
  success: boolean;
  meshCount?: number;
  error?: Error;
  errorMessage?: string;
  errorStack?: string;
}

export class CodeRunner {
  public static async executeCode(
    tsCode: string,
    sceneManager: SceneManager
  ): Promise<RunCodeResult> {
    logger.addLog('INFO', 'Bắt đầu biên dịch và chạy code dựng hình IFC...');

    // 1. Transpile TypeScript to JavaScript (handling TS types and ES imports/exports)
    let jsCode = '';
    try {
      const transpiled = transform(tsCode, {
        transforms: ['typescript', 'imports'],
      });
      jsCode = transpiled.code;
    } catch (syntaxErr: any) {
      const msg = `Lỗi cú pháp TypeScript: ${syntaxErr.message}`;
      logger.addLog('ERROR', msg, undefined, syntaxErr.stack);
      return {
        success: false,
        error: syntaxErr,
        errorMessage: msg,
        errorStack: syntaxErr.stack,
      };
    }

    // 2. Initialize Engine & Create new IFC4 model
    await ifcEngine.init();
    const api = ifcEngine.getApi();
    let activeModelID = ifcEngine.createModel(WebIFC.Schemas.IFC4);
    const createdModelIDs: number[] = [activeModelID];

    // Hook CreateModel and SaveModel to seamlessly capture user-created models & serialized bytes
    let userSavedBytes: Uint8Array | null = null;
    const originalCreateModel = api.CreateModel.bind(api);
    api.CreateModel = (...args: any[]) => {
      const id = originalCreateModel(...args);
      activeModelID = id;
      createdModelIDs.push(id);
      target.modelID = id;
      target.model = id;
      return id;
    };

    const originalSaveModel = api.SaveModel.bind(api);
    api.SaveModel = (mid: number) => {
      const bytes = originalSaveModel(mid);
      userSavedBytes = bytes;
      return bytes;
    };

    // 3. Prepare execution scope
    // We attach API symbols to window / globalThis so user scripts can access them directly
    // and also freely declare local `const len`, `const modelID`, `const IFCCOLUMN`, etc.
    // without parameter-shadowing syntax errors.
    const target = (typeof window !== 'undefined' ? window : globalThis) as any;
    target.WebIFC = WebIFC;
    target.webifc = WebIFC;
    target.ifcAPI = api;
    target.api = api;
    target.modelID = activeModelID;
    target.model = activeModelID;
    target.THREE = THREE;
    target.three = THREE;
    target.require = (moduleName: string) => {
      if (moduleName === 'web-ifc' || moduleName.includes('web-ifc')) return WebIFC;
      if (moduleName === 'three' || moduleName.includes('three')) return THREE;
      return {};
    };

    // Attach all WebIFC entity codes (IFCWALL, IFCCOLUMN, etc.) to target
    for (const key of Object.keys(WebIFC)) {
      if (!(key in target)) {
        target[key] = (WebIFC as any)[key];
      }
    }

    // Intercept console for logger output in UI
    const customConsole = {
      log: (...args: any[]) => logger.addLog('INFO', args.map(String).join(' ')),
      info: (...args: any[]) => logger.addLog('INFO', args.map(String).join(' ')),
      warn: (...args: any[]) => logger.addLog('WARN', args.map(String).join(' ')),
      error: (...args: any[]) => logger.addLog('ERROR', args.map(String).join(' ')),
    };

    // 4. Run user code in sandboxed async function (enabling top-level await)
    let executionResult: any;
    try {
      // If user code is an IIFE like (() => { ... })() without return, allow capturing its return value
      let codeToExecute = jsCode.trim();
      if (
        (codeToExecute.startsWith('(() =>') || codeToExecute.startsWith('(function')) &&
        (codeToExecute.endsWith(')();') || codeToExecute.endsWith(')()'))
      ) {
        codeToExecute = `return ${codeToExecute}`;
      }

      // Construct AsyncFunction to allow top-level await seamlessly
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const runnerFn = new AsyncFunction('console', `"use strict";\n${codeToExecute}`);
      executionResult = await runnerFn(customConsole);
    } catch (evalErr: any) {
      const msg = `Lỗi thực thi code: ${evalErr.message}`;
      logger.addLog('ERROR', msg, undefined, evalErr.stack);
      // Clean up temporary models
      for (const id of createdModelIDs) {
        try { api.CloseModel(id); } catch {}
      }
      return {
        success: false,
        error: evalErr,
        errorMessage: msg,
        errorStack: evalErr.stack,
      };
    }

    // 5. Save or resolve raw IFC STEP Uint8Array
    let rawIfcData: Uint8Array;
    try {
      if (executionResult instanceof Uint8Array && executionResult.byteLength > 0) {
        rawIfcData = executionResult;
      } else if (userSavedBytes && userSavedBytes.byteLength > 0) {
        rawIfcData = userSavedBytes;
      } else if (
        target.__FACTORY_MEP_IFC_BYTES__ instanceof Uint8Array &&
        target.__FACTORY_MEP_IFC_BYTES__.byteLength > 0
      ) {
        rawIfcData = target.__FACTORY_MEP_IFC_BYTES__;
      } else {
        rawIfcData = originalSaveModel(activeModelID);
      }

      logger.addLog('INFO', `Đã xuất dữ liệu IFC STEP: ${(rawIfcData.byteLength / 1024).toFixed(1)} KB`);

      // Close open generator models to avoid memory leaks before opening viewer model
      for (const id of createdModelIDs) {
        try { api.CloseModel(id); } catch {}
      }
    } catch (saveErr: any) {
      const msg = `Lỗi serialize mô hình IFC: ${saveErr.message}`;
      logger.addLog('ERROR', msg, undefined, saveErr.stack);
      return {
        success: false,
        error: saveErr,
        errorMessage: msg,
        errorStack: saveErr.stack,
      };
    }

    // 6. Open saved IFC model in viewer and stream geometry
    try {
      const newModelID = ifcEngine.openModel(rawIfcData, 'generated_model.ifc');
      const meshCount = sceneManager.renderModel(api, newModelID);

      if (meshCount === 0) {
        const warningMsg = 'Code đã chạy thành công nhưng không có cấu kiện 3D nào được tạo (0 meshes). Hãy kiểm tra xem bạn đã liên kết ShapeRepresentation vào ProductDefinitionShape và gán vào IfcColumn/IfcWall chưa.';
        logger.addLog('WARN', warningMsg);
        return {
          success: true,
          meshCount: 0,
          errorMessage: warningMsg,
        };
      }

      logger.addLog('SUCCESS', `Code chạy thành công! Đã dựng ${meshCount} cấu kiện 3D vào Viewport`);
      return {
        success: true,
        meshCount,
      };
    } catch (renderErr: any) {
      const msg = `Lỗi dựng hình mô hình IFC: ${renderErr.message}`;
      logger.addLog('ERROR', msg, undefined, renderErr.stack);
      return {
        success: false,
        error: renderErr,
        errorMessage: msg,
        errorStack: renderErr.stack,
      };
    }
  }
}
