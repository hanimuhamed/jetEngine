// engine/core/GameLoop.ts
import { Entity } from './Entity';
import { InputManager } from './InputManager';
import { Renderer2D } from '../rendering/Renderer2D';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { ScriptRunner } from '../scripting/ScriptRunner';
import type { TimeInfo, SceneProxy } from '../scripting/ScriptRunner';
import { Scene } from '../scene/Scene';
import { SceneSerializer } from '../scene/SceneSerializer';
import { Transform2D } from '../components/Transform2D';
import { ButtonComponent } from '../components/ButtonComponent';
import { getWorldTransform } from './WorldTransform';
import { Vec2 } from './Math2D';

export type EngineState = 'EDITING' | 'PLAYING' | 'PAUSED';

/** Recursively collect all entities (including children) for systems to process.
 *  Skips inactive entities and their children — they are excluded entirely. */
function collectAllEntities(entities: Entity[]): Entity[] {
  const result: Entity[] = [];
  for (const entity of entities) {
    if (!entity.active) continue; // skip inactive entity and all its children
    result.push(entity);
    if (entity.children.length > 0) {
      result.push(...collectAllEntities(entity.children));
    }
  }
  return result;
}

export class GameLoop {
  public state: EngineState = 'EDITING';
  public timeInfo: TimeInfo = { deltaTime: 0, elapsed: 0, frameCount: 0 };

  private rafId: number | null = null;
  private lastTime: number = 0;

  private physicsSystem: PhysicsSystem = new PhysicsSystem();
  private scriptRunner: ScriptRunner = new ScriptRunner();

  private renderer: Renderer2D;
  private inputManager: InputManager;
  private scene: Scene;

  /** Prefab JSON store — set from the engine store before play */
  public prefabs: Map<string, string> = new Map();

  /** Script asset sources — name → source. Set from the engine store before play */
  public scriptAssets: Map<string, string> = new Map();

  /** Entities queued for destruction — processed at end of frame */
  private destroyQueue: Entity[] = [];

  /** Callback to sync state back to the store each frame */
  public onFrameCallback: (() => void) | null = null;

  constructor(renderer: Renderer2D, inputManager: InputManager, scene: Scene) {
    this.renderer = renderer;
    this.inputManager = inputManager;
    this.scene = scene;
  }

  setScene(scene: Scene): void {
    this.scene = scene;
    // Find camera entity and assign to renderer
    this.syncCameraEntity();
  }

  private syncCameraEntity(): void {
    const allEntities = collectAllEntities(this.scene.entities);
    const camera = allEntities.find(e => e.hasComponent('Camera2DComponent'));
    this.renderer.cameraEntity = camera ?? null;
  }

  play(): void {
    if (this.state === 'PLAYING') return;
    this.state = 'PLAYING';

    this.syncCameraEntity();

    if (this.timeInfo.elapsed === 0) {
      // Fresh start — compile and start scripts
      const allEntities = collectAllEntities(this.scene.entities);
      const sceneProxy: SceneProxy = {
        getEntityByName: (name: string) => {
          const all = collectAllEntities(this.scene.entities);
          return all.find(e => e.name === name) ?? null;
        },
        getAllEntities: () => collectAllEntities(this.scene.entities),
        spawnPrefab: (prefabName: string, x: number, y: number) => {
          const json = this.prefabs.get(prefabName);
          if (!json) return null;
          const entity = SceneSerializer.deserializeEntity(json);
          const transform = entity.getComponent<Transform2D>('Transform2D');
          if (transform) {
            transform.position.x = x;
            transform.position.y = y;
          }
          this.scene.addEntity(entity);
          // Compile and start scripts on the newly spawned entity
          this.scriptRunner.compileAndStartEntity(entity);
          return entity;
        },
        destroyEntity: (entity: Entity) => {
          this.destroyQueue.push(entity);
        },
      };
      this.scriptRunner.scriptAssets = this.scriptAssets;
      this.scriptRunner.startAll(
        allEntities,
        this.inputManager,
        this.timeInfo,
        sceneProxy
      );
    }

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  pause(): void {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  stop(): void {
    this.state = 'EDITING';
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.scriptRunner.destroyAll();
    this.timeInfo = { deltaTime: 0, elapsed: 0, frameCount: 0 };
    // Switch back to editor camera
    this.renderer.useEditorCamera();
  }

  /** Editor-mode render (no physics/scripts, just draw) */
  renderEditor(entities: Entity[], selectedId: string | null): void {
    this.renderer.clear(false); // editor uses default dark bg
    this.renderer.drawGrid();
    const allEntities = collectAllEntities(entities);
    this.renderer.renderEntities(allEntities, selectedId);
  }

  private loop = (now: number): void => {
    if (this.state !== 'PLAYING') return;

    const dt = Math.min((now - this.lastTime) / 1000, 0.05); // cap at 50ms
    this.lastTime = now;
    this.timeInfo.deltaTime = dt;
    this.timeInfo.elapsed += dt;
    this.timeInfo.frameCount++;

    const allEntities = collectAllEntities(this.scene.entities);

    // Update scripts
    this.scriptRunner.updateAll(dt);

    // Update physics
    this.physicsSystem.update(allEntities, dt);

    // Dispatch collision events to scripts
    this.scriptRunner.dispatchCollisions(this.physicsSystem.collisionEvents);

    // Dispatch onClick for ButtonComponent entities clicked this frame
    if (this.inputManager.isMouseButtonPressed(0)) {
      const mouseScreen = this.inputManager.getMousePosition();
      const mouseWorld = this.renderer.screenToWorld(new Vec2(mouseScreen.x, mouseScreen.y));
      const clicked: Entity[] = [];
      for (const entity of allEntities) {
        const btn = entity.getComponent<ButtonComponent>('ButtonComponent');
        if (!btn) continue;
        const world = getWorldTransform(entity);
        const dx = mouseWorld.x - (world.position.x + btn.offset.x);
        const dy = mouseWorld.y - (world.position.y + btn.offset.y);
        if (btn.shape === 'circle') {
          const r = btn.radius * Math.max(Math.abs(world.scaleX), Math.abs(world.scaleY));
          if (dx * dx + dy * dy <= r * r) clicked.push(entity);
        } else {
          const hw = (btn.width / 2) * Math.abs(world.scaleX);
          const hh = (btn.height / 2) * Math.abs(world.scaleY);
          if (Math.abs(dx) <= hw && Math.abs(dy) <= hh) clicked.push(entity);
        }
      }
      if (clicked.length > 0) {
        this.scriptRunner.dispatchClicks(clicked);
      }
    }

    // Process destroy queue
    for (const entity of this.destroyQueue) {
      if (entity.parent) {
        entity.parent.removeChild(entity.id);
      } else {
        this.scene.removeEntity(entity.id);
      }
      entity.destroy();
    }
    this.destroyQueue = [];

    // Sync camera position from camera entity transform
    this.renderer.syncCameraFromEntity();

    // Use game camera for rendering during play
    this.renderer.useGameCamera();

    // Render — use camera background color during play
    this.renderer.clear(true);
    this.renderer.renderEntities(allEntities, null, false);

    // Notify store
    this.onFrameCallback?.();

    // End frame for input
    this.inputManager.endFrame();

    this.rafId = requestAnimationFrame(this.loop);
  };

  destroy(): void {
    this.stop();
    this.inputManager.detach();
  }
}
