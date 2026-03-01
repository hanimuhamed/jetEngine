// engine/scripting/ScriptRunner.ts — Sandboxed script execution
import { Entity } from '../core/Entity';
import { InputManager } from '../core/InputManager';
import { Vec2 } from '../core/Math2D';
import { Transform2D } from '../components/Transform2D';
import { RigidBody2D } from '../components/RigidBody2D';
import { Collider2D } from '../components/Collider2D';
import { SpriteRenderer } from '../components/SpriteRenderer';
import { Camera2DComponent } from '../components/Camera2DComponent';
import { ScriptComponent } from '../components/ScriptComponent';
import type { CollisionEvent } from '../systems/PhysicsSystem';

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

interface CompiledScript {
  onStart?: () => void;
  onUpdate?: (deltaTime: number) => void;
  onDestroy?: () => void;
  onCollision?: (other: unknown) => void;
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

  // Cached references for dynamic compilation of spawned entities
  private _input: InputManager | null = null;
  private _time: TimeInfo | null = null;
  private _sceneProxy: SceneProxy | null = null;

  compileScript(
    entity: Entity,
    script: ScriptComponent,
    input: InputManager,
    time: TimeInfo,
    sceneProxy: SceneProxy
  ): CompiledScript | null {
    try {
      const transform = entity.getComponent<Transform2D>('Transform2D');

      const sandboxConsole = createSandboxConsole();

      // ── Component proxy builders ────────────────────────
      // Valid component type names for getComponent()
      const VALID_COMPONENT_TYPES = [
        'Transform2D', 'RigidBody2D', 'Collider2D',
        'SpriteRenderer', 'Camera2DComponent', 'ScriptComponent',
      ];

      function makeTransformProxy(t: Transform2D) {
        return {
          position: {
            get x() { return t.position.x; },
            set x(v: number) { t.position.x = v; },
            get y() { return t.position.y; },
            set y(v: number) { t.position.y = v; },
          },
          get rotation() { return t.rotation; },
          set rotation(v: number) { t.rotation = v; },
          scale: {
            get x() { return t.scale.x; },
            set x(v: number) { t.scale.x = v; },
            get y() { return t.scale.y; },
            set y(v: number) { t.scale.y = v; },
          },
          translate(dx: number, dy: number) { t.translate(dx, dy); },
        };
      }

      function makeRigidBodyProxy(rb: RigidBody2D) {
        return {
          velocity: {
            get x() { return rb.velocity.x; },
            set x(v: number) { rb.velocity.x = v; },
            get y() { return rb.velocity.y; },
            set y(v: number) { rb.velocity.y = v; },
          },
          acceleration: {
            get x() { return rb.acceleration.x; },
            set x(v: number) { rb.acceleration.x = v; },
            get y() { return rb.acceleration.y; },
            set y(v: number) { rb.acceleration.y = v; },
          },
          get mass() { return rb.mass; },
          set mass(v: number) { rb.mass = v; },
          get gravityScale() { return rb.gravityScale; },
          set gravityScale(v: number) { rb.gravityScale = v; },
          get isKinematic() { return rb.isKinematic; },
          set isKinematic(v: boolean) { rb.isKinematic = v; },
          get drag() { return rb.drag; },
          set drag(v: number) { rb.drag = v; },
          get bounciness() { return rb.bounciness; },
          set bounciness(v: number) { rb.bounciness = v; },
          applyForce(x: number, y: number) { rb.applyForce(new Vec2(x, y)); },
          setVelocity(x: number, y: number) { rb.velocity = new Vec2(x, y); },
        };
      }

      function makeColliderProxy(c: Collider2D) {
        return {
          get width() { return c.width; },
          set width(v: number) { c.width = v; },
          get height() { return c.height; },
          set height(v: number) { c.height = v; },
          offset: {
            get x() { return c.offset.x; },
            set x(v: number) { c.offset.x = v; },
            get y() { return c.offset.y; },
            set y(v: number) { c.offset.y = v; },
          },
          get isTrigger() { return c.isTrigger; },
          set isTrigger(v: boolean) { c.isTrigger = v; },
        };
      }

      function makeSpriteRendererProxy(sr: SpriteRenderer) {
        return {
          get color() { return sr.color; },
          set color(v: string) { sr.color = v; },
          get shapeType() { return sr.shapeType; },
          set shapeType(v: string) { sr.shapeType = v as SpriteRenderer['shapeType']; },
          get width() { return sr.width; },
          set width(v: number) { sr.width = v; },
          get height() { return sr.height; },
          set height(v: number) { sr.height = v; },
          get visible() { return sr.visible; },
          set visible(v: boolean) { sr.visible = v; },
          get layer() { return sr.layer; },
          set layer(v: number) { sr.layer = v; },
        };
      }

      function makeCameraProxy(cam: Camera2DComponent) {
        return {
          get backgroundColor() { return cam.backgroundColor; },
          set backgroundColor(v: string) { cam.backgroundColor = v; },
          get zoom() { return cam.zoom; },
          set zoom(v: number) { cam.zoom = v; },
        };
      }

      function makeComponentProxy(comp: unknown, type: string): unknown {
        if (type === 'Transform2D') return makeTransformProxy(comp as Transform2D);
        if (type === 'RigidBody2D') return makeRigidBodyProxy(comp as RigidBody2D);
        if (type === 'Collider2D') return makeColliderProxy(comp as Collider2D);
        if (type === 'SpriteRenderer') return makeSpriteRendererProxy(comp as SpriteRenderer);
        if (type === 'Camera2DComponent') return makeCameraProxy(comp as Camera2DComponent);
        return null;
      }

      // ── Build the transform proxy (backward compat + new API) ──
      const transformProxy = transform ? makeTransformProxy(transform) : {
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        translate() {},
      };

      const entityProxy = {
        id: entity.id,
        name: entity.name,
        get tag() { return entity.tag; },
        set tag(v: string) { entity.tag = v; },
        getComponent: (type: string) => {
          if (!VALID_COMPONENT_TYPES.includes(type)) {
            sandboxConsole.error(`[getComponent] Unknown component type: "${type}". Valid types: ${VALID_COMPONENT_TYPES.join(', ')}`);
            return null;
          }
          const comp = entity.getComponent(type);
          if (!comp) {
            sandboxConsole.error(`[getComponent] Entity "${entity.name}" does not have component "${type}".`);
            return null;
          }
          return makeComponentProxy(comp, type);
        },
        destroy: () => sceneProxy.destroyEntity(entity),
        applyForce: (x: number, y: number) => {
          const rb = entity.getComponent<RigidBody2D>('RigidBody2D');
          if (rb) rb.applyForce(new Vec2(x, y));
          else sandboxConsole.error(`[applyForce] Entity "${entity.name}" does not have RigidBody2D.`);
        },
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
        spawn: (prefabName: string, x: number, y: number) => {
          const spawned = sceneProxy.spawnPrefab(prefabName, x, y);
          return spawned ? { id: spawned.id, name: spawned.name, tag: spawned.tag } : null;
        },
        destroy: (target: { id?: string; name?: string }) => {
          let e: Entity | null = null;
          if (target.id) {
            e = sceneProxy.getAllEntities().find(ent => ent.id === target.id) ?? null;
          } else if (target.name) {
            e = sceneProxy.getEntityByName(target.name);
          }
          if (e) sceneProxy.destroyEntity(e);
        },
      };

      const assetsProxy = {
        spawn: (prefabName: string, x: number, y: number) => {
          const spawned = sceneProxy.spawnPrefab(prefabName, x, y);
          return spawned ? { id: spawned.id, name: spawned.name, tag: spawned.tag } : null;
        },
      };

      // Use Function constructor for sandboxing (not eval)
      // Wrap script in an IIFE that captures function declarations properly
      const fn = new Function(
        'entity',
        'transform',
        'input',
        'time',
        'scene',
        'assets',
        'console',
        `
        var __onStart, __onUpdate, __onDestroy, __onCollision;
        (function() {
          ${script.scriptSource}

          if (typeof onStart === 'function') __onStart = onStart;
          if (typeof onUpdate === 'function') __onUpdate = onUpdate;
          if (typeof onDestroy === 'function') __onDestroy = onDestroy;
          if (typeof onCollision === 'function') __onCollision = onCollision;
        })();
        return { onStart: __onStart, onUpdate: __onUpdate, onDestroy: __onDestroy, onCollision: __onCollision };
        `
      );

      const result = fn(
        entityProxy,
        transformProxy,
        inputProxy,
        timeProxy,
        sceneProxyObj,
        assetsProxy,
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
    // Store references for later dynamic compilation
    this._input = input;
    this._time = time;
    this._sceneProxy = sceneProxy;

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
        const compiled = this.compileScript(e, script, this._input, this._time, this._sceneProxy);
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
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitConsoleEntry({ level: 'error', message: `[onCollision] "${self.name}": ${msg}`, timestamp: Date.now() });
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
