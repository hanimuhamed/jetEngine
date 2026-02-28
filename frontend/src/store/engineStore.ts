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
import { Camera2DComponent } from '../engine/components/Camera2DComponent';
import type { Component } from '../engine/core/Component';
import type { EngineState } from '../engine/core/GameLoop';
import type { ConsoleEntry } from '../engine/scripting/ScriptRunner';
import { addConsoleListener } from '../engine/scripting/ScriptRunner';

// ─── Asset type ────────────────────────────────────
export interface Asset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'prefab';
  /** For prefabs: serialized entity JSON */
  prefabJson?: string;
}

// ─── Camera entity ID constant ─────────────────────
const CAMERA_ENTITY_NAME = 'Camera';

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
  addEntity: (name?: string, parentId?: string | null) => Entity;
  removeEntity: (id: string) => void;
  renameEntity: (id: string, newName: string) => void;
  setEntityTag: (id: string, tag: string) => void;
  reparentEntity: (entityId: string, newParentId: string | null) => void;
  reorderEntity: (entityId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
  spawnPrefab: (prefabName: string, x: number, y: number) => Entity | null;

  // Component CRUD
  addComponentToEntity: (entityId: string, componentType: string) => void;
  removeComponentFromEntity: (entityId: string, componentId: string) => void;
  updateComponent: (entityId: string, componentType: string, updater: (comp: Component) => void) => void;
  updateComponentById: (entityId: string, componentId: string, updater: (comp: Component) => void) => void;

  // Camera entity id
  cameraEntityId: string;

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
  addPrefabAsset: (name: string, entityJson: string) => void;
  removeAsset: (id: string) => void;

  // Script editing — now supports specific script component id
  editingScriptEntityId: string | null;
  editingScriptComponentId: string | null;
  setEditingScript: (entityId: string | null, componentId?: string | null) => void;

  // Console
  consoleLogs: ConsoleEntry[];
  addConsoleLog: (entry: ConsoleEntry) => void;
  clearConsoleLogs: () => void;

  // Force re-render trigger
  _tick: number;
  syncEntities: () => void;
}

// Snapshot for restoring scene on stop
let sceneSnapshot: SceneSnapshot | null = null;

// Singleton instances
const renderer = new Renderer2D();
const inputManager = new InputManager();

// Create initial scene with camera entity
function createInitialScene(): { scene: Scene; cameraEntityId: string } {
  const scene = new Scene('Main Scene');

  // Create the default Camera entity
  const cameraEntity = new Entity(CAMERA_ENTITY_NAME);
  cameraEntity.addComponent(new Transform2D());
  cameraEntity.addComponent(new Camera2DComponent('#1a1a2e'));
  scene.addEntity(cameraEntity);

  return { scene, cameraEntityId: cameraEntity.id };
}

const { scene: initialScene, cameraEntityId: initialCameraId } = createInitialScene();

/** Helper: find entity by id in a tree (including children) */
function findEntityInTree(entities: Entity[], id: string): Entity | null {
  for (const e of entities) {
    if (e.id === id) return e;
    const found = findEntityInTree(e.children, id);
    if (found) return found;
  }
  return null;
}

/** Helper: remove entity from its current parent or top-level list */
function detachEntity(scene: Scene, entityId: string): Entity | null {
  // Check top-level
  const idx = scene.entities.findIndex(e => e.id === entityId);
  if (idx !== -1) {
    const [entity] = scene.entities.splice(idx, 1);
    entity.parent = null;
    return entity;
  }
  // Check children recursively
  function detachFromChildren(entities: Entity[]): Entity | null {
    for (const parent of entities) {
      const cIdx = parent.children.findIndex(c => c.id === entityId);
      if (cIdx !== -1) {
        const [child] = parent.children.splice(cIdx, 1);
        child.parent = null;
        return child;
      }
      const found = detachFromChildren(parent.children);
      if (found) return found;
    }
    return null;
  }
  return detachFromChildren(scene.entities);
}

