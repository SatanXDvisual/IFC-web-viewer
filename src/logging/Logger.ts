import { LogEntry, LogType } from '../types';

type LogListener = (logs: LogEntry[], errorCount: number) => void;

class SystemLogger {
  private logs: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs = 500;
  private originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };
  private isIntercepted = false;

  constructor() {
    this.initGlobalCapture();
  }

  public initGlobalCapture() {
    if (this.isIntercepted || typeof window === 'undefined') return;
    this.isIntercepted = true;

    // Intercept console.log
    console.log = (...args: any[]) => {
      this.originalConsole.log(...args);
      this.addLog('INFO', this.formatArgs(args));
    };

    // Intercept console.info
    console.info = (...args: any[]) => {
      this.originalConsole.info(...args);
      this.addLog('INFO', this.formatArgs(args));
    };

    // Intercept console.warn
    console.warn = (...args: any[]) => {
      this.originalConsole.warn(...args);
      this.addLog('WARN', this.formatArgs(args));
    };

    // Intercept console.error
    console.error = (...args: any[]) => {
      this.originalConsole.error(...args);
      const { message, stack } = this.extractErrorDetails(args);
      this.addLog('ERROR', message, undefined, stack);
    };

    // Global onerror
    window.onerror = (message, source, lineno, colno, error) => {
      this.addLog(
        'ERROR',
        `Runtime Error: ${String(message)} (${source}:${lineno}:${colno})`,
        undefined,
        error?.stack
      );
      return false;
    };

    // Global unhandled promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
          ? reason
          : JSON.stringify(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;
      this.addLog('ERROR', `Unhandled Promise Rejection: ${message}`, undefined, stack);
    });
  }

  private formatArgs(args: any[]): string {
    return args
      .map((arg) => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(' ');
  }

  private extractErrorDetails(args: any[]): { message: string; stack?: string } {
    let message = '';
    let stack: string | undefined;

    for (const arg of args) {
      if (arg instanceof Error) {
        message += (message ? ' ' : '') + `${arg.name}: ${arg.message}`;
        if (!stack && arg.stack) stack = arg.stack;
      } else if (typeof arg === 'string') {
        message += (message ? ' ' : '') + arg;
      } else {
        try {
          message += (message ? ' ' : '') + JSON.stringify(arg);
        } catch {
          message += (message ? ' ' : '') + String(arg);
        }
      }
    }

    return { message, stack };
  }

  private getFormattedTimestamp(): string {
    const d = new Date();
    const pad = (n: number, z = 2) => String(n).padStart(z, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(
      d.getMilliseconds(),
      3
    )}`;
  }

  public addLog(type: LogType, message: string, details?: string, stack?: string) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: this.getFormattedTimestamp(),
      type,
      message,
      details,
      stack,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.notify();
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public getErrorCount(): number {
    return this.logs.filter((l) => l.type === 'ERROR').length;
  }

  public getWarningCount(): number {
    return this.logs.filter((l) => l.type === 'WARN').length;
  }

  public clearLogs() {
    this.logs = [];
    this.notify();
  }

  public clear() {
    this.clearLogs();
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    listener(this.getLogs(), this.getErrorCount());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentLogs = this.getLogs();
    const errorCount = this.getErrorCount();
    this.listeners.forEach((listener) => listener(currentLogs, errorCount));
  }
}

export const logger = new SystemLogger();
