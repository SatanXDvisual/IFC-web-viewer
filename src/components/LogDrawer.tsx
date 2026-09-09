import React, { useState, useEffect, useRef } from 'react';
import { LogEntry, LogType } from '../types';
import { logger } from '../logging/Logger';
import { generateAIErrorReport } from '../logging/AIErrorReport';
import {
  FileText,
  Copy,
  Trash2,
  X,
  Search,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface LogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  modelStatus: string;
  onToast: (type: 'info' | 'success' | 'warning' | 'error', text: string) => void;
}

export const LogDrawer: React.FC<LogDrawerProps> = ({
  isOpen,
  onClose,
  modelStatus,
  onToast,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>(logger.getLogs());
  const [filterType, setFilterType] = useState<LogType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = logger.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (isOpen) {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length, isOpen]);

  if (!isOpen) return null;

  const handleCopyForAI = () => {
    const report = generateAIErrorReport(modelStatus);
    navigator.clipboard.writeText(report);
    onToast('success', 'Đã copy Báo Cáo Lỗi AI (Markdown) vào Clipboard!');
  };

  const handleClearLogs = () => {
    logger.clear();
    onToast('info', 'Đã xóa nhật ký');
  };

  const toggleExpand = (id: string) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (filterType !== 'ALL' && log.type !== filterType) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const text = `${log.message} ${log.details || ''} ${log.stack || ''}`.toLowerCase();
      return text.includes(q);
    }
    return true;
  });

  const errorCount = logs.filter((l) => l.type === 'ERROR').length;
  const warnCount = logs.filter((l) => l.type === 'WARN').length;

  return (
    <section
      id="system-log-drawer"
      className="h-[260px] w-full bg-[#181825] border-t border-[#3f3f5a] flex flex-col z-20 shrink-0 select-none shadow-2xl transition-all"
    >
      {/* Drawer Header */}
      <div className="h-10 px-3 bg-[#1e1e2e] border-b border-[#3f3f5a] flex items-center justify-between text-xs text-slate-300 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-200">System & Web-IFC Logs</span>
          <div className="flex items-center gap-1.5 ml-2">
            {errorCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600/30 text-rose-300 font-bold border border-rose-500/40 text-[10px]">
                {errorCount} Errors
              </span>
            )}
            {warnCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-600/30 text-amber-300 font-bold border border-amber-500/40 text-[10px]">
                {warnCount} Warns
              </span>
            )}
            <span className="text-[11px] text-slate-400 font-normal">
              ({logs.length} entries)
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Copy for AI Button */}
          <button
            id="btn-copy-for-ai"
            onClick={handleCopyForAI}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow transition active:scale-95"
            title="Tạo báo cáo lỗi Markdown chuyên dụng để gửi AI sửa code"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>📋 Copy for AI</span>
          </button>

          {/* Filter Dropdown */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-[#252538] border border-[#3f3f5a] text-slate-200 rounded px-2 py-1 text-xs outline-none cursor-pointer"
          >
            <option value="ALL">Tất cả Logs</option>
            <option value="ERROR">Chỉ Lỗi (ERROR)</option>
            <option value="WARN">Cảnh báo (WARN)</option>
            <option value="INFO">Thông tin (INFO)</option>
            <option value="SUCCESS">Thành công (SUCCESS)</option>
          </select>

          {/* Search Box */}
          <div className="relative w-36">
            <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Lọc text..."
              className="w-full pl-6 pr-2 py-0.5 rounded bg-[#252538] border border-[#3f3f5a] text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Clear Logs */}
          <button
            onClick={handleClearLogs}
            className="p-1 rounded hover:bg-[#3f3f5a] text-slate-400 hover:text-slate-200 transition"
            title="Xóa danh sách logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#3f3f5a] text-slate-400 hover:text-slate-200 transition"
            title="Đóng bảng logs"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Logs Scrollable Stream */}
      <div className="flex-1 overflow-y-auto font-mono text-[11px] p-2 space-y-1 bg-[#14141f]">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 font-sans text-xs">
            Chưa có thông điệp nhật ký nào phù hợp.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const hasDetails = Boolean(log.details || log.stack);
            const isExpanded = expandedLogs[log.id];

            let icon = <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
            let badgeColor = 'text-blue-400 bg-blue-950/40 border-blue-800';
            let rowBg = 'hover:bg-[#1e1e2e]';

            if (log.type === 'ERROR') {
              icon = <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
              badgeColor = 'text-rose-400 bg-rose-950/50 border-rose-800';
              rowBg = 'bg-rose-950/20 hover:bg-rose-950/30 border-l-2 border-rose-500';
            } else if (log.type === 'WARN') {
              icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
              badgeColor = 'text-amber-400 bg-amber-950/40 border-amber-800';
              rowBg = 'hover:bg-[#1e1e2e]';
            } else if (log.type === 'SUCCESS') {
              icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
              badgeColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-800';
              rowBg = 'hover:bg-[#1e1e2e]';
            }

            return (
              <div
                key={log.id}
                className={`rounded px-2 py-1 transition border border-transparent ${rowBg}`}
              >
                <div
                  className="flex items-start gap-2 cursor-pointer"
                  onClick={() => hasDetails && toggleExpand(log.id)}
                >
                  <span className="text-slate-500 shrink-0">{log.timestamp}</span>
                  <span className={`px-1.5 py-0.2 rounded border text-[10px] font-bold shrink-0 ${badgeColor}`}>
                    {log.type}
                  </span>
                  <div className="flex-1 text-slate-200 break-words leading-relaxed">
                    {log.message}
                  </div>
                  {hasDetails && (
                    <span className="text-slate-400 text-xs shrink-0 pl-1">
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3 inline" />
                      ) : (
                        <ChevronRight className="w-3 h-3 inline" />
                      )}
                    </span>
                  )}
                </div>

                {/* Expanded Stack or Details */}
                {hasDetails && isExpanded && (
                  <div className="mt-1.5 pl-6 pt-1.5 border-t border-[#3f3f5a]/40 text-slate-400 space-y-1">
                    {log.details && (
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-sans">Chi tiết:</span>
                        <pre className="text-slate-300 whitespace-pre-wrap">{log.details}</pre>
                      </div>
                    )}
                    {log.stack && (
                      <div>
                        <span className="text-rose-400 block text-[10px] uppercase font-sans">Stack Trace:</span>
                        <pre className="text-rose-300/80 whitespace-pre-wrap text-[10px] leading-tight font-mono">
                          {log.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>
    </section>
  );
};
