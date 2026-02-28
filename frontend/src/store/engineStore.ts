// store/engineStore.ts — Zustand store bridging engine and React UI
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Entity } from '../engine/core/Entity';
import { Scene } from '../engine/scene/Scene';
import { SceneSerializer } from '../engine/scene/SceneSerializer';
import { Renderer2D } from '../engine/rendering/Renderer2D';
import { InputManager } from '../engine/core/InputManager';
import { GameLoop } from '../engine/core/GameLoop';
import { Transform2D } from '../engine/components/Transform2D';
import { SpriteRenderer } from '../engine/components/SpriteRenderer';
import { RigidBody2D } from '../engine/components/RigidBody2D';
import { Collider2D } from '../engine/components/Collider2D';
import { ScriptComponent, DEFAULT_SCRIPT_TEMPLATE } from '../engine/components/ScriptComponent';
import { Vec2 } from '../engine/core/Math2D';
import type { Component } from '../engine/core/Component';
import type { EngineState } from '../engine/core/GameLoop';
import type { ShapeType } from '../engine/components/SpriteRenderer';

// ─── Asset type ────────────────────────────────────
export interface Asset {
  id: string;
  name: string;
  url: string;
  type: 'image';
}

// ─── Snapshot for undo on stop ─────────────────────
interface SceneSnapshot {
  json: string;
}

// ─── Store interface ───────────────────────────────
export interface EngineStore {
  // Scene
  scene: Scene;
  entities: Entity[]; // mirror of scene.entities for reactivity

  // Selection
  selectedEntityId: string | null;
  selectEntity: (id: string | null) => void;

  // Entity CRUD
  addEntity: (name?: string) => Entity;
  removeEntity: (id: string) => void;
  renameEntity: (id: string, newName: string) => void;

  // Component CRUD
  addComponentToEntity: (entityId: string, componentType: string) => void;
  removeComponentFromEntity: (entityId: string, componentType: string) => void;
  updateComponent: (entityId: string, componentType: string, updater: (comp: Component) => void) => void;

  // Engine state
  engineState: EngineState;

  // Engine instances (non-serializable, managed externally)
  renderer: Renderer2D;
  inputManager: InputManager;
  gameLoop: GameLoop | null;

  // Canvas
  setCanvas: (canvas: HTMLCanvasElement) => void;

  // Play controls
  play: () => void;
  pause: () => void;
  stop: () => void;

  // Scene save/load
  saveScene: () => string;
  loadScene: (json: string) => void;

  // Assets
  assets: Asset[];
  addAsset: (name: string, url: string) => void;
  removeAsset: (id: string) => void;

  // Script editing
  editingScriptEntityId: string | null;
  setEditingScript: (entityId: string | null) => void;

  // Force re-render trigger
  _tick: number;
  syncEntities: () => void;
}

// Snapshot for restoring scene on stop
let sceneSnapshot: SceneSnapshot | null = null;

// Singleton instances
const renderer = new Renderer2D();
const inputManager = new InputManager();
const initialScene = new Scene('Main Scene');

