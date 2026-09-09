import React from 'react';
import { PlanarSectionManager } from '../clipping/PlanarSectionManager';
import { PlanarSectionState } from '../types';
import {
  Scissors,
  Crosshair,
  RotateCw,
  Eye,
  EyeOff,
  Trash2,
  Hand,
  X,
} from 'lucide-react';

interface PlanarSectionPanelProps {
  planarManager: PlanarSectionManager | null;
  state: PlanarSectionState;
  onStateChange: () => void;
  onClose: () => void;
  onToast: (type: 'info' | 'success' | 'warning' | 'error', text: string) => void;
}

export const PlanarSectionPanel: React.FC<PlanarSectionPanelProps> = ({
  planarManager,
  state,
  onStateChange,
  onClose,
  onToast,
}) => {
  if (!planarManager) return null;

  const handlePickSurface = () => {
    planarManager.setPickingMode(true);
    onStateChange();
    onToast('info', 'Click vào một bề mặt trên mô hình 3D để đặt mặt cắt...');
  };

  const handlePreset = (preset: 'top' | 'front' | 'side') => {
    planarManager.setPreset(preset);
    onStateChange();
    onToast('info', `Đã đặt mặt cắt: ${preset.toUpperCase()}`);
  };

  const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    planarManager.setOffset(val);
    onStateChange();
  };

  const handleFlip = () => {
    planarManager.flip();
    onStateChange();
    onToast('info', 'Đã đảo chiều mặt cắt phẳng (180°)');
  };

  const handleToggleVisible = () => {
    planarManager.setVisible(!state.visible);
    onStateChange();
  };

  const handleDisable = () => {
    planarManager.disable();
    onStateChange();
    onToast('info', 'Đã tắt mặt cắt phẳng');
  };

  return (
    <div
      id="planar-section-panel"
      className="absolute top-4 left-4 w-80 bg-[#1e1e2e]/95 backdrop-blur-md border border-[#3f3f5a] rounded-xl shadow-2xl p-4 text-xs select-none z-30 space-y-3.5"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#3f3f5a]">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-blue-400" />
          <h3 className="font-semibold text-sm text-slate-100">Mặt cắt phẳng (Planar)</h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-[#3f3f5a] transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Pick Surface */}
      <button
        id="btn-pick-surface"
        onClick={handlePickSurface}
        className={`w-full py-2 px-3 rounded-lg border font-medium flex items-center justify-center gap-2 transition ${
          state.picking
            ? 'bg-amber-600/30 border-amber-500 text-amber-300 animate-pulse'
            : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow'
        }`}
      >
        <Crosshair className="w-4 h-4" />
        <span>{state.picking ? 'Đang chờ click mặt mô hình...' : '🎯 Click trên mô hình để đặt mặt cắt'}</span>
      </button>

      {/* Presets */}
      <div>
        <label className="text-[11px] font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider">
          Mặt cắt tiêu chuẩn
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => handlePreset('top')}
            className="py-1.5 px-2 bg-[#252538] hover:bg-[#32324e] border border-[#3f3f5a] rounded-md text-slate-200 transition font-medium"
          >
            Mặt bằng (Top)
          </button>
          <button
            onClick={() => handlePreset('front')}
            className="py-1.5 px-2 bg-[#252538] hover:bg-[#32324e] border border-[#3f3f5a] rounded-md text-slate-200 transition font-medium"
          >
            Đứng trước
          </button>
          <button
            onClick={() => handlePreset('side')}
            className="py-1.5 px-2 bg-[#252538] hover:bg-[#32324e] border border-[#3f3f5a] rounded-md text-slate-200 transition font-medium"
          >
            Đứng bên
          </button>
        </div>
      </div>

      {/* Offset Slider */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Khoảng cách tịnh tiến (Offset)
          </label>
          <span className="font-mono font-bold text-blue-300">
            {state.offset >= 0 ? `+${state.offset.toFixed(2)}` : state.offset.toFixed(2)} m
          </span>
        </div>
        <input
          type="range"
          min="-30"
          max="30"
          step="0.2"
          value={state.offset}
          onChange={handleOffsetChange}
          className="w-full accent-blue-500 cursor-pointer"
        />
      </div>

      {/* Tools Row */}
      <div className="grid grid-cols-3 gap-1.5 pt-1">
        {/* Flip */}
        <button
          onClick={handleFlip}
          className="py-1.5 px-2 bg-[#252538] hover:bg-[#32324e] border border-[#3f3f5a] rounded-md text-slate-300 hover:text-white flex items-center justify-center gap-1 transition"
          title="Đảo chiều mặt cắt 180°"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Đảo chiều</span>
        </button>

        {/* Hide / Show Helper */}
        <button
          onClick={handleToggleVisible}
          className="py-1.5 px-2 bg-[#252538] hover:bg-[#32324e] border border-[#3f3f5a] rounded-md text-slate-300 hover:text-white flex items-center justify-center gap-1 transition"
          title="Ẩn / Hiện khung đồ họa mặt cắt"
        >
          {state.visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{state.visible ? 'Ẩn khung' : 'Hiện khung'}</span>
        </button>

        {/* Disable */}
        <button
          onClick={handleDisable}
          className="py-1.5 px-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 flex items-center justify-center gap-1 rounded-md transition"
          title="Tắt mặt cắt phẳng"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Tắt</span>
        </button>
      </div>

      <div className="text-[11px] text-slate-500 pt-1 border-t border-[#3f3f5a]/60">
        💡 Kéo thả trực tiếp gizmo 3D trong khung nhìn để dịch chuyển mặt cắt.
      </div>
    </div>
  );
};
