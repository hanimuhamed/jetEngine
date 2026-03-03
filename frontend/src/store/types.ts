// store/types.ts — Store type definitions
import type { Entity } from '../engine/core/Entity';
import type { Scene } from '../engine/scene/Scene';
import type { Renderer2D } from '../engine/rendering/Renderer2D';
import type { InputManager } from '../engine/core/InputManager';
import type { GameLoop, EngineState } from '../engine/core/GameLoop';
import type { Component } from '../engine/core/Component';
import type { ConsoleEntry } from '../engine/scripting/ScriptRunner';

// ─── Asset type ────────────────────────────────────
export interface Asset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'prefab' | 'script';
  prefabJson?: string;
  base64?: string;
  scriptSource?: string;
}

// ─── Slice interfaces ──────────────────────────────

export interface EntitySlice {
  scene: Scene;
  entities: Entity[];
  cameraEntityId: string;
  selectedEntityId: string | null;
  selectEntity: (id: string | null) => void;
  addEntity: (name?: string, parentId?: string | null) => Entity;
  removeEntity: (id: string) => void;
  renameEntity: (id: string, newName: string) => void;
  setEntityTag: (id: string, tag: string) => void;
  reparentEntity: (entityId: string, newParentId: string | null) => void;
  reorderEntity: (entityId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
  spawnPrefab: (prefabName: string, x: number, y: number) => Entity | null;
  addComponentToEntity: (entityId: string, componentType: string) => void;
  removeComponentFromEntity: (entityId: string, componentId: string) => void;
  updateComponent: (entityId: string, componentType: string, updater: (comp: Component) => void) => void;
  updateComponentById: (entityId: string, componentId: string, updater: (comp: Component) => void) => void;
  _tick: number;
  syncEntities: () => void;
}

export interface PlaybackSlice {
  engineState: EngineState;
  renderer: Renderer2D;
  inputManager: InputManager;
  gameLoop: GameLoop | null;
  setCanvas: (canvas: HTMLCanvasElement) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
}

export interface SceneSlice {
  saveScene: () => string;
  loadScene: (json: string) => void;
  projectName: string;
  setProjectName: (name: string) => void;
  newProject: () => void;
  sceneAspectRatio: number | null;
  customRatioX: number;
  customRatioY: number;
  setSceneAspectRatio: (ratio: number | null) => void;
  setCustomRatio: (x: number, y: number) => void;
}

export interface AssetSlice {
  assets: Asset[];
  addAsset: (name: string, url: string, base64?: string) => void;
  addPrefabAsset: (name: string, entityJson: string) => void;
  addScriptAsset: (name: string, scriptSource: string) => void;
  removeAsset: (id: string) => void;
  updateScriptAsset: (id: string, scriptSource: string) => void;
  editingScriptEntityId: string | null;
  editingScriptComponentId: string | null;
  setEditingScript: (entityId: string | null, componentId?: string | null) => void;
  editingScriptAssetId: string | null;
  setEditingScriptAsset: (assetId: string | null) => void;
  consoleLogs: ConsoleEntry[];
  addConsoleLog: (entry: ConsoleEntry) => void;
  clearConsoleLogs: () => void;
}

export interface PrefabSlice {
  editingPrefabId: string | null;
  editingPrefabEntity: Entity | null;
  startEditingPrefab: (assetId: string) => void;
  addPrefabChild: (parentId?: string) => void;
  savePrefab: () => void;
  cancelPrefabEdit: () => void;
}

// ─── Combined store ────────────────────────────────
export type EngineStore = EntitySlice & PlaybackSlice & SceneSlice & AssetSlice & PrefabSlice;

// ─── Slice creator type ────────────────────────────
export type SliceCreator<T> = (
  set: (partial: Partial<EngineStore> | ((state: EngineStore) => Partial<EngineStore>)) => void,
  get: () => EngineStore,
) => T;
