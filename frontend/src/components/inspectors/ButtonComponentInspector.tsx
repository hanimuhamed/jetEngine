// components/inspectors/ButtonComponentInspector.tsx
import { useCallback } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { ButtonComponent } from '../../engine/components/ButtonComponent';
import type { ButtonShape } from '../../engine/components/ButtonComponent';
import DraggableNumber from '../DraggableNumber';
import type { Entity } from '../../engine/core/Entity';

function findInTree(list: Entity[], id: string): Entity | undefined {
  for (const e of list) {
    if (e.id === id) return e;
    const found = findInTree(e.children, id);
    if (found) return found;
  }
  return undefined;
}

function findEntityAnywhere(entities: Entity[], prefabEntity: Entity | null, id: string): Entity | undefined {
  if (prefabEntity) {
    const found = findInTree([prefabEntity], id);
    if (found) return found;
  }
  return findInTree(entities, id);
}

const SHAPE_OPTIONS: ButtonShape[] = ['box', 'circle'];

export function ButtonComponentInspector({ entityId }: { entityId: string }) {
  const updateComponent = useEngineStore(s => s.updateComponent);
  const entities = useEngineStore(s => s.entities);
  const editingPrefabEntity = useEngineStore(s => s.editingPrefabEntity);
  const _tick = useEngineStore(s => s._tick);
  void _tick;

  const entity = findEntityAnywhere(entities, editingPrefabEntity, entityId);
  const btn = entity?.getComponent<ButtonComponent>('ButtonComponent');
  if (!btn) return null;

  const update = useCallback((updater: (c: ButtonComponent) => void) => {
    updateComponent(entityId, 'ButtonComponent', (comp) => {
      updater(comp as ButtonComponent);
    });
  }, [entityId, updateComponent]);

  return (
    <div className="inspector-fields">
      <div className="field-group">
        <label className="field-group-label">Shape</label>
        <select
          className="inspector-select"
          value={btn.shape}
          onChange={(e) => update(c => { c.shape = e.target.value as ButtonShape; })}
        >
          {SHAPE_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {btn.shape === 'box' && (
        <>
          <div className="field-group">
            <label className="field-group-label">Size</label>
            <div className="field-row">
              <DraggableNumber label="W" value={btn.width} onChange={(v) => update(c => { c.width = v; })} />
              <DraggableNumber label="H" value={btn.height} onChange={(v) => update(c => { c.height = v; })} />
            </div>
          </div>
        </>
      )}

      {btn.shape === 'circle' && (
        <div className="field-group">
          <label className="field-group-label">Radius</label>
          <DraggableNumber value={btn.radius} onChange={(v) => update(c => { c.radius = v; })} />
        </div>
      )}

      <div className="field-group">
        <label className="field-group-label">Offset</label>
        <div className="field-row">
          <DraggableNumber label="X" value={btn.offset.x} onChange={(v) => update(c => { c.offset.x = v; })} />
          <DraggableNumber label="Y" value={btn.offset.y} onChange={(v) => update(c => { c.offset.y = v; })} />
        </div>
      </div>

      <span className="inspector-hint">
        Calls onClick() in attached scripts when clicked during play.
      </span>
    </div>
  );
}