export const useEngineStore = create<EngineStore>((set, get) => ({
  scene: initialScene,
  entities: [],

  selectedEntityId: null,
  selectEntity: (id) => set({ selectedEntityId: id }),

  addEntity: (name) => {
    const { scene } = get();
    const entity = new Entity(name ?? `Entity_${scene.entities.length}`);
    entity.addComponent(new Transform2D());
    entity.addComponent(new SpriteRenderer('#4a9eff', 'rectangle', 50, 50));
    scene.addEntity(entity);
    set({ entities: [...scene.entities] });
    return entity;
  },

  removeEntity: (id) => {
    const { scene, selectedEntityId } = get();
    scene.removeEntity(id);
    set({
      entities: [...scene.entities],
      selectedEntityId: selectedEntityId === id ? null : selectedEntityId,
    });
  },

  renameEntity: (id, newName) => {
    const { scene } = get();
    const entity = scene.getEntityById(id);
    if (entity) {
      entity.name = newName;
      set({ entities: [...scene.entities] });
    }
  },

  addComponentToEntity: (entityId, componentType) => {
    const { scene } = get();
    const entity = scene.getEntityById(entityId);
    if (!entity) return;
    if (entity.hasComponent(componentType)) return;

    let comp: Component | null = null;
    switch (componentType) {
      case 'Transform2D':
        comp = new Transform2D();
        break;
      case 'SpriteRenderer':
        comp = new SpriteRenderer();
        break;
      case 'RigidBody2D':
        comp = new RigidBody2D();
        break;
      case 'Collider2D':
        comp = new Collider2D();
        break;
      case 'ScriptComponent':
        comp = new ScriptComponent(entity.name + 'Script', DEFAULT_SCRIPT_TEMPLATE(entity.name));
        break;
    }
    if (comp) {
      entity.addComponent(comp);
      set({ entities: [...scene.entities] });
    }
  },

  removeComponentFromEntity: (entityId, componentType) => {
    const { scene } = get();
    const entity = scene.getEntityById(entityId);
    if (entity) {
      entity.removeComponent(componentType);
      set({ entities: [...scene.entities] });
    }
  },

  updateComponent: (entityId, componentType, updater) => {
    const { scene } = get();
    const entity = scene.getEntityById(entityId);
    if (!entity) return;
    const comp = entity.getComponent(componentType);
    if (comp) {
      updater(comp);
      set({ entities: [...scene.entities], _tick: get()._tick + 1 });
    }
  },

  engineState: 'EDITING',

  renderer,
  inputManager,
  gameLoop: null,

  setCanvas: (canvas) => {
    const { renderer: r, inputManager: im } = get();
    r.attach(canvas);
    im.attach(canvas);

    // Resize canvas to fit parent
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resize();

    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    }
  },

  play: () => {
    const state = get();
    if (state.engineState === 'PLAYING') return;

    // Save snapshot before playing
    if (state.engineState === 'EDITING') {
      sceneSnapshot = { json: SceneSerializer.toJSON(state.scene) };
    }

    let gl = state.gameLoop;
    if (!gl) {
      gl = new GameLoop(state.renderer, state.inputManager, state.scene);
      gl.onFrameCallback = () => {
        set({ _tick: get()._tick + 1, entities: [...get().scene.entities] });
      };
      set({ gameLoop: gl });
    }

    gl.setScene(state.scene);
    gl.play();
    set({ engineState: 'PLAYING' });
  },

  pause: () => {
    const { gameLoop } = get();
    gameLoop?.pause();
    set({ engineState: 'PAUSED' });
  },

  stop: () => {
    const { gameLoop } = get();
    gameLoop?.stop();

    // Restore scene from snapshot
    if (sceneSnapshot) {
      const restoredScene = SceneSerializer.fromJSON(sceneSnapshot.json);
      set({
        scene: restoredScene,
        entities: [...restoredScene.entities],
        engineState: 'EDITING',
        selectedEntityId: null,
      });

      // Re-wire game loop to new scene
      if (gameLoop) {
        gameLoop.setScene(restoredScene);
      }
      sceneSnapshot = null;
    } else {
      set({ engineState: 'EDITING' });
    }
  },

  saveScene: () => {
    const { scene } = get();
    return SceneSerializer.toJSON(scene);
  },

  loadScene: (json) => {
    const loaded = SceneSerializer.fromJSON(json);
    const { gameLoop } = get();
    if (gameLoop) {
      gameLoop.stop();
      gameLoop.setScene(loaded);
    }
    set({
      scene: loaded,
      entities: [...loaded.entities],
      selectedEntityId: null,
      engineState: 'EDITING',
    });
  },

  assets: [],
  addAsset: (name, url) => {
    set({ assets: [...get().assets, { id: uuidv4(), name, url, type: 'image' }] });
  },
  removeAsset: (id) => {
    const { assets } = get();
    set({ assets: assets.filter(a => a.id !== id) });
  },

  editingScriptEntityId: null,
  setEditingScript: (entityId) => set({ editingScriptEntityId: entityId }),

  _tick: 0,
  syncEntities: () => {
    const { scene } = get();
    set({ entities: [...scene.entities], _tick: get()._tick + 1 });
  },
}));
