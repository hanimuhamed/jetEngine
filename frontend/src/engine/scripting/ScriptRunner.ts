// engine/scripting/ScriptRunner.ts — Sandboxed script execution
import { Entity } from '../core/Entity';
import { InputManager } from '../core/InputManager';
import { ScriptComponent } from '../components/ScriptComponent';
import type { CollisionEvent } from '../systems/PhysicsSystem';
import { emitConsoleEntry } from './scriptConsole';
import { compileScript } from './compileScript';
import type { CompiledScript } from './compileScript';

// Re-export for consumers
export type { ConsoleEntry } from './scriptConsole';
export { addConsoleListener } from './scriptConsole';

export interface TimeInfo {
  deltaTime: number;
  elapsed: number;
  frameCount: number;
}

export interface SceneProxy {
  getEntityByName(name: string): Entity | null;
  getAllEntities(): Entity[];
  spawnPrefab(prefabName: string, x: number, y: number): Entity | null;
  destroyEntity(entity: Entity): void;
}

export class ScriptRunner {
  // Key: `${entity.id}::${script.id}` to support multiple scripts per entity
  private compiledScripts: Map<string, CompiledScript> = new Map();
  private started: Set<string> = new Set();

  // Cached references for dynamic compilation of spawned entities
  private _input: InputManager | null = null;
  private _time: TimeInfo | null = null;
  private _sceneProxy: SceneProxy | null = null;

  /** Script asset sources — name → source code. Set before startAll(). */
  public scriptAssets: Map<string, string> = new Map();

  compile(
    entity: Entity,
    script: ScriptComponent,
    input: InputManager,
    time: TimeInfo,
    sceneProxy: SceneProxy,
  ): CompiledScript | null {
    return compileScript(entity, script, input, time, sceneProxy, this.scriptAssets);
  }

  startAll(
    entities: Entity[],
    input: InputManager,
    time: TimeInfo,
    sceneProxy: SceneProxy
  ): void {
    this.compiledScripts.clear();
    this.started.clear();
    // Store references for later dynamic compilation
    this._input = input;
    this._time = time;
    this._sceneProxy = sceneProxy;

    for (const entity of entities) {
      // Support multiple scripts via getScriptComponents
      const scripts = entity.getComponentsList().filter(c => c.type === 'ScriptComponent') as ScriptComponent[];
      for (const script of scripts) {
        const key = `${entity.id}::${script.id}`;
        const compiled = this.compile(entity, script, input, time, sceneProxy);
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

  /**
   * Compile and start scripts for a single entity (and its children).
   * Used for entities spawned at runtime (e.g., prefab instances).
   */
  compileAndStartEntity(entity: Entity): void {
    if (!this._input || !this._time || !this._sceneProxy) return;
    const queue = [entity];
    while (queue.length > 0) {
      const e = queue.shift()!;
      const scripts = e.getComponentsList().filter(c => c.type === 'ScriptComponent') as ScriptComponent[];
      for (const script of scripts) {
        const key = `${e.id}::${script.id}`;
        if (this.compiledScripts.has(key)) continue; // already compiled
        const compiled = this.compile(e, script, this._input, this._time, this._sceneProxy);
        if (compiled) {
          this.compiledScripts.set(key, compiled);
          try {
            compiled.onStart?.();
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            emitConsoleEntry({ level: 'error', message: `[onStart] "${e.name}": ${msg}`, timestamp: Date.now() });
          }
          this.started.add(key);
        }
      }
      queue.push(...e.children);
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

  /** Dispatch collision events from physics to script onCollision callbacks */
  dispatchCollisions(events: CollisionEvent[]): void {
    for (const event of events) {
      // For entity A, call onCollision with info about B
      this.callCollisionForEntity(event.entityA, event.entityB, event.isTrigger);
      // For entity B, call onCollision with info about A
      this.callCollisionForEntity(event.entityB, event.entityA, event.isTrigger);
    }
  }

  private callCollisionForEntity(self: Entity, other: Entity, isTrigger: boolean): void {
    // Find all compiled scripts for this entity
    for (const [key, compiled] of this.compiledScripts) {
      if (!key.startsWith(self.id + '::')) continue;
      if (!compiled.onCollision) continue;
      try {
        compiled.onCollision({
          id: other.id,
          name: other.name,
          tag: other.tag,
          isTrigger,
          get active() { return other.active; },
          set active(v: boolean) { other.active = v; },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitConsoleEntry({ level: 'error', message: `[onCollision] "${self.name}": ${msg}`, timestamp: Date.now() });
      }
    }
  }

  /** Dispatch onClick to all scripts on entities that were clicked */
  dispatchClicks(clickedEntities: Entity[]): void {
    for (const entity of clickedEntities) {
      for (const [key, compiled] of this.compiledScripts) {
        if (!key.startsWith(entity.id + '::')) continue;
        if (!compiled.onClick) continue;
        try {
          compiled.onClick();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          emitConsoleEntry({ level: 'error', message: `[onClick] "${entity.name}": ${msg}`, timestamp: Date.now() });
        }
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
