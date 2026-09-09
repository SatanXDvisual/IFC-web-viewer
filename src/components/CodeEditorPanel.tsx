import React, { useEffect, useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { DEFAULT_IFC_CODE } from '../core/defaultExample';
import { Play, RotateCcw, FileCode, Check, AlertTriangle, X, Sparkles } from 'lucide-react';

interface CodeEditorPanelProps {
  code: string;
  onChangeCode: (newCode: string) => void;
  onRunCode: () => void;
  onResetCode: () => void;
  isRunning: boolean;
  error?: string | null;
  onClearError?: () => void;
}

export const CodeEditorPanel: React.FC<CodeEditorPanelProps> = ({
  code,
  onChangeCode,
  onRunCode,
  onResetCode,
  isRunning,
  error,
  onClearError,
}) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<any>(null);
  const [savedStatus, setSavedStatus] = useState(false);

  const handleEditorChange = (value: string | undefined) => {
    const val = value || '';
    onChangeCode(val);

    // Debounce save to LocalStorage (1 sec)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem('code', val);
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 1500);
    }, 1000);
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure Monaco TypeScript compiler options
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTextFiles: false,
      allowJs: true,
      noEmit: true,
    });

    // Provide global types declaration for Monaco intellisense
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      `
      declare const WebIFC: any;
      declare const webifc: any;
      declare const ifcAPI: any;
      declare const api: any;
      declare const modelID: number;
      declare const model: number;
      declare const THREE: any;
      declare function len(val: number): any;
      declare function posLen(val: number): any;
      declare function label(str: string): any;
      declare function text(str: string): any;
      declare function id(str: string): any;
      declare function guid(): string;
      declare const IFCCOLUMN: number;
      declare const IFCWALL: number;
      declare const IFCSLAB: number;
      declare const IFCPROJECT: number;
      declare const IFCCARTESIANPOINT: number;
      declare const IFCDIRECTION: number;
      declare const IFCAXIS2PLACEMENT3D: number;
      declare const IFCAXIS2PLACEMENT2D: number;
      declare const IFCSIUNIT: number;
      declare const IFCUNITASSIGNMENT: number;
      declare const IFCGEOMETRICREPRESENTATIONCONTEXT: number;
      declare const IFCCIRCLEPROFILEDEF: number;
      declare const IFCRECTANGLEPROFILEDEF: number;
      declare const IFCEXTRUDEDAREASOLID: number;
      declare const IFCSHAPEREPRESENTATION: number;
      declare const IFCPRODUCTDEFINITIONSHAPE: number;
      declare const IFCLOCALPLACEMENT: number;
      `,
      'ts:filename/ifcGlobals.d.ts'
    );
  };

  return (
    <section
      id="code-editor-panel"
      className="w-[35%] min-w-[320px] max-w-[50%] h-full bg-[#1e1e2e] border-r border-[#3f3f5a] flex flex-col z-10 shrink-0 select-none overflow-hidden"
    >
      {/* Editor Header */}
      <div className="h-9 px-3 bg-[#252538] border-b border-[#3f3f5a] flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold text-slate-200">IFC Generator.ts</span>
          {savedStatus && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-normal">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="btn-editor-run"
            onClick={onRunCode}
            disabled={isRunning}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition disabled:opacity-50 shadow-sm active:scale-95"
            title="Biên dịch và chạy dựng hình 3D (Ctrl+Enter)"
          >
            <Play className={`w-3 h-3 fill-current ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Đang chạy...' : 'Run Code'}</span>
          </button>
          <button
            id="btn-editor-reset"
            onClick={onResetCode}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#3f3f5a] text-slate-300 hover:text-white transition text-[11px]"
            title="Khôi phục code mẫu chuẩn (6x6 Columns)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Error Banner when code execution fails */}
      {error && (
        <div className="bg-rose-950/90 border-b border-rose-800 p-2.5 text-xs text-rose-200 flex items-start justify-between gap-2 animate-in slide-in-from-top-1">
          <div className="flex items-start gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 overflow-hidden">
              <p className="font-medium text-rose-100 break-words leading-tight">{error}</p>
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  onClick={onResetCode}
                  className="px-2 py-0.5 rounded bg-rose-900/80 hover:bg-rose-800 text-rose-200 text-[10px] font-semibold border border-rose-700 transition"
                >
                  ↺ Khôi phục code mẫu chuẩn
                </button>
              </div>
            </div>
          </div>
          {onClearError && (
            <button
              onClick={onClearError}
              className="text-rose-400 hover:text-rose-100 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Monaco Container */}
      <div className="flex-1 w-full h-full min-h-0 bg-[#1e1e2e]">
        <Editor
          height="100%"
          defaultLanguage="typescript"
          theme="vs-dark"
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            automaticLayout: true,
            fontSize: 13,
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            fontFamily: "'JetBrains Mono', monospace",
            bracketPairColorization: { enabled: true },
            padding: { top: 8, bottom: 8 },
          }}
        />
      </div>

      {/* Editor Footer */}
      <div className="h-6 px-3 bg-[#252538] border-t border-[#3f3f5a] flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>TypeScript • Web-IFC 0.0.77</span>
        </span>
        <span className="text-[10px] text-slate-500">Phím tắt: Ctrl + Enter</span>
      </div>
    </section>
  );
};

