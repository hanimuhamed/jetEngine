// components/inspectors/Collider2DInspector.tsx
import { useCallback } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { Collider2D } from '../../engine/components/Collider2D';
import type { ColliderShape } from '../../engine/components/Collider2D';
import { Vec2 } from '../../engine/core/Math2D';
import DraggableNumber from '../DraggableNumber';
import type { Entity } from '../../engine/core/Entity';

const SHAPE_OPTIONS: ColliderShape[] = ['box', 'circle', 'polygon'];

/** Find entity in nested tree */
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

export function Collider2DInspector({ entityId }: { entityId: string }) {
  const updateComponent = useEngineStore(s => s.updateComponent);
  const entities = useEngineStore(s => s.entities);
  const editingPrefabEntity = useEngineStore(s => s.editingPrefabEntity);
  const _tick = useEngineStore(s => s._tick);
  void _tick;

  const entity = findEntityAnywhere(entities, editingPrefabEntity, entityId);
  const collider = entity?.getComponent<Collider2D>('Collider2D');
  if (!collider) return null;

  const update = useCallback((updater: (c: Collider2D) => void) => {
    updateComponent(entityId, 'Collider2D', (comp) => {
      updater(comp as Collider2D);
    });
  }, [entityId, updateComponent]);

  const addPoint = () => {
    update(c => {
      c.points = [...c.points, new Vec2(0, 0)];
    });
  };

  const removePoint = (idx: number) => {
    update(c => {
      c.points = c.points.filter((_, i) => i !== idx);
    });
  };

  const updatePoint = (idx: number, axis: 'x' | 'y', val: number) => {
    update(c => {
      const pts = [...c.points];
      pts[idx] = new Vec2(
        axis === 'x' ? val : pts[idx].x,
        axis === 'y' ? val : pts[idx].y
      );
      c.points = pts;
    });
  };

  return (
    <div className="inspector-fields">
      <div className="field-group">
        <label className="field-group-label">Shape</label>
        <select
          className="inspector-select"
          value={collider.shape}
          onChange={(e) => update(c => { c.shape = e.target.value as ColliderShape; })}
        >
          {SHAPE_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {collider.shape === 'box' && (
        <div className="field-group">
          <label className="field-group-label">Size</label>
          <div className="field-row">
            <DraggableNumber label="W" value={collider.width} onChange={(v) => update(c => { c.width = v; })} />
            <DraggableNumber label="H" value={collider.height} onChange={(v) => update(c => { c.height = v; })} />
          </div>
        </div>
      )}

      {collider.shape === 'circle' && (
        <div className="field-group">
          <label className="field-group-label">Radius</label>
          <DraggableNumber value={collider.radius} onChange={(v) => update(c => { c.radius = v; })} />
        </div>
      )}

      {collider.shape === 'polygon' && (
        <div className="field-group">
          <label className="field-group-label">Points</label>
          {collider.points.map((pt, idx) => (
            <div key={idx} className="field-row" style={{ marginBottom: 4 }}>
              <DraggableNumber label="X" value={pt.x} onChange={(v) => updatePoint(idx, 'x', v)} />
              <DraggableNumber label="Y" value={pt.y} onChange={(v) => updatePoint(idx, 'y', v)} />
              <button
                className="inspector-remove-point-btn"
                onClick={() => removePoint(idx)}
                title="Remove point"
              >✕</button>
            </div>
          ))}
          <button className="inspector-add-point-btn" onClick={addPoint}>
            + Add Point
          </button>
        </div>
      )}

      <div className="field-group">
        <label className="field-group-label">Offset</label>
        <div className="field-row">
          <DraggableNumber label="X" value={collider.offset.x} onChange={(v) => update(c => { c.offset.x = v; })} />
          <DraggableNumber label="Y" value={collider.offset.y} onChange={(v) => update(c => { c.offset.y = v; })} />
        </div>
      </div>

      <div className="field-group">
        <label className="field-group-label">Is Trigger</label>
        <input
          type="checkbox"
          checked={collider.isTrigger}
          onChange={(e) => update(c => { c.isTrigger = e.target.checked; })}
        />
      </div>

      <div className="field-group">
        <label className="field-group-label">Show Hitbox</label>
        <input
          type="checkbox"
          checked={collider.showHitbox}
          onChange={(e) => update(c => { c.showHitbox = e.target.checked; })}
        />
      </div>
    </div>
  );
}
