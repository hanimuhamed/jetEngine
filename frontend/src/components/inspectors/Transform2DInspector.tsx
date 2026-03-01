// components/inspectors/Transform2DInspector.tsx
import { useCallback } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { Transform2D } from '../../engine/components/Transform2D';
import DraggableNumber from '../../io/draggableNumber';
import type { Entity } from '../../engine/core/Entity';

/** Find entity in nested tree */
function findInTree(list: Entity[], id: string): Entity | undefined {
  for (const e of list) {
    if (e.id === id) return e;
    const found = findInTree(e.children, id);
    if (found) return found;
  }
  return undefined;
}

/** Find entity in scene entities or prefab entity */
function findEntityAnywhere(entities: Entity[], prefabEntity: Entity | null, id: string): Entity | undefined {
  if (prefabEntity) {
    const found = findInTree([prefabEntity], id);
    if (found) return found;
  }
  return findInTree(entities, id);
}

export function Transform2DInspector({ entityId }: { entityId: string }) {
  const updateComponent = useEngineStore(s => s.updateComponent);
  const entities = useEngineStore(s => s.entities);
  const editingPrefabEntity = useEngineStore(s => s.editingPrefabEntity);
  const _tick = useEngineStore(s => s._tick);
  void _tick;

  const entity = findEntityAnywhere(entities, editingPrefabEntity, entityId);
  const transform = entity?.getComponent<Transform2D>('Transform2D');
  if (!transform) return null;

  const update = useCallback((field: string, value: number) => {
    updateComponent(entityId, 'Transform2D', (comp) => {
      const t = comp as Transform2D;
      switch (field) {
        case 'x': t.position.x = value; break;
        case 'y': t.position.y = value; break;
        case 'rotation': t.rotation = value; break;
        case 'scaleX': t.scale.x = value; break;
        case 'scaleY': t.scale.y = value; break;
      }
    });
  }, [entityId, updateComponent]);

  return (
    <div className="inspector-fields">
      <div className="field-group">
        <label className="field-group-label">Position</label>
        <div className="field-row">
          <DraggableNumber label="X" value={transform.position.x} onChange={(v) => update('x', v)} />
          <DraggableNumber label="Y" value={transform.position.y} onChange={(v) => update('y', v)} />
        </div>
      </div>
      <div className="field-group">
        <label className="field-group-label">Rotation</label>
        <div className="field-row">
          <DraggableNumber label="°" value={transform.rotation} onChange={(v) => update('rotation', v)} />
        </div>
      </div>
      <div className="field-group">
        <label className="field-group-label">Scale</label>
        <div className="field-row">
          <DraggableNumber label="X" value={transform.scale.x} onChange={(v) => update('scaleX', v)} />
          <DraggableNumber label="Y" value={transform.scale.y} onChange={(v) => update('scaleY', v)} />
        </div>
      </div>
    </div>
  );
}
