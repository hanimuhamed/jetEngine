// store/storeHelpers.ts — Shared helper functions for the store
import { Entity } from '../engine/core/Entity';
import { Scene } from '../engine/scene/Scene';
import { Transform2D } from '../engine/components/Transform2D';
import { Camera2DComponent } from '../engine/components/Camera2DComponent';

export const CAMERA_ENTITY_NAME = 'Camera';

/** Create a fresh scene with a default camera entity */
export function createInitialScene(): { scene: Scene; cameraEntityId: string } {
  const scene = new Scene('Main Scene');
  const cameraEntity = new Entity(CAMERA_ENTITY_NAME);
  cameraEntity.addComponent(new Transform2D());
  cameraEntity.addComponent(new Camera2DComponent('#1a1a2e'));
  scene.addEntity(cameraEntity);
  return { scene, cameraEntityId: cameraEntity.id };
}

/** Find entity by id in a tree (including children) */
export function findEntityInTree(entities: Entity[], id: string): Entity | null {
  for (const e of entities) {
    if (e.id === id) return e;
    const found = findEntityInTree(e.children, id);
    if (found) return found;
  }
  return null;
}

/** Find entity by id in tree, or in the prefab entity if editing a prefab */
export function findEntityAnywhere(
  state: { scene: Scene; editingPrefabEntity: Entity | null },
  id: string,
): Entity | null {
  if (state.editingPrefabEntity) {
    const found = findEntityInTree([state.editingPrefabEntity], id);
    if (found) return found;
  }
  return findEntityInTree(state.scene.entities, id);
}

/** Remove entity from its current parent or top-level list */
export function detachEntity(scene: Scene, entityId: string): Entity | null {
  const idx = scene.entities.findIndex(e => e.id === entityId);
  if (idx !== -1) {
    const [entity] = scene.entities.splice(idx, 1);
    entity.parent = null;
    return entity;
  }
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

/** Collect all entities (depth-first) */
export function collectAllEntities(entities: Entity[]): Entity[] {
  const result: Entity[] = [];
  for (const e of entities) {
    result.push(e);
    result.push(...collectAllEntities(e.children));
  }
  return result;
}
