// engine/scripting/ScriptRunner.ts — Sandboxed script execution
import { Entity } from '../core/Entity';
import { InputManager } from '../core/InputManager';
import { Transform2D } from '../components/Transform2D';
import { ScriptComponent } from '../components/ScriptComponent';

export interface TimeInfo {
  deltaTime: number;
  elapsed: number;
  frameCount: number;
}

export interface SceneProxy {
  getEntityByName(name: string): Entity | null;
  getAllEntities(): Entity[];
}

interface CompiledScript {
  onStart?: () => void;
  onUpdate?: (deltaTime: number) => void;
  onDestroy?: () => void;
}

// Console log entry
export interface ConsoleEntry {
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
}

// Global console log store — listeners can subscribe
type ConsoleListener = (entry: ConsoleEntry) => void;
const consoleListeners: ConsoleListener[] = [];

export function addConsoleListener(listener: ConsoleListener): () => void {
  consoleListeners.push(listener);
  return () => {
    const idx = consoleListeners.indexOf(listener);
    if (idx !== -1) consoleListeners.splice(idx, 1);
  };
}

function emitConsoleEntry(entry: ConsoleEntry): void {
  for (const listener of consoleListeners) {
    listener(entry);
  }
}

function createSandboxConsole(): typeof console {
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
      // Also forward to real console
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

export class ScriptRunner {
  // Key: `${entity.id}::${script.id}` to support multiple scripts per entity
  private compiledScripts: Map<string, CompiledScript> = new Map();
  private started: Set<string> = new Set();

  compileScript(
    entity: Entity,
    script: ScriptComponent,
    input: InputManager,
    time: TimeInfo,
    sceneProxy: SceneProxy
  ): CompiledScript | null {
    try {
      const transform = entity.getComponent<Transform2D>('Transform2D');

      // Check if this is a camera entity (camera is allowed negative positions)
      const isCamera = entity.hasComponent('Camera2DComponent');

      // Build the transform proxy that reads/writes to the actual component
      const transformProxy = transform
        ? {
            get x() { return transform.position.x; },
            set x(v: number) { transform.position.x = isCamera ? v : Math.max(0, v); },
            get y() { return transform.position.y; },
            set y(v: number) { transform.position.y = isCamera ? v : Math.max(0, v); },
            get rotation() { return transform.rotation; },
            set rotation(v: number) { transform.rotation = v; },
            get scaleX() { return transform.scale.x; },
            set scaleX(v: number) { transform.scale.x = v; },
            get scaleY() { return transform.scale.y; },
            set scaleY(v: number) { transform.scale.y = v; },
          }
        : { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };

      const entityProxy = {
        id: entity.id,
        name: entity.name,
        getComponent: (type: string) => entity.getComponent(type),
        addComponent: () => { /* not allowed at runtime */ },
        destroy: () => entity.destroy(),
      };

      const inputProxy = {
        isKeyDown: (key: string) => input.isKeyDown(key),
        isKeyPressed: (key: string) => input.isKeyPressed(key),
        isMouseButtonDown: (button: number) => input.isMouseButtonDown(button),
        getMousePosition: () => input.getMousePosition(),
      };

      const timeProxy = {
        get deltaTime() { return time.deltaTime; },
        get elapsed() { return time.elapsed; },
        get frameCount() { return time.frameCount; },
      };

      const sceneProxyObj = {
        getEntityByName: (name: string) => sceneProxy.getEntityByName(name),
        getAllEntities: () => sceneProxy.getAllEntities(),
      };

      const sandboxConsole = createSandboxConsole();

      // Use Function constructor for sandboxing (not eval)
      // Wrap script in an IIFE that captures function declarations properly
      const fn = new Function(
        'entity',
        'transform',
        'input',
        'time',
        'scene',
        'console',
        `
        var __onStart, __onUpdate, __onDestroy;
        (function() {
          ${script.scriptSource}

          if (typeof onStart === 'function') __onStart = onStart;
          if (typeof onUpdate === 'function') __onUpdate = onUpdate;
          if (typeof onDestroy === 'function') __onDestroy = onDestroy;
        })();
        return { onStart: __onStart, onUpdate: __onUpdate, onDestroy: __onDestroy };
        `
      );

      const result = fn(
        entityProxy,
        transformProxy,
        inputProxy,
        timeProxy,
        sceneProxyObj,
        sandboxConsole
      );

      return result as CompiledScript;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      emitConsoleEntry({ level: 'error', message: `[Compile] "${script.scriptName}" on "${entity.name}": ${msg}`, timestamp: Date.now() });
      return null;
    }
  }

  startAll(
    entities: Entity[],
    input: InputManager,
    time: TimeInfo,
    sceneProxy: SceneProxy
  ): void {
    this.compiledScripts.clear();
    this.started.clear();

    for (const entity of entities) {
      // Support multiple scripts via getScriptComponents
      const scripts = entity.getComponentsList().filter(c => c.type === 'ScriptComponent') as ScriptComponent[];
      for (const script of scripts) {
        const key = `${entity.id}::${script.id}`;
        const compiled = this.compileScript(entity, script, input, time, sceneProxy);
        if (compiled) {
          this.compiledScripts.set(key, compiled);
          try {
            compiled.onStart?.();
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            emitConsoleEntry({ level: 'error', message: `[onStart] "${entity.name}": ${msg}`, timestamp: Date.now() });
          }
          this.started.add(key);
        }
      }
    }
  }

  updateAll(deltaTime: number): void {
    for (const [key, compiled] of this.compiledScripts) {
      if (!this.started.has(key)) continue;
      try {
        compiled.onUpdate?.(deltaTime);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitConsoleEntry({ level: 'error', message: `[onUpdate] ${key}: ${msg}`, timestamp: Date.now() });
      }
    }
  }

  destroyAll(): void {
    for (const [, compiled] of this.compiledScripts) {
      try {
        compiled.onDestroy?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitConsoleEntry({ level: 'error', message: `[onDestroy]: ${msg}`, timestamp: Date.now() });
      }
    }
    this.compiledScripts.clear();
    this.started.clear();
  }
}
