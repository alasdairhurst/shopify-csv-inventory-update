export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogEntry { level: LogLevel; message: string; timestamp: Date }

const logger = {
  entries: [] as LogEntry[],
  _timer: null as ReturnType<typeof setTimeout> | null,
  subscribers: new Set<() => void>(),

  subscribe(fn: () => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  },

  clear() {
    this.entries = [];
    this._notify();
  },

  _push(level: LogLevel, args: unknown[]) {
    this.entries.push({ level, message: args.map(String).join(' '), timestamp: new Date() });
    this._schedule();
  },

  _schedule() {
    if (this._timer !== null) return;
    this._timer = setTimeout(() => { this._timer = null; this._notify(); }, 100);
  },

  _notify() {
    this.subscribers.forEach(fn => fn());
  },

  debug(...args: unknown[]) { console.debug(...args); this._push('debug', args); },
  log(...args: unknown[])   { console.log(...args);   this._push('info', args); },
  warn(...args: unknown[])  { console.warn(...args);  this._push('warn', args); },
  error(...args: unknown[]) { console.error(...args); this._push('error', args); },
};

export default logger;
