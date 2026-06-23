import { useEffect, useRef, useState } from 'react';
import logger from '../utils/logger.ts';
import type { LogLevel, LogEntry } from '../utils/logger.ts';

export type { LogLevel, LogEntry };

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

interface Props {
  version?: string;
}

type LevelFilter = Record<LogLevel, boolean>;
const DEFAULT_FILTER: LevelFilter = { debug: false, info: true, warn: true, error: true };

export default function LogPanel({ version }: Props) {
  const entriesRef = useRef(logger.entries);
  const [, setTick] = useState(0);
  const [filter, setFilter] = useState<LevelFilter>(DEFAULT_FILTER);
  const [open, setOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    entriesRef.current = logger.entries;
    return logger.subscribe(() => {
      entriesRef.current = logger.entries;
      setTick(t => t + 1);
    });
  }, []);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entriesRef.current.length, open]);

  const filtered = entriesRef.current.filter(e => filter[e.level]);
  const visible = filtered.length > MAX_RENDERED ? filtered.slice(-MAX_RENDERED) : filtered;
  const hiddenCount = filtered.length - visible.length;

  const hasWarnings = entriesRef.current.some(e => e.level === 'warn' || e.level === 'error');

  const toggleLevel = (level: LogLevel) =>
    setFilter(f => ({ ...f, [level]: !f[level] }));

  return (
    <div className="ufc-log-bar">
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
        <div className="h-40 overflow-y-auto px-4 pb-3 font-mono" style={{ borderTop: '1px solid rgba(200,163,72,0.12)' }}>
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
