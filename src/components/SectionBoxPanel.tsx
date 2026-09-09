import React from 'react';
import { SectionBoxManager } from '../clipping/SectionBoxManager';
import { SectionBoxState, ModelBounds } from '../types';
import {
  Box,
  Target,
  RotateCcw,
  Eye,
  EyeOff,
  Trash2,
  X,
  Move,
} from 'lucide-react';

interface SectionBoxPanelProps {
  sectionBoxManager: SectionBoxManager | null;
  state: SectionBoxState;
  modelBounds: ModelBounds | null;
  onFitSelected: () => void;
  onStateChange: () => void;
  onClose: () => void;
  onToast: (type: 'info' | 'success' | 'warning' | 'error', text: string) => void;
}

export const SectionBoxPanel: React.FC<SectionBoxPanelProps> = ({
  sectionBoxManager,
  state,
  modelBounds,
  onFitSelected,
  onStateChange,
  onClose,
  onToast,
}) => {
  if (!sectionBoxManager) return null;

  const handleFitSelected = () => {
    onFitSelected();
  };

  const handleResetModel = () => {
    sectionBoxManager.enable();
    sectionBoxManager.resetToModel();
    onStateChange();
    onToast('info', 'Đã reset Section Box về kích thước toàn bộ mô hình');
  };

  const handleGripClick = (gripId: string) => {
    const nextGrip = state.activeGrip === gripId ? null : gripId;
    sectionBoxManager.setActiveGrip(nextGrip);
    onStateChange();
    if (nextGrip) {
      onToast('info', `Đã chọn tay nắm ${nextGrip} (kéo gizmo 3D trong viewport)`);
    }
  };

  const handleSliderChange = (key: 'minX' | 'maxX' | 'minY' | 'maxY' | 'minZ' | 'maxZ', val: number) => {
    const newState = { ...state, [key]: val };
    // Maintain min <= max
    if (key === 'minX' && val >= state.maxX) newState.maxX = val + 0.5;
    if (key === 'maxX' && val <= state.minX) newState.minX = val - 0.5;
    if (key === 'minY' && val >= state.maxY) newState.maxY = val + 0.5;
    if (key === 'maxY' && val <= state.minY) newState.minY = val - 0.5;
    if (key === 'minZ' && val >= state.maxZ) newState.maxZ = val + 0.5;
    if (key === 'maxZ' && val <= state.minZ) newState.minZ = val - 0.5;

    sectionBoxManager.setBounds(
      newState.minX,
      newState.maxX,
      newState.minY,
      newState.maxY,
      newState.minZ,
      newState.maxZ
    );
    onStateChange();
  };

  const handleToggleVisible = () => {
    sectionBoxManager.setVisible(!state.visible);
    onStateChange();
  };

  const handleDisable = () => {
    sectionBoxManager.disable();
    onStateChange();
    onToast('info', 'Đã tắt hộp cắt Section Box');
  };

  // Determine dynamic range for sliders based on model bounding box (+30%)
  const bounds = modelBounds || {
    min: { x: -20, y: -20, z: -20 },
    max: { x: 20, y: 20, z: 20 },
    maxDimension: 30,
  };
  const pad = bounds.maxDimension * 0.4;
  const minRangeX = Math.floor(bounds.min.x - pad);
  const maxRangeX = Math.ceil(bounds.max.x + pad);
  const minRangeY = Math.floor(bounds.min.y - pad);
  const maxRangeY = Math.ceil(bounds.max.y + pad);
  const minRangeZ = Math.floor(bounds.min.z - pad);
  const maxRangeZ = Math.ceil(bounds.max.z + pad);
  const step = Math.max(Number((bounds.maxDimension / 150).toFixed(2)), 0.1);

  return (
    <div
      id="section-box-panel"
      className="absolute top-4 left-4 w-84 bg-[#1e1e2e]/95 backdrop-blur-md border border-[#3f3f5a] rounded-xl shadow-2xl p-4 text-xs select-none z-30 space-y-3.5"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#3f3f5a]">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-blue-400" />
          <h3 className="font-semibold text-sm text-slate-100">Section Box (Revit)</h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-[#3f3f5a] transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          id="btn-section-box-bx"
          onClick={handleFitSelected}
          className="py-2 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-1.5 transition shadow"
          title="Bao quanh đối tượng đang chọn (BX)"
        >
          <Target className="w-3.5 h-3.5" />
          <span>🎯 Cắt theo chọn (BX)</span>
        </button>

        <button
          id="btn-section-box-reset"
          onClick={handleResetModel}
          className="py-2 px-2.5 rounded-lg bg-[#252538] hover:bg-[#32324e] border border-[#3f3f5a] text-slate-200 font-medium flex items-center justify-center gap-1.5 transition"
          title="Reset hộp cắt về toàn bộ mô hình"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>↺ Reset toàn bộ</span>
        </button>
      </div>

      {/* Grip Selector */}
      <div>
        <label className="text-[11px] font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider">
          Chọn tay nắm 3D (Grips)
        </label>
        <div className="grid grid-cols-7 gap-1">
          {['-X', '+X', '-Y', '+Y', '-Z', '+Z', 'ALL'].map((grip) => (
            <button
              key={grip}
              onClick={() => handleGripClick(grip)}
              className={`py-1.5 rounded text-[11px] font-mono font-bold transition border ${
                state.activeGrip === grip
                  ? 'bg-amber-500 text-slate-900 border-amber-400'
                  : 'bg-[#252538] hover:bg-[#32324e] text-slate-300 border-[#3f3f5a]'
              }`}
            >
              {grip === 'ALL' ? '✥ Hộp' : grip}
            </button>
          ))}
        </div>
      </div>

      {/* 6 Dimension Sliders */}
      <div className="space-y-2 pt-1 border-t border-[#3f3f5a]/60">
        {/* X Axis */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-300">
            <span className="font-semibold text-rose-400">Trục X</span>
            <span className="font-mono text-slate-400">
              {state.minX.toFixed(1)}m → {state.maxX.toFixed(1)}m
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="range"
              min={minRangeX}
              max={maxRangeX}
              step={step}
              value={state.minX}
              onChange={(e) => handleSliderChange('minX', parseFloat(e.target.value))}
              className="accent-rose-500 cursor-pointer w-full"
              title="Min X"
            />
            <input
              type="range"
              min={minRangeX}
              max={maxRangeX}
              step={step}
              value={state.maxX}
              onChange={(e) => handleSliderChange('maxX', parseFloat(e.target.value))}
              className="accent-rose-500 cursor-pointer w-full"
              title="Max X"
            />
          </div>
        </div>

        {/* Y Axis */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-300">
            <span className="font-semibold text-emerald-400">Trục Y</span>
            <span className="font-mono text-slate-400">
              {state.minY.toFixed(1)}m → {state.maxY.toFixed(1)}m
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="range"
              min={minRangeY}
              max={maxRangeY}
              step={step}
              value={state.minY}
              onChange={(e) => handleSliderChange('minY', parseFloat(e.target.value))}
              className="accent-emerald-500 cursor-pointer w-full"
              title="Min Y"
            />
            <input
              type="range"
              min={minRangeY}
              max={maxRangeY}
              step={step}
              value={state.maxY}
              onChange={(e) => handleSliderChange('maxY', parseFloat(e.target.value))}
              className="accent-emerald-500 cursor-pointer w-full"
              title="Max Y"
            />
          </div>
        </div>

        {/* Z Axis */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-300">
            <span className="font-semibold text-blue-400">Trục Z</span>
            <span className="font-mono text-slate-400">
              {state.minZ.toFixed(1)}m → {state.maxZ.toFixed(1)}m
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="range"
              min={minRangeZ}
              max={maxRangeZ}
              step={step}
              value={state.minZ}
              onChange={(e) => handleSliderChange('minZ', parseFloat(e.target.value))}
              className="accent-blue-500 cursor-pointer w-full"
              title="Min Z"
            />
            <input
              type="range"
              min={minRangeZ}
              max={maxRangeZ}
              step={step}
              value={state.maxZ}
              onChange={(e) => handleSliderChange('maxZ', parseFloat(e.target.value))}
              className="accent-blue-500 cursor-pointer w-full"
              title="Max Z"
            />
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#3f3f5a]">
        <button
          onClick={handleToggleVisible}
          className="py-1.5 px-2 bg-[#252538] hover:bg-[#32324e] border border-[#3f3f5a] rounded-md text-slate-300 hover:text-white flex items-center justify-center gap-1 transition"
        >
          {state.visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{state.visible ? 'Ẩn khung' : 'Hiện khung'}</span>
        </button>

        <button
          onClick={handleDisable}
          className="py-1.5 px-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 flex items-center justify-center gap-1 rounded-md transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Tắt Section Box</span>
        </button>
      </div>
    </div>
  );
};
