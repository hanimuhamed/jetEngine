// engine/scripting/scriptConsole.ts — Console capture for sandboxed scripts

export interface ConsoleEntry {
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
}

type ConsoleListener = (entry: ConsoleEntry) => void;
const consoleListeners: ConsoleListener[] = [];

export function addConsoleListener(listener: ConsoleListener): () => void {
  consoleListeners.push(listener);
  return () => {
    const idx = consoleListeners.indexOf(listener);
    if (idx !== -1) consoleListeners.splice(idx, 1);
  };
}

export function emitConsoleEntry(entry: ConsoleEntry): void {
  for (const listener of consoleListeners) {
    listener(entry);
  }
}

export function createSandboxConsole(): typeof console {
  const makeLogger = (level: ConsoleEntry['level']) => {
    return (...args: unknown[]) => {
      const message = args.map(a => {
        if (typeof a === 'object') {
          try { return JSON.stringify(a); }
          catch { return String(a); }
        }
        return String(a);
      }).join(' ');
      emitConsoleEntry({ level, message, timestamp: Date.now() });
      const realMethod = level === 'log' ? console.log : level === 'warn' ? console.warn : level === 'error' ? console.error : console.info;
      realMethod(`[Script] ${message}`);
    };
  };

  return {
    ...console,
    log: makeLogger('log'),
    warn: makeLogger('warn'),
    error: makeLogger('error'),
    info: makeLogger('info'),
  };
}
