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

export class ScriptRunner {
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

      // Build the transform proxy that reads/writes to the actual component
      const transformProxy = transform
        ? {
            get x() { return transform.position.x; },
            set x(v: number) { transform.position.x = v; },
            get y() { return transform.position.y; },
            set y(v: number) { transform.position.y = v; },
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

      // Use Function constructor for sandboxing (not eval)
      const fn = new Function(
        'entity',
        'transform',
        'input',
        'time',
        'scene',
        'console',
        `
        let onStart, onUpdate, onDestroy;
        ${script.scriptSource}
        return { onStart, onUpdate, onDestroy };
        `
      );

      const result = fn(
        entityProxy,
        transformProxy,
        inputProxy,
        timeProxy,
        sceneProxyObj,
        console
      );

      return result as CompiledScript;
    } catch (err) {
      console.error(`[ScriptRunner] Failed to compile script "${script.scriptName}" on entity "${entity.name}":`, err);
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
      const script = entity.getComponent<ScriptComponent>('ScriptComponent');
      if (!script) continue;

      const compiled = this.compileScript(entity, script, input, time, sceneProxy);
      if (compiled) {
        this.compiledScripts.set(entity.id, compiled);
        try {
          compiled.onStart?.();
        } catch (err) {
          console.error(`[ScriptRunner] onStart error on "${entity.name}":`, err);
        }
        this.started.add(entity.id);
      }
    }
  }

  updateAll(deltaTime: number): void {
    for (const [entityId, compiled] of this.compiledScripts) {
      if (!this.started.has(entityId)) continue;
      try {
        compiled.onUpdate?.(deltaTime);
      } catch (err) {
        console.error(`[ScriptRunner] onUpdate error on entity ${entityId}:`, err);
      }
    }
  }

  destroyAll(): void {
    for (const [, compiled] of this.compiledScripts) {
      try {
        compiled.onDestroy?.();
      } catch (err) {
        console.error('[ScriptRunner] onDestroy error:', err);
      }
    }
    this.compiledScripts.clear();
    this.started.clear();
  }
}
