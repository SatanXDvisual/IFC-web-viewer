/**
 * Web-IFC 3D BIM Viewer & IFC Code Playground
 * Built with Three.js, web-ifc (WASM), Monaco Editor & Tailwind CSS
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Toolbar } from './components/Toolbar';
import { CodeEditorPanel } from './components/CodeEditorPanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { PlanarSectionPanel } from './components/PlanarSectionPanel';
import { SectionBoxPanel } from './components/SectionBoxPanel';
import { LogDrawer } from './components/LogDrawer';
import { ToastContainer, ToastMessage } from './components/Toast';
import { SceneManager } from './viewer/SceneManager';
import { ifcEngine } from './core/IfcEngine';
import { PropertyInspector } from './properties/PropertyInspector';
import { CodeRunner } from './editor/CodeRunner';
import { DEFAULT_IFC_CODE } from './core/defaultExample';
import { ElementPropertiesData, PlanarSectionState, SectionBoxState } from './types';
import { logger } from './logging/Logger';
import { Maximize2, RotateCcw, Box, UploadCloud, Info } from 'lucide-react';

export default function App() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);

  // Application States
  const [code, setCode] = useState<string>(() => {
    const saved = localStorage.getItem('code');
    if (!saved || !saved.includes('IFCPROJECT') || !saved.includes('PARAMETRIC BIM GENERATOR V2.0')) {
      return DEFAULT_IFC_CODE;
    }
    return saved;
  });
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isEditorVisible, setIsEditorVisible] = useState<boolean>(true);
  const [isPropertiesVisible, setIsPropertiesVisible] = useState<boolean>(true);
  const [isPlanarActive, setIsPlanarActive] = useState<boolean>(false);
  const [isSectionBoxActive, setIsSectionBoxActive] = useState<boolean>(false);
  const [isLogsVisible, setIsLogsVisible] = useState<boolean>(false);
  const [logLevel, setLogLevel] = useState<number>(1); // Default Error level

  // Model & Selection States
  const [selectedProperties, setSelectedProperties] = useState<ElementPropertiesData | null>(null);
  const [isLoadingProperties, setIsLoadingProperties] = useState<boolean>(false);
  const [meshCount, setMeshCount] = useState<number>(0);
  const [currentFileName, setCurrentFileName] = useState<string>('No model loaded');
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
  const [isRunningCode, setIsRunningCode] = useState<boolean>(false);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  // Clipping States
  const [planarState, setPlanarState] = useState<PlanarSectionState>({
    enabled: false,
    visible: true,
    normal: [0, -1, 0],
    offset: 0,
    picking: false,
  });

  const [sectionBoxState, setSectionBoxState] = useState<SectionBoxState>({
    enabled: false,
    visible: true,
    minX: -10,
    maxX: 10,
    minY: -10,
    maxY: 10,
    minZ: -10,
    maxZ: 10,
    activeGrip: null,
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'info' | 'success' | 'warning' | 'error', text: string) => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Update error count badge
  useEffect(() => {
    const unsub = logger.subscribe((logs) => {
      const errs = logs.filter((l) => l.type === 'ERROR').length;
      setErrorCount(errs);
    });
    return unsub;
  }, []);

  // Initialize SceneManager
  useEffect(() => {
    if (!viewportRef.current) return;

    const sm = new SceneManager(
      viewportRef.current,
      (expressID, modelID) => {
        handleElementSelected(expressID, modelID);
      },
      addToast
    );
    sceneManagerRef.current = sm;

    // ResizeObserver
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        sm.onResize(width, height);
      }
    });
    ro.observe(viewportRef.current);

    // Initial load: Sample Model
    loadSampleModel();

    return () => {
      ro.disconnect();
      sm.dispose();
    };
  }, []);

  // Handle Element Selection & Inspection
  const handleElementSelected = async (expressID: number | null, modelID: number | null) => {
    if (expressID === null || modelID === null) {
      setSelectedProperties(null);
      return;
    }

    setIsPropertiesVisible(true);
    setIsLoadingProperties(true);

    try {
      const api = ifcEngine.getApi();
      const props = await PropertyInspector.inspectElement(api, modelID, expressID);
      setSelectedProperties(props);
    } catch (err: any) {
      addToast('error', `Failed to inspect element #${expressID}: ${err.message}`);
    } finally {
      setIsLoadingProperties(false);
    }
  };

  // Sync Clipping States from Managers
  const syncClippingStates = () => {
    if (sceneManagerRef.current) {
      setPlanarState(sceneManagerRef.current.getPlanarManager().getState());
      setSectionBoxState(sceneManagerRef.current.getSectionBoxManager().getState());
    }
  };

  // Load IFC Buffer into Viewport
  const loadIfcBuffer = async (data: Uint8Array, fileName: string) => {
    if (!sceneManagerRef.current) return;
    setIsLoadingFile(true);

    try {
      await ifcEngine.init();
      const modelID = ifcEngine.openModel(data, fileName);
      const api = ifcEngine.getApi();
      const count = sceneManagerRef.current.renderModel(api, modelID);

      setMeshCount(count);
      setCurrentFileName(fileName);
      setSelectedProperties(null);
      syncClippingStates();

      addToast('success', `Đã tải mô hình ${fileName} (${count} cấu kiện 3D)`);
    } catch (err: any) {
      addToast('error', `Lỗi tải file IFC: ${err.message}`);
      setIsLogsVisible(true);
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Load Sample Model
  const loadSampleModel = async () => {
    try {
      setIsLoadingFile(true);
      logger.addLog('INFO', 'Đang tải mô hình mẫu example.ifc từ server...');
      const response = await fetch('/example.ifc');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} when fetching example.ifc`);
      }
      const buffer = await response.arrayBuffer();
      await loadIfcBuffer(new Uint8Array(buffer), 'example.ifc');
    } catch (err: any) {
      logger.addLog('ERROR', `Không thể tải example.ifc: ${err.message}`);
      addToast('error', `Lỗi tải mô hình mẫu: ${err.message}`);
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Open User Local File
  const handleOpenIfcFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.ifc')) {
      addToast('warning', 'Vui lòng chọn file có định dạng chuẩn .ifc');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      await loadIfcBuffer(new Uint8Array(buffer), file.name);
    } catch (err: any) {
      addToast('error', `Lỗi đọc file: ${err.message}`);
    }
  };

  // Export Current IFC Model
  const handleExportIfc = () => {
    try {
      const rawData = ifcEngine.saveModel();
      const blob = new Blob([rawData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const exportName = currentFileName.endsWith('.ifc') ? currentFileName : 'model.ifc';
      a.download = exportName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', `Đã tải xuống file ${exportName} (${(rawData.byteLength / 1024).toFixed(1)} KB)`);
    } catch (err: any) {
      addToast('error', `Không có mô hình active để xuất: ${err.message}`);
    }
  };

  // Run Code
  const handleRunCode = async () => {
    if (!sceneManagerRef.current || isRunningCode) return;
    setIsRunningCode(true);
    setEditorError(null);

    try {
      const result = await CodeRunner.executeCode(code, sceneManagerRef.current);
      if (result.success && result.meshCount !== undefined) {
        if (result.meshCount > 0) {
          setMeshCount(result.meshCount);
          setCurrentFileName('generated_model.ifc');
          setSelectedProperties(null);
          syncClippingStates();
          addToast('success', `Code chạy thành công! Đã tạo ${result.meshCount} cấu kiện 3D`);
        } else {
          const warningMsg = result.errorMessage || 'Code chạy được nhưng không có cấu kiện 3D nào được tạo (0 meshes). Hãy kiểm tra lại liên kết IfcProductDefinitionShape.';
          setEditorError(warningMsg);
          addToast('warning', warningMsg);
        }
      } else {
        const errorMsg = result.errorMessage || 'Lỗi thực thi code dựng hình';
        setEditorError(errorMsg);
        addToast('error', errorMsg);
        setIsLogsVisible(true);
      }
    } catch (err: any) {
      const errorMsg = `Lỗi thực thi: ${err.message}`;
      setEditorError(errorMsg);
      addToast('error', errorMsg);
      setIsLogsVisible(true);
    } finally {
      setIsRunningCode(false);
    }
  };

  // Reset Code
  const handleResetCode = () => {
    setCode(DEFAULT_IFC_CODE);
    localStorage.setItem('code', DEFAULT_IFC_CODE);
    setEditorError(null);
    addToast('info', 'Đã khôi phục code mẫu nhà xưởng MEP thực tế (LOD 400)');
  };

  // Clear Model & Memory
  const handleClearMemory = async () => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.clearModel();
    }
    await ifcEngine.resetMemory();
    setMeshCount(0);
    setCurrentFileName('No model loaded');
    setSelectedProperties(null);
    syncClippingStates();
    addToast('info', 'Đã xóa mô hình và giải phóng bộ nhớ WASM');
  };

  // Fit Section Box to Selected Element (BX)
  const handleFitSectionBoxSelected = () => {
    if (!sceneManagerRef.current) return;
    const success = sceneManagerRef.current.fitSectionBoxToSelected();
    if (success) {
      setIsSectionBoxActive(true);
      syncClippingStates();
      addToast('success', 'Đã căn hộp cắt Section Box bao quanh cấu kiện được chọn (BX)');
    } else {
      addToast('warning', 'Vui lòng chọn một cấu kiện 3D trước khi bấm cắt (BX)');
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to Run Code
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      }

      // Esc to clear selection
      if (e.key === 'Escape') {
        if (sceneManagerRef.current) {
          sceneManagerRef.current.clearSelection();
          sceneManagerRef.current.getPlanarManager().setPickingMode(false);
          sceneManagerRef.current.getSectionBoxManager().setActiveGrip(null);
          syncClippingStates();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, isRunningCode]);

  // Drag & Drop File Handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleOpenIfcFile(file);
    }
  };

  return (
    <div
      id="app-root"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative w-screen h-screen flex flex-col bg-[#14141f] text-slate-100 overflow-hidden font-sans"
    >
      {/* Top Toolbar */}
      <Toolbar
        onLoadSample={loadSampleModel}
        onOpenIfcFile={handleOpenIfcFile}
        onExportIfc={handleExportIfc}
        onRunCode={handleRunCode}
        onResetCode={handleResetCode}
        onClearMemory={handleClearMemory}
        onTogglePlanar={() => {
          setIsPlanarActive((v) => !v);
          if (!isPlanarActive && sceneManagerRef.current) {
            sceneManagerRef.current.getPlanarManager().enable();
            syncClippingStates();
          }
        }}
        onToggleSectionBox={() => {
          setIsSectionBoxActive((v) => !v);
          if (!isSectionBoxActive && sceneManagerRef.current) {
            sceneManagerRef.current.getSectionBoxManager().enable();
            syncClippingStates();
          }
        }}
        onToggleEditor={() => setIsEditorVisible((v) => !v)}
        onToggleProperties={() => setIsPropertiesVisible((v) => !v)}
        onToggleLogs={() => setIsLogsVisible((v) => !v)}
        onLogLevelChange={(lvl) => {
          setLogLevel(lvl);
          ifcEngine.setLogLevel(lvl);
        }}
        isEditorVisible={isEditorVisible}
        isPropertiesVisible={isPropertiesVisible}
        isPlanarActive={isPlanarActive}
        isSectionBoxActive={isSectionBoxActive}
        isLogsVisible={isLogsVisible}
        errorCount={errorCount}
        isRunningCode={isRunningCode}
        isLoadingFile={isLoadingFile}
        logLevel={logLevel}
      />

      {/* Main Workspace (Editor + Viewport + Properties) */}
      <main className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Left: Code Editor Panel */}
        {isEditorVisible && (
          <CodeEditorPanel
            code={code}
            onChangeCode={(newCode) => {
              setCode(newCode);
              if (editorError) setEditorError(null);
            }}
            onRunCode={handleRunCode}
            onResetCode={handleResetCode}
            isRunning={isRunningCode}
            error={editorError}
            onClearError={() => setEditorError(null)}
          />
        )}

        {/* Center: 3D Viewport */}
        <section
          id="viewport-container"
          className="flex-1 h-full relative overflow-hidden bg-[#8cc7de]"
        >
          {/* Three.js Canvas Container */}
          <div ref={viewportRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Floating Planar Section Panel */}
          {isPlanarActive && sceneManagerRef.current && (
            <PlanarSectionPanel
              planarManager={sceneManagerRef.current.getPlanarManager()}
              state={planarState}
              onStateChange={syncClippingStates}
              onClose={() => setIsPlanarActive(false)}
              onToast={addToast}
            />
          )}

          {/* Floating Section Box Panel */}
          {isSectionBoxActive && sceneManagerRef.current && (
            <SectionBoxPanel
              sectionBoxManager={sceneManagerRef.current.getSectionBoxManager()}
              state={sectionBoxState}
              modelBounds={sceneManagerRef.current.getModelBounds()}
              onFitSelected={handleFitSectionBoxSelected}
              onStateChange={syncClippingStates}
              onClose={() => setIsSectionBoxActive(false)}
              onToast={addToast}
            />
          )}

          {/* Viewport Top-Right Info Badge */}
          <div className="absolute top-3 right-3 flex items-center gap-2 pointer-events-none z-10">
            <div className="bg-[#1e1e2e]/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#3f3f5a] shadow-lg text-xs flex items-center gap-2">
              <Box className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold text-slate-200">{currentFileName}</span>
              <span className="text-slate-400 font-mono text-[11px]">
                ({meshCount} elements)
              </span>
            </div>
          </div>

          {/* Viewport Bottom-Right Camera Navigation Buttons */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-10">
            <button
              id="btn-fit-camera"
              onClick={() => sceneManagerRef.current?.fitCamera()}
              className="p-2 bg-[#1e1e2e]/90 hover:bg-[#2e2e48] border border-[#3f3f5a] rounded-lg shadow-lg text-slate-300 hover:text-white transition"
              title="Căn chỉnh toàn bộ mô hình vào khung nhìn (Fit View)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              id="btn-home-camera"
              onClick={() => sceneManagerRef.current?.updateModelBoundsAndCamera()}
              className="p-2 bg-[#1e1e2e]/90 hover:bg-[#2e2e48] border border-[#3f3f5a] rounded-lg shadow-lg text-slate-300 hover:text-white transition"
              title="Đặt lại góc nhìn mặc định"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Empty / Drag-and-drop Overlay */}
          {isDraggingFile && (
            <div className="absolute inset-0 bg-blue-900/60 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none z-40 border-4 border-dashed border-blue-400">
              <UploadCloud className="w-16 h-16 text-blue-200 mb-3 animate-bounce" />
              <h3 className="text-lg font-bold text-white mb-1">Thả file IFC vào đây</h3>
              <p className="text-xs text-blue-200">Hỗ trợ định dạng IFC2X3, IFC4, IFC4X3</p>
            </div>
          )}

          {/* Loading Overlay */}
          {isLoadingFile && (
            <div className="absolute inset-0 bg-[#1e1e2e]/75 backdrop-blur-xs flex flex-col items-center justify-center z-30">
              <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-200">Đang phân tích & dựng hình IFC...</p>
              <p className="text-xs text-slate-400 mt-1">WebAssembly (web-ifc 0.0.77)</p>
            </div>
          )}
        </section>

        {/* Right: Properties Panel */}
        {isPropertiesVisible && (
          <PropertiesPanel
            properties={selectedProperties}
            isLoading={isLoadingProperties}
            onClose={() => setIsPropertiesVisible(false)}
            onToast={addToast}
          />
        )}
      </main>

      {/* Bottom: Log Drawer */}
      <LogDrawer
        isOpen={isLogsVisible}
        onClose={() => setIsLogsVisible(false)}
        modelStatus={meshCount > 0 ? `Model Active (${currentFileName}, ${meshCount} items)` : 'No Model Loaded'}
        onToast={addToast}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
