// store/prefabSlice.ts — Prefab editing mode
import { Entity } from '../engine/core/Entity';
import { Transform2D } from '../engine/components/Transform2D';
import { SpriteRenderer } from '../engine/components/SpriteRenderer';
import { SceneSerializer } from '../engine/scene/SceneSerializer';
import type { PrefabSlice, SliceCreator } from './types';
import { findEntityInTree } from './storeHelpers';

export const createPrefabSlice: SliceCreator<PrefabSlice> = (set, get) => ({
  editingPrefabId: null,
  editingPrefabEntity: null,

  startEditingPrefab: (assetId) => {
    const { assets, engineState } = get();
    if (engineState !== 'EDITING') return;
    const asset = assets.find(a => a.id === assetId);
    if (!asset || asset.type !== 'prefab' || !asset.prefabJson) return;

    const entity = SceneSerializer.deserializeEntity(asset.prefabJson);
    const transform = entity.getComponent<Transform2D>('Transform2D');
    if (transform) { transform.position.x = 0; transform.position.y = 0; }

    set({
      editingPrefabId: assetId,
      editingPrefabEntity: entity,
      selectedEntityId: entity.id,
    });
  },

  savePrefab: () => {
    const { editingPrefabId, editingPrefabEntity, assets } = get();
    if (!editingPrefabId || !editingPrefabEntity) return;
    const json = SceneSerializer.serializeEntity(editingPrefabEntity);
    set({
      assets: assets.map(a => a.id === editingPrefabId ? { ...a, prefabJson: json } : a),
      editingPrefabId: null,
      editingPrefabEntity: null,
      selectedEntityId: null,
    });
  },

  addPrefabChild: (parentId) => {
    const { editingPrefabEntity, _tick } = get();
    if (!editingPrefabEntity) return;
    const parent = parentId
      ? findEntityInTree([editingPrefabEntity], parentId) ?? editingPrefabEntity
      : editingPrefabEntity;
    const child = new Entity(`Child_${parent.children.length}`);
    child.addComponent(new Transform2D());
    child.addComponent(new SpriteRenderer('#ffffff', 'rectangle', 50, 50));
    parent.addChild(child);
    set({ _tick: _tick + 1, selectedEntityId: child.id });
  },

  cancelPrefabEdit: () => {
    set({ editingPrefabId: null, editingPrefabEntity: null, selectedEntityId: null });
  },
});
