// store/entitySlice.ts — Entity CRUD, component management, selection
import { Entity } from '../engine/core/Entity';
import { Transform2D } from '../engine/components/Transform2D';
import { SpriteRenderer } from '../engine/components/SpriteRenderer';
import { RigidBody2D } from '../engine/components/RigidBody2D';
import { Collider2D } from '../engine/components/Collider2D';
import { ScriptComponent, DEFAULT_SCRIPT_TEMPLATE } from '../engine/components/ScriptComponent';
import { Camera2DComponent } from '../engine/components/Camera2DComponent';
import { TextComponent } from '../engine/components/TextComponent';
import { ButtonComponent } from '../engine/components/ButtonComponent';
import { SceneSerializer } from '../engine/scene/SceneSerializer';
import type { Component } from '../engine/core/Component';
import type { EntitySlice, SliceCreator } from './types';
import { findEntityInTree, findEntityAnywhere, detachEntity, createInitialScene } from './storeHelpers';

const { scene: initialScene, cameraEntityId: initialCameraId } = createInitialScene();

export const createEntitySlice: SliceCreator<EntitySlice> = (set, get) => ({
  scene: initialScene,
  entities: [...initialScene.entities],
  cameraEntityId: initialCameraId,
  selectedEntityId: null,
  _tick: 0,

  selectEntity: (id) => set({ selectedEntityId: id }),

  syncEntities: () => {
    const { scene } = get();
    set({ entities: [...scene.entities], _tick: get()._tick + 1 });
  },

  addEntity: (name, parentId) => {
    const { scene, cameraEntityId } = get();
    const entity = new Entity(name ?? `Entity_${scene.entities.length}`);
    entity.addComponent(new Transform2D());
    entity.addComponent(new SpriteRenderer('#ffffff', 'rectangle', 50, 50));

    if (parentId) {
      const parent = findEntityInTree(scene.entities, parentId);
      if (parent) parent.addChild(entity);
      else scene.addEntity(entity);
    } else {
      scene.addEntity(entity);
    }
    set({ entities: [...scene.entities], cameraEntityId });
    return entity;
  },

  removeEntity: (id) => {
    const { scene, selectedEntityId, cameraEntityId } = get();
    if (id === cameraEntityId) return;
    const entity = findEntityInTree(scene.entities, id);
    if (!entity) return;
    if (entity.parent) entity.parent.removeChild(id);
    else scene.removeEntity(id);
    set({
      entities: [...scene.entities],
      selectedEntityId: selectedEntityId === id ? null : selectedEntityId,
    });
  },

  renameEntity: (id, newName) => {
    const state = get();
    const entity = findEntityAnywhere(state, id);
    if (entity) {
      entity.name = newName;
      set({ entities: [...state.scene.entities], _tick: state._tick + 1 });
    }
  },

  setEntityTag: (id, tag) => {
    const state = get();
    const entity = findEntityAnywhere(state, id);
    if (entity) {
      entity.tag = tag;
      set({ entities: [...state.scene.entities], _tick: state._tick + 1 });
    }
  },

  reparentEntity: (entityId, newParentId) => {
    const { scene, cameraEntityId } = get();
    if (entityId === cameraEntityId) return;
    const entity = detachEntity(scene, entityId);
    if (!entity) return;
    if (newParentId) {
      const newParent = findEntityInTree(scene.entities, newParentId);
      if (newParent) newParent.addChild(entity);
      else scene.addEntity(entity);
    } else {
      scene.addEntity(entity);
    }
    set({ entities: [...scene.entities] });
  },

  reorderEntity: (entityId, targetId, position) => {
    const { scene, cameraEntityId } = get();
    if (entityId === cameraEntityId || entityId === targetId) return;

    const isDescendant = (parentId: string, childId: string): boolean => {
      const parent = findEntityInTree(scene.entities, parentId);
      if (!parent) return false;
      return parent.children.some(c => c.id === childId || isDescendant(c.id, childId));
    };
    if (position === 'inside' && isDescendant(entityId, targetId)) return;

    const entity = detachEntity(scene, entityId);
    if (!entity) return;

    if (position === 'inside') {
      const target = findEntityInTree(scene.entities, targetId);
      if (target) target.addChild(entity);
      else scene.addEntity(entity);
    } else {
      const targetEntity = findEntityInTree(scene.entities, targetId);
      if (!targetEntity) {
        scene.addEntity(entity);
      } else {
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
    const transform = entity.getComponent<Transform2D>('Transform2D');
    if (transform) { transform.position.x = x; transform.position.y = y; }
    scene.addEntity(entity);
    set({ entities: [...scene.entities], _tick: get()._tick + 1 });
    return entity;
  },

  addComponentToEntity: (entityId, componentType) => {
    const state = get();
    const entity = findEntityAnywhere(state, entityId);
    if (!entity) return;
    if (componentType !== 'ScriptComponent' && entity.hasComponent(componentType)) return;

    let comp: Component | null = null;
    switch (componentType) {
      case 'Transform2D': comp = new Transform2D(); break;
      case 'SpriteRenderer': comp = new SpriteRenderer(); break;
      case 'RigidBody2D': comp = new RigidBody2D(); break;
      case 'Collider2D': comp = new Collider2D(); break;
      case 'ScriptComponent': {
        const n = entity.countComponents('ScriptComponent');
        comp = new ScriptComponent(
          entity.name + 'Script' + (n > 0 ? `_${n}` : ''),
          DEFAULT_SCRIPT_TEMPLATE(entity.name),
        );
        break;
      }
      case 'Camera2DComponent': comp = new Camera2DComponent(); break;
      case 'TextComponent': comp = new TextComponent(); break;
      case 'ButtonComponent': comp = new ButtonComponent(); break;
    }
    if (comp) {
      entity.addComponent(comp);
      set({ entities: [...state.scene.entities], _tick: state._tick + 1 });
    }
  },

  removeComponentFromEntity: (entityId, componentId) => {
    const state = get();
    const entity = findEntityAnywhere(state, entityId);
    if (entity) {
      entity.removeComponentById(componentId);
      set({ entities: [...state.scene.entities], _tick: state._tick + 1 });
    }
  },

  updateComponent: (entityId, componentType, updater) => {
    const state = get();
    const entity = findEntityAnywhere(state, entityId);
    if (!entity) return;
    const comp = entity.getComponent(componentType);
    if (comp) {
      updater(comp);
      set({ entities: [...state.scene.entities], _tick: state._tick + 1 });
    }
  },

  updateComponentById: (entityId, componentId, updater) => {
    const state = get();
    const entity = findEntityAnywhere(state, entityId);
    if (!entity) return;
    const comp = entity.getComponentById(componentId);
    if (comp) {
      updater(comp);
      set({ entities: [...state.scene.entities], _tick: state._tick + 1 });
    }
  },
});
