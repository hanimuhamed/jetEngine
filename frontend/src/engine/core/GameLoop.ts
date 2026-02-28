// engine/core/GameLoop.ts
import { Entity } from './Entity';
import { InputManager } from './InputManager';
import { Renderer2D } from '../rendering/Renderer2D';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { ScriptRunner } from '../scripting/ScriptRunner';
import type { TimeInfo, SceneProxy } from '../scripting/ScriptRunner';
import { Scene } from '../scene/Scene';

export type EngineState = 'EDITING' | 'PLAYING' | 'PAUSED';

/** Recursively collect all entities (including children) for systems to process */
function collectAllEntities(entities: Entity[]): Entity[] {
  const result: Entity[] = [];
  for (const entity of entities) {
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
      };
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

    // Sync camera position from camera entity transform
    this.renderer.syncCameraFromEntity();

    // Render — use camera background color during play
    this.renderer.clear(true);
    this.renderer.renderEntities(allEntities, null);

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