export const useEngineStore = create<EngineStore>((set, get) => {
  // Set up console listener
  addConsoleListener((entry) => {
    get().addConsoleLog(entry);
  });

  return {
    scene: initialScene,
    entities: [...initialScene.entities],
    cameraEntityId: initialCameraId,

    selectedEntityId: null,
    selectEntity: (id) => set({ selectedEntityId: id }),

    addEntity: (name, parentId) => {
      const { scene, cameraEntityId } = get();
      const entity = new Entity(name ?? `Entity_${scene.entities.length}`);
      entity.addComponent(new Transform2D());
      entity.addComponent(new SpriteRenderer('#ffffff', 'rectangle', 50, 50));

      if (parentId) {
        const parent = findEntityInTree(scene.entities, parentId);
        if (parent) {
          parent.addChild(entity);
        } else {
          scene.addEntity(entity);
        }
      } else {
        scene.addEntity(entity);
      }

      set({ entities: [...scene.entities], cameraEntityId });
      return entity;
    },

    removeEntity: (id) => {
      const { scene, selectedEntityId, cameraEntityId } = get();

      // Prevent deleting the camera entity
      if (id === cameraEntityId) return;

      // Remove from top-level or parent
      const entity = findEntityInTree(scene.entities, id);
      if (!entity) return;

      if (entity.parent) {
        entity.parent.removeChild(id);
      } else {
        scene.removeEntity(id);
      }

      set({
        entities: [...scene.entities],
        selectedEntityId: selectedEntityId === id ? null : selectedEntityId,
      });
    },

    renameEntity: (id, newName) => {
      const { scene } = get();
      const entity = findEntityInTree(scene.entities, id);
      if (entity) {
        entity.name = newName;
        set({ entities: [...scene.entities] });
      }
    },

    setEntityTag: (id, tag) => {
      const { scene } = get();
      const entity = findEntityInTree(scene.entities, id);
      if (entity) {
        entity.tag = tag;
        set({ entities: [...scene.entities], _tick: get()._tick + 1 });
      }
    },

    reparentEntity: (entityId, newParentId) => {
      const { scene, cameraEntityId } = get();
      // Can't reparent camera
      if (entityId === cameraEntityId) return;

      const entity = detachEntity(scene, entityId);
      if (!entity) return;

      if (newParentId) {
        const newParent = findEntityInTree(scene.entities, newParentId);
        if (newParent) {
          newParent.addChild(entity);
        } else {
          scene.addEntity(entity);
        }
      } else {
        scene.addEntity(entity);
      }

      set({ entities: [...scene.entities] });
    },

    reorderEntity: (entityId, targetId, position) => {
      const { scene, cameraEntityId } = get();
      if (entityId === cameraEntityId) return;
      if (entityId === targetId) return;

      // Prevent making something a child of itself or its descendant
      const isDescendant = (parentId: string, childId: string): boolean => {
        const parent = findEntityInTree(scene.entities, parentId);
        if (!parent) return false;
        for (const c of parent.children) {
          if (c.id === childId) return true;
          if (isDescendant(c.id, childId)) return true;
        }
        return false;
      };
      if (position === 'inside' && isDescendant(entityId, targetId)) return;

      const entity = detachEntity(scene, entityId);
      if (!entity) return;

      if (position === 'inside') {
        // Make child of target
        const target = findEntityInTree(scene.entities, targetId);
        if (target) {
          target.addChild(entity);
        } else {
          scene.addEntity(entity);
        }
      } else {
        // Insert before/after target in the same parent
        const targetEntity = findEntityInTree(scene.entities, targetId);
        if (!targetEntity) { scene.addEntity(entity); }
        else {
          const siblings = targetEntity.parent ? targetEntity.parent.children : scene.entities;
          const idx = siblings.findIndex(e => e.id === targetId);
          const insertIdx = position === 'after' ? idx + 1 : idx;
          siblings.splice(insertIdx, 0, entity);
          entity.parent = targetEntity.parent ?? null;
        }
      }

      set({ entities: [...scene.entities] });
    },

    spawnPrefab: (prefabName, x, y) => {
      const { scene, assets } = get();
      const prefabAsset = assets.find(a => a.type === 'prefab' && a.name === prefabName);
      if (!prefabAsset || !prefabAsset.prefabJson) return null;

      const entity = SceneSerializer.deserializeEntity(prefabAsset.prefabJson);
      // Set position
      const transform = entity.getComponent<Transform2D>('Transform2D');
      if (transform) {
        transform.position.x = x;
        transform.position.y = y;
      }
      scene.addEntity(entity);
      set({ entities: [...scene.entities], _tick: get()._tick + 1 });
      return entity;
    },

    addComponentToEntity: (entityId, componentType) => {
      const { scene } = get();
      const entity = findEntityInTree(scene.entities, entityId);
      if (!entity) return;

      // For ScriptComponent, allow multiple instances
      // For all others, prevent duplicates
      if (componentType !== 'ScriptComponent' && entity.hasComponent(componentType)) return;

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
        case 'ScriptComponent': {
          const scriptNum = entity.countComponents('ScriptComponent');
          const suffix = scriptNum > 0 ? `_${scriptNum}` : '';
          comp = new ScriptComponent(
            entity.name + 'Script' + suffix,
            DEFAULT_SCRIPT_TEMPLATE(entity.name)
          );
          break;
        }
        case 'Camera2DComponent':
          comp = new Camera2DComponent();
          break;
      }
      if (comp) {
        entity.addComponent(comp);
        set({ entities: [...scene.entities] });
      }
    },

    removeComponentFromEntity: (entityId, componentId) => {
      const { scene } = get();
      const entity = findEntityInTree(scene.entities, entityId);
      if (entity) {
        entity.removeComponentById(componentId);
        set({ entities: [...scene.entities] });
      }
    },

    updateComponent: (entityId, componentType, updater) => {
      const { scene } = get();
      const entity = findEntityInTree(scene.entities, entityId);
      if (!entity) return;
      const comp = entity.getComponent(componentType);
      if (comp) {
        updater(comp);
        set({ entities: [...scene.entities], _tick: get()._tick + 1 });
      }
    },

    updateComponentById: (entityId, componentId, updater) => {
      const { scene } = get();
      const entity = findEntityInTree(scene.entities, entityId);
      if (!entity) return;
      const comp = entity.getComponentById(componentId);
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

      // Pass prefab assets to game loop
      gl.prefabs.clear();
      for (const asset of state.assets) {
        if (asset.type === 'prefab' && asset.prefabJson) {
          gl.prefabs.set(asset.name, asset.prefabJson);
        }
      }

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

        // Find camera entity id in restored scene
        const allEntities: Entity[] = [];
        const collectAll = (entities: Entity[]) => {
          for (const e of entities) {
            allEntities.push(e);
            collectAll(e.children);
          }
        };
        collectAll(restoredScene.entities);
        const cameraEntity = allEntities.find(e => e.hasComponent('Camera2DComponent'));

        set({
          scene: restoredScene,
          entities: [...restoredScene.entities],
          engineState: 'EDITING',
          selectedEntityId: null,
          cameraEntityId: cameraEntity?.id ?? get().cameraEntityId,
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

      // Find camera entity in loaded scene (or create one)
      const allEntities: Entity[] = [];
      const collectAll = (entities: Entity[]) => {
        for (const e of entities) {
          allEntities.push(e);
          collectAll(e.children);
        }
      };
      collectAll(loaded.entities);
      let cameraEntity = allEntities.find(e => e.hasComponent('Camera2DComponent'));
      if (!cameraEntity) {
        cameraEntity = new Entity(CAMERA_ENTITY_NAME);
        cameraEntity.addComponent(new Transform2D());
        cameraEntity.addComponent(new Camera2DComponent('#1a1a2e'));
        loaded.addEntity(cameraEntity);
      }

      set({
        scene: loaded,
        entities: [...loaded.entities],
        selectedEntityId: null,
        engineState: 'EDITING',
        cameraEntityId: cameraEntity.id,
      });
    },

    assets: [],
    addAsset: (name, url) => {
      set({ assets: [...get().assets, { id: uuidv4(), name, url, type: 'image' }] });
    },
    addPrefabAsset: (name, entityJson) => {
      set({ assets: [...get().assets, { id: uuidv4(), name, url: '', type: 'prefab', prefabJson: entityJson }] });
    },
    removeAsset: (id) => {
      const { assets } = get();
      set({ assets: assets.filter(a => a.id !== id) });
    },

    editingScriptEntityId: null,
    editingScriptComponentId: null,
    setEditingScript: (entityId, componentId) => set({
      editingScriptEntityId: entityId,
      editingScriptComponentId: componentId ?? null,
    }),

    consoleLogs: [],
    addConsoleLog: (entry) => {
      set(state => ({
        consoleLogs: [...state.consoleLogs.slice(-200), entry], // Keep last 200 entries
      }));
    },
    clearConsoleLogs: () => set({ consoleLogs: [] }),

    _tick: 0,
    syncEntities: () => {
      const { scene } = get();
      set({ entities: [...scene.entities], _tick: get()._tick + 1 });
    },
  };
});
