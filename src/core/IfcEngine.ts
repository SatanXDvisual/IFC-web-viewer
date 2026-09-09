import * as WebIFC from 'web-ifc';
import { logger } from '../logging/Logger';

export class IfcEngine {
  private api: WebIFC.IfcAPI | null = null;
  private currentModelID: number | null = null;
  private currentRawData: Uint8Array | null = null;
  private currentFileName: string = 'model.ifc';
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.api = new WebIFC.IfcAPI();
  }

  public async init(): Promise<void> {
    if (this.initialized && this.api) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        if (!this.api) {
          this.api = new WebIFC.IfcAPI();
        }
        // Point WASM locator to public root
        this.api.SetWasmPath('/');
        await this.api.Init((path, prefix) => {
          return `${prefix}${path}`;
        });
        this.initialized = true;
        logger.addLog('SUCCESS', 'Web-IFC WebAssembly Engine v0.0.77 initialized successfully');
      } catch (err: any) {
        logger.addLog('ERROR', `Failed to initialize Web-IFC WASM: ${err.message}`, undefined, err.stack);
        throw err;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  public getApi(): WebIFC.IfcAPI {
    if (!this.api || !this.initialized) {
      throw new Error('Web-IFC API is not yet initialized.');
    }
    return this.api;
  }

  public getCurrentModelID(): number | null {
    return this.currentModelID;
  }

  public getCurrentRawData(): Uint8Array | null {
    return this.currentRawData;
  }

  public getCurrentFileName(): string {
    return this.currentFileName;
  }

  public setFileName(name: string) {
    this.currentFileName = name;
  }

  public setLogLevel(level: number) {
    if (this.api) {
      this.api.SetLogLevel(level);
      logger.addLog('INFO', `Web-IFC LogLevel set to: ${level}`);
    }
  }

  public openModel(data: Uint8Array, fileName?: string): number {
    const api = this.getApi();
    this.closeCurrentModel();

    try {
      const modelID = api.OpenModel(data, {
        COORDINATE_TO_ORIGIN: true,
        CIRCLE_SEGMENTS: 16,
      });

      if (modelID < 0) {
        throw new Error(`Web-IFC returned invalid model ID (${modelID})`);
      }

      this.currentModelID = modelID;
      this.currentRawData = data;
      if (fileName) {
        this.currentFileName = fileName;
      }

      logger.addLog('SUCCESS', `Opened IFC Model [ID: ${modelID}] (${(data.byteLength / 1024).toFixed(1)} KB)`);
      return modelID;
    } catch (err: any) {
      logger.addLog('ERROR', `Error opening IFC model: ${err.message}`, undefined, err.stack);
      throw err;
    }
  }

  public createModel(schema: string = WebIFC.Schemas.IFC4): number {
    const api = this.getApi();
    this.closeCurrentModel();

    try {
      const modelID = api.CreateModel({
        schema,
      }, {
        COORDINATE_TO_ORIGIN: true,
        CIRCLE_SEGMENTS: 16,
      });

      this.currentModelID = modelID;
      logger.addLog('INFO', `Created new IFC Model [ID: ${modelID}] with schema ${schema}`);
      return modelID;
    } catch (err: any) {
      logger.addLog('ERROR', `Error creating IFC model: ${err.message}`, undefined, err.stack);
      throw err;
    }
  }

  public saveModel(modelID?: number): Uint8Array {
    const api = this.getApi();
    const id = modelID !== undefined ? modelID : this.currentModelID;
    if (id === null || id === undefined) {
      if (this.currentRawData) return this.currentRawData;
      throw new Error('No active IFC model to save');
    }

    try {
      const data = api.SaveModel(id);
      this.currentRawData = data;
      return data;
    } catch (err: any) {
      logger.addLog('WARN', `SaveModel(${id}) failed, falling back to cached raw data if present: ${err.message}`);
      if (this.currentRawData) return this.currentRawData;
      throw err;
    }
  }

  public closeCurrentModel() {
    if (this.currentModelID !== null && this.api) {
      try {
        if (this.api.IsModelOpen(this.currentModelID)) {
          this.api.CloseModel(this.currentModelID);
          logger.addLog('INFO', `Closed IFC Model [ID: ${this.currentModelID}]`);
        }
      } catch (err: any) {
        logger.addLog('WARN', `Error closing model: ${err.message}`);
      }
      this.currentModelID = null;
    }
  }

  public async resetMemory(): Promise<void> {
    logger.addLog('INFO', 'Clearing Web-IFC memory and re-initializing WASM engine...');
    this.closeCurrentModel();
    this.currentRawData = null;
    this.currentFileName = 'model.ifc';

    if (this.api) {
      try {
        this.api.Dispose();
      } catch (e) {
        // ignore dispose warning
      }
      this.api = null;
      this.initialized = false;
    }

    await this.init();
    logger.addLog('SUCCESS', 'Web-IFC memory cleared & engine re-initialized');
  }
}

export const ifcEngine = new IfcEngine();
