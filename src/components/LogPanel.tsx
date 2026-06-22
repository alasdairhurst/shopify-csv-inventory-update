import { useEffect, useRef, useState } from 'react';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogEntry { level: LogLevel; message: string; timestamp: Date }

const MAX_RENDERED = 500;

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: 'text-gray-500',
  info: 'text-gray-200',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: 'DBG',
  info: 'INF',
  warn: 'WRN',
  error: 'ERR',
};

const SAMPLE_ENTRIES: LogEntry[] = [
  { level: 'info', message: 'Loaded 342 products from Blitz', timestamp: new Date() },
  { level: 'info', message: 'Matched 298 SKUs against Shopify inventory', timestamp: new Date() },
  { level: 'warn', message: '[WARN] Blitz csv missing expected header: VariantImageURL', timestamp: new Date() },
  { level: 'info', message: 'Updated 42 inventory rows', timestamp: new Date() },
  { level: 'debug', message: '[SKIP] load not applicable to Cartas Inventory', timestamp: new Date() },
  { level: 'info', message: '[DONE] Downloading inventory CSV', timestamp: new Date() },
];

interface Props {
  entries?: LogEntry[];
  version?: string;
}

type LevelFilter = Record<LogLevel, boolean>;
const DEFAULT_FILTER: LevelFilter = { debug: false, info: true, warn: true, error: true };

export default function LogPanel({ entries = SAMPLE_ENTRIES, version }: Props) {
  const [filter, setFilter] = useState<LevelFilter>(DEFAULT_FILTER);
  const [open, setOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entries.length, open]);

  const filtered = entries.filter(e => filter[e.level]);
  const visible = filtered.length > MAX_RENDERED ? filtered.slice(-MAX_RENDERED) : filtered;
  const hiddenCount = filtered.length - visible.length;

  const hasWarnings = entries.some(e => e.level === 'warn' || e.level === 'error');

  const toggleLevel = (level: LogLevel) =>
    setFilter(f => ({ ...f, [level]: !f[level] }));

  return (
    <div className="border-t border-[#3a3f4b] bg-[#1a1d23] sticky bottom-0">
      {/* Always-visible bar */}
      <div className="flex items-center gap-3 px-4 py-2">
        {/* Log label + level filters */}
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">Logs</span>
        {hasWarnings && !open && (
          <span className="text-xs text-yellow-400 font-medium">⚠</span>
        )}
        <div className="flex gap-1">
          {(Object.keys(DEFAULT_FILTER) as LogLevel[]).map(level => (
            <button
              key={level}
              onClick={() => toggleLevel(level)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${filter[level] ? LEVEL_COLORS[level] : 'text-gray-700'}`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Version text lives here, beside the toggle */}
        {version && (
          <span className="text-xs text-gray-600">{version}</span>
        )}

        <button
          onClick={() => setOpen(o => !o)}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors ml-2"
        >
          {open ? '↓ hide' : '↑ logs'}
        </button>
      </div>

      {/* Expandable log area */}
      {open && (
        <div className="h-40 overflow-y-auto px-4 pb-3 border-t border-[#3a3f4b] font-mono">
          {hiddenCount > 0 && (
            <div className="text-xs text-gray-600 py-1">{hiddenCount} earlier entries not shown</div>
          )}
          {visible.length === 0 && (
            <div className="text-xs text-gray-600 py-2">No log entries.</div>
          )}
          {visible.map((entry, i) => {
            const t = entry.timestamp;
            const ts = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}:${t.getSeconds().toString().padStart(2, '0')}`;
            return (
              <div key={i} className={`text-xs leading-5 ${LEVEL_COLORS[entry.level]}`}>
                <span className="text-gray-600 mr-2">[{ts}]</span>
                <span className="opacity-60 mr-2">{LEVEL_LABELS[entry.level]}</span>
                <span>{entry.message}</span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
