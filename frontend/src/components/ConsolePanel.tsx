// components/ConsolePanel.tsx — In-engine console log viewer
import { useRef, useEffect, useCallback } from 'react';
import { useEngineStore } from '../store/engineStore';

const LEVEL_COLORS: Record<string, string> = {
  log: '#e0e0e0',
  info: '#4a9eff',
  warn: '#ffcc4a',
  error: '#ff4a4a',
};

const LEVEL_ICONS: Record<string, string> = {
  log: '●',
  info: 'ℹ',
  warn: '⚠',
  error: '✕',
};

function ConsolePanel() {
  const consoleLogs = useEngineStore(s => s.consoleLogs);
  const clearConsoleLogs = useEngineStore(s => s.clearConsoleLogs);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  const formatTime = useCallback((timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  }, []);

  return (
    <div className="console-panel">
      <div className="console-header">
        <span className="console-count">{consoleLogs.length} entries</span>
        <button className="toolbar-btn" onClick={clearConsoleLogs} title="Clear Console">
          🗑 Clear
        </button>
      </div>
      <div className="console-logs" ref={scrollRef}>
        {consoleLogs.length === 0 ? (
          <div className="console-empty">No console output yet. Scripts will log here when playing.</div>
        ) : (
          consoleLogs.map((entry, i) => (
            <div
              key={i}
              className={`console-entry console-entry-${entry.level}`}
            >
              <span
                className="console-level-icon"
                style={{ color: LEVEL_COLORS[entry.level] }}
              >
                {LEVEL_ICONS[entry.level]}
              </span>
              <span className="console-timestamp">{formatTime(entry.timestamp)}</span>
              <span className="console-message" style={{ color: LEVEL_COLORS[entry.level] }}>
                {entry.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ConsolePanel;
