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
    const modelID = ifcEngine.createModel(WebIFC.Schemas.IFC4);

    // 3. Prepare execution scope
    // We attach API symbols to window / globalThis so user scripts can access them directly
    // and also freely declare local `const len`, `const modelID`, `const IFCCOLUMN`, etc.
    // without parameter-shadowing syntax errors.
    const target = (typeof window !== 'undefined' ? window : globalThis) as any;
    target.WebIFC = WebIFC;
    target.webifc = WebIFC;
    target.ifcAPI = api;
    target.api = api;
    target.modelID = modelID;
    target.model = modelID;
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
    try {
      // Construct AsyncFunction to allow top-level await seamlessly
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const runnerFn = new AsyncFunction('console', `"use strict";\n${jsCode}`);
      await runnerFn(customConsole);
    } catch (evalErr: any) {
      const msg = `Lỗi thực thi code: ${evalErr.message}`;
      logger.addLog('ERROR', msg, undefined, evalErr.stack);
      // Clean up temporary model
      ifcEngine.closeCurrentModel();
      return {
        success: false,
        error: evalErr,
        errorMessage: msg,
        errorStack: evalErr.stack,
      };
    }

    // 5. Save Model to Uint8Array
    let rawIfcData: Uint8Array;
    try {
      rawIfcData = api.SaveModel(modelID);
      logger.addLog('INFO', `Đã xuất dữ liệu IFC STEP: ${(rawIfcData.byteLength / 1024).toFixed(1)} KB`);
      ifcEngine.closeCurrentModel();
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
