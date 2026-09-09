import React, { useRef } from 'react';
import {
  Zap,
  FolderOpen,
  Download,
  Play,
  RotateCcw,
  Trash2,
  Scissors,
  Box,
  Code2,
  ListFilter,
  FileText,
  Sliders,
} from 'lucide-react';

interface ToolbarProps {
  onLoadSample: () => void;
  onOpenIfcFile: (file: File) => void;
  onExportIfc: () => void;
  onRunCode: () => void;
  onResetCode: () => void;
  onClearMemory: () => void;
  onTogglePlanar: () => void;
  onToggleSectionBox: () => void;
  onToggleEditor: () => void;
  onToggleProperties: () => void;
  onToggleLogs: () => void;
  onLogLevelChange: (level: number) => void;
  isEditorVisible: boolean;
  isPropertiesVisible: boolean;
  isPlanarActive: boolean;
  isSectionBoxActive: boolean;
  isLogsVisible: boolean;
  errorCount: number;
  isRunningCode: boolean;
  isLoadingFile: boolean;
  logLevel: number;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onLoadSample,
  onOpenIfcFile,
  onExportIfc,
  onRunCode,
  onResetCode,
  onClearMemory,
  onTogglePlanar,
  onToggleSectionBox,
  onToggleEditor,
  onToggleProperties,
  onToggleLogs,
  onLogLevelChange,
  isEditorVisible,
  isPropertiesVisible,
  isPlanarActive,
  isSectionBoxActive,
  isLogsVisible,
  errorCount,
  isRunningCode,
  isLoadingFile,
  logLevel,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpenIfcFile(file);
    }
    // reset input so same file can be reopened if desired
    e.target.value = '';
  };

  return (
    <header
      id="top-toolbar"
      className="h-[52px] bg-[#1e1e2e] border-b border-[#3f3f5a] px-3 flex items-center justify-between select-none overflow-x-auto whitespace-nowrap z-20 gap-2 shrink-0"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ifc"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Left Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2 pr-2 border-r border-[#3f3f5a] mr-1">
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">
            IFC
          </div>
          <span className="font-semibold text-sm tracking-tight text-slate-100 hidden md:inline">
            Web-IFC Studio
          </span>
        </div>

        {/* Sample Model */}
        <button
          id="btn-sample-model"
          onClick={onLoadSample}
          disabled={isLoadingFile || isRunningCode}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#2e2e48] hover:bg-[#3b3b5c] text-amber-300 hover:text-amber-200 border border-[#3f3f5a] text-xs font-medium transition disabled:opacity-50"
          title="Tải mô hình mẫu example.ifc"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>⚡ Sample Model</span>
        </button>

        {/* Open IFC */}
        <button
          id="btn-open-ifc"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoadingFile || isRunningCode}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#2e2e48] hover:bg-[#3b3b5c] text-blue-300 hover:text-blue-200 border border-[#3f3f5a] text-xs font-medium transition disabled:opacity-50"
          title="Mở file .ifc từ máy tính"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>📂 Open IFC</span>
        </button>

        {/* Export IFC */}
        <button
          id="btn-export-ifc"
          onClick={onExportIfc}
          disabled={isLoadingFile || isRunningCode}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#2e2e48] hover:bg-[#3b3b5c] text-emerald-400 hover:text-emerald-300 border border-[#3f3f5a] text-xs font-medium transition disabled:opacity-50"
          title="Xuất mô hình hiện tại thành file .ifc"
        >
          <Download className="w-3.5 h-3.5" />
          <span>💾 Xuất IFC</span>
        </button>

        <div className="h-5 w-[1px] bg-[#3f3f5a] mx-1" />

        {/* Run Code */}
        <button
          id="btn-run-code"
          onClick={onRunCode}
          disabled={isRunningCode || isLoadingFile}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition disabled:opacity-50 active:scale-95"
          title="Biên dịch TypeScript và tạo mô hình IFC 3D"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isRunningCode ? 'Đang chạy...' : '▶ Run Code'}</span>
        </button>

        {/* Reset Code */}
        <button
          id="btn-reset-code"
          onClick={onResetCode}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#2e2e48] hover:bg-[#3b3b5c] text-slate-300 hover:text-white border border-[#3f3f5a] text-xs font-medium transition"
          title="Khôi phục code mẫu mặc định (6x6 columns)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>↺ Reset</span>
        </button>

        {/* Clear Model */}
        <button
          id="btn-clear-model"
          onClick={onClearMemory}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#2e2e48] hover:bg-rose-900/40 text-rose-300 hover:text-rose-200 border border-[#3f3f5a] text-xs font-medium transition"
          title="Đóng mô hình và giải phóng bộ nhớ WASM"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>🗑 Clear</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Planar Clipping */}
        <button
          id="btn-toggle-planar"
          onClick={onTogglePlanar}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition ${
            isPlanarActive
              ? 'bg-blue-600/30 border-blue-500 text-blue-300'
              : 'bg-[#2e2e48] border-[#3f3f5a] text-slate-300 hover:bg-[#3b3b5c]'
          }`}
          title="Mở bảng điều khiển mặt cắt phẳng"
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>✂️ Mặt cắt phẳng</span>
        </button>

        {/* Section Box */}
        <button
          id="btn-toggle-section-box"
          onClick={onToggleSectionBox}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition ${
            isSectionBoxActive
              ? 'bg-blue-600/30 border-blue-500 text-blue-300'
              : 'bg-[#2e2e48] border-[#3f3f5a] text-slate-300 hover:bg-[#3b3b5c]'
          }`}
          title="Mở hộp cắt Section Box kiểu Revit"
        >
          <Box className="w-3.5 h-3.5" />
          <span>📦 Section Box</span>
        </button>

        <div className="h-5 w-[1px] bg-[#3f3f5a] mx-1" />

        {/* Code Editor Toggle */}
        <button
          id="btn-toggle-editor"
          onClick={onToggleEditor}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition ${
            isEditorVisible
              ? 'bg-purple-600/30 border-purple-500 text-purple-300'
              : 'bg-[#2e2e48] border-[#3f3f5a] text-slate-400 hover:text-slate-200 hover:bg-[#3b3b5c]'
          }`}
          title="Ẩn / Hiện Monaco Code Editor"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>📝 Code Editor</span>
        </button>

        {/* Properties Panel Toggle */}
        <button
          id="btn-toggle-properties"
          onClick={onToggleProperties}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition ${
            isPropertiesVisible
              ? 'bg-purple-600/30 border-purple-500 text-purple-300'
              : 'bg-[#2e2e48] border-[#3f3f5a] text-slate-400 hover:text-slate-200 hover:bg-[#3b3b5c]'
          }`}
          title="Ẩn / Hiện bảng thuộc tính BIM Properties"
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>📋 Properties</span>
        </button>

        <div className="h-5 w-[1px] bg-[#3f3f5a] mx-1" />

        {/* Web-IFC Log Level Select */}
        <div className="flex items-center gap-1 bg-[#2e2e48] border border-[#3f3f5a] rounded-md px-2 py-1 text-xs text-slate-300">
          <Sliders className="w-3 h-3 text-slate-400" />
          <span className="text-[11px] text-slate-400">Log:</span>
          <select
            id="select-log-level"
            value={logLevel}
            onChange={(e) => onLogLevelChange(Number(e.target.value))}
            className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
          >
            <option value={0} className="bg-[#1e1e2e]">Off</option>
            <option value={1} className="bg-[#1e1e2e]">Error</option>
            <option value={2} className="bg-[#1e1e2e]">Warn</option>
            <option value={3} className="bg-[#1e1e2e]">Debug</option>
          </select>
        </div>

        {/* Logs Drawer Toggle with Error Badge */}
        <button
          id="btn-toggle-logs"
          onClick={onToggleLogs}
          className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition ${
            isLogsVisible
              ? 'bg-[#3b3b5c] border-slate-400 text-white'
              : 'bg-[#2e2e48] border-[#3f3f5a] text-slate-300 hover:bg-[#3b3b5c]'
          }`}
          title="Mở nhật ký hệ thống & báo cáo lỗi"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>📜 Logs</span>
          {errorCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-rose-600 text-white font-bold text-[10px] rounded-full animate-pulse">
              {errorCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
