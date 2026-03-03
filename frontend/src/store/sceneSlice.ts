// store/sceneSlice.ts — Save/load, project management, aspect ratio
import { v4 as uuidv4 } from 'uuid';
import { Entity } from '../engine/core/Entity';
import { Transform2D } from '../engine/components/Transform2D';
import { Camera2DComponent } from '../engine/components/Camera2DComponent';
import { SceneSerializer } from '../engine/scene/SceneSerializer';
import type { Asset, SceneSlice, SliceCreator } from './types';
import { collectAllEntities, createInitialScene, CAMERA_ENTITY_NAME } from './storeHelpers';

export const createSceneSlice: SliceCreator<SceneSlice> = (set, get) => ({
  projectName: 'Untitled Project',
  sceneAspectRatio: null,
  customRatioX: 16,
  customRatioY: 9,

  setProjectName: (name) => set({ projectName: name }),
  setSceneAspectRatio: (ratio) => set({ sceneAspectRatio: ratio }),
  setCustomRatio: (x, y) => set({ customRatioX: x, customRatioY: y, sceneAspectRatio: x / y }),

  saveScene: () => {
    const { scene, assets } = get();
    const sceneData = SceneSerializer.serialize(scene);
    const saveData = {
      scene: sceneData,
      assets: assets.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        base64: a.base64,
        url: a.type === 'image' ? '' : a.url,
        prefabJson: a.prefabJson,
        scriptSource: a.scriptSource,
      })),
    };
    return JSON.stringify(saveData, null, 2);
  },

  loadScene: (json) => {
    const parsed = JSON.parse(json);

    let sceneData: ReturnType<typeof SceneSerializer.serialize>;
    let loadedAssets: Asset[] = [];

    if (parsed.scene && parsed.scene.name !== undefined) {
      sceneData = parsed.scene;
      if (Array.isArray(parsed.assets)) {
        loadedAssets = parsed.assets.map((a: Record<string, unknown>) => {
          const asset: Asset = {
            id: (a.id as string) ?? uuidv4(),
            name: (a.name as string) ?? 'Unknown',
            url: (a.url as string) ?? '',
            type: (a.type as Asset['type']) ?? 'image',
            prefabJson: a.prefabJson as string | undefined,
            base64: a.base64 as string | undefined,
            scriptSource: a.scriptSource as string | undefined,
          };
          if (asset.type === 'image' && asset.base64 && !asset.url) asset.url = asset.base64;
          return asset;
        });
      }
    } else {
      sceneData = parsed;
    }

    const loaded = SceneSerializer.deserialize(sceneData);
    const { gameLoop } = get();
    if (gameLoop) { gameLoop.stop(); gameLoop.setScene(loaded); }

    // Find or create camera entity
    const allEntities = collectAllEntities(loaded.entities);
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
      assets: loadedAssets,
    });
  },

  newProject: () => {
    const { gameLoop } = get();
    if (gameLoop) gameLoop.stop();
    const { scene: newScene, cameraEntityId: newCamId } = createInitialScene();
    set({
      scene: newScene,
      entities: [...newScene.entities],
      selectedEntityId: null,
      engineState: 'EDITING',
      cameraEntityId: newCamId,
      assets: [],
      projectName: 'Untitled Project',
      editingPrefabId: null,
      editingPrefabEntity: null,
      editingScriptEntityId: null,
      editingScriptComponentId: null,
      editingScriptAssetId: null,
      consoleLogs: [],
    });
    if (gameLoop) gameLoop.setScene(newScene);
  },
});
