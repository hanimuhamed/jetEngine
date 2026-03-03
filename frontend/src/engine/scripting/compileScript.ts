// engine/scripting/compileScript.ts — Compiles a script into sandboxed callbacks
import { Entity } from '../core/Entity';
import { InputManager } from '../core/InputManager';
import { Transform2D } from '../components/Transform2D';
import { ScriptComponent } from '../components/ScriptComponent';
import { VALID_COMPONENT_TYPES, makeTransformProxy, makeComponentProxy } from './componentProxies';
import { emitConsoleEntry, createSandboxConsole } from './scriptConsole';
import type { TimeInfo, SceneProxy } from './ScriptRunner';

export interface CompiledScript {
  onStart?: () => void;
  onUpdate?: (deltaTime: number) => void;
  onDestroy?: () => void;
  onCollision?: (other: unknown) => void;
  onClick?: () => void;
}

/**
 * Compile a ScriptComponent into a sandboxed CompiledScript.
 * Builds proxies for entity, transform, input, time, scene, and assets,
 * then executes the source via Function constructor.
 */
export function compileScript(
  entity: Entity,
  script: ScriptComponent,
  input: InputManager,
  time: TimeInfo,
  sceneProxy: SceneProxy,
  scriptAssets: Map<string, string>,
): CompiledScript | null {
  try {
    const transform = entity.getComponent<Transform2D>('Transform2D');

    // Resolve script source — prefer asset source if linked
    let scriptSource = script.scriptSource;
    if (script.scriptAssetName && scriptAssets.has(script.scriptAssetName)) {
      scriptSource = scriptAssets.get(script.scriptAssetName)!;
    }

    const sandboxConsole = createSandboxConsole();

    const transformProxy = transform ? makeTransformProxy(transform) : {
      position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, translate() {},
    };

    const entityProxy = {
      id: entity.id,
      name: entity.name,
      get tag() { return entity.tag; },
      set tag(v: string) { entity.tag = v; },
      get active() { return entity.active; },
      set active(v: boolean) { entity.active = v; },
      getComponent: (type: string) => {
        if (!VALID_COMPONENT_TYPES.includes(type)) {
          sandboxConsole.error(`[getComponent] Unknown type: "${type}". Valid: ${VALID_COMPONENT_TYPES.join(', ')}`);
          return null;
        }
        const comp = entity.getComponent(type);
        if (!comp) {
          sandboxConsole.error(`[getComponent] Entity "${entity.name}" has no "${type}".`);
          return null;
        }
        return makeComponentProxy(comp, type);
      },
      destroy: () => sceneProxy.destroyEntity(entity),
    };

    const inputProxy = {
      isKeyDown: (key: string) => input.isKeyDown(key),
      isKeyPressed: (key: string) => input.isKeyPressed(key),
      isMouseButtonDown: (button: number) => input.isMouseButtonDown(button),
      isMouseButtonPressed: (button: number) => input.isMouseButtonPressed(button),
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
        if (target.id) e = sceneProxy.getAllEntities().find(ent => ent.id === target.id) ?? null;
        else if (target.name) e = sceneProxy.getEntityByName(target.name);
        if (e) sceneProxy.destroyEntity(e);
      },
    };

    const assetsProxy = {
      spawn: (prefabName: string, x: number, y: number) => {
        const spawned = sceneProxy.spawnPrefab(prefabName, x, y);
        return spawned ? { id: spawned.id, name: spawned.name, tag: spawned.tag } : null;
      },
    };

    const fn = new Function(
      'entity', 'transform', 'input', 'time', 'scene', 'assets', 'console',
      `
      var __onStart, __onUpdate, __onDestroy, __onCollision, __onClick;
      (function() {
        ${scriptSource}
        if (typeof onStart === 'function') __onStart = onStart;
        if (typeof onUpdate === 'function') __onUpdate = onUpdate;
        if (typeof onDestroy === 'function') __onDestroy = onDestroy;
        if (typeof onCollision === 'function') __onCollision = onCollision;
        if (typeof onClick === 'function') __onClick = onClick;
      })();
      return { onStart: __onStart, onUpdate: __onUpdate, onDestroy: __onDestroy, onCollision: __onCollision, onClick: __onClick };
      `
    );

    return fn(entityProxy, transformProxy, inputProxy, timeProxy, sceneProxyObj, assetsProxy, sandboxConsole) as CompiledScript;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emitConsoleEntry({ level: 'error', message: `[Compile] "${script.scriptName}" on "${entity.name}": ${msg}`, timestamp: Date.now() });
    return null;
  }
}
