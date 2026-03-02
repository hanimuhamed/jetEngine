// components/inspectors/Collider2DInspector.tsx
import { useCallback } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { Collider2D } from '../../engine/components/Collider2D';
import type { ColliderShape } from '../../engine/components/Collider2D';
import { SpriteRenderer } from '../../engine/components/SpriteRenderer';
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

  const sprite = entity?.getComponent<SpriteRenderer>('SpriteRenderer');

  const update = useCallback((updater: (c: Collider2D) => void) => {
    updateComponent(entityId, 'Collider2D', (comp) => {
      updater(comp as Collider2D);
    });
  }, [entityId, updateComponent]);

  /** When switching to box collider on a polygon shape, auto-compute bounding box */
  const handleShapeChange = useCallback((newShape: ColliderShape) => {
    update(c => {
      c.shape = newShape;
      if (newShape === 'box' && sprite && sprite.shapeType === 'polygon' && sprite.polygonPoints.length >= 3) {
        // Compute axis-aligned bounding box of all polygon points
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const pt of sprite.polygonPoints) {
          if (pt.x < minX) minX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y > maxY) maxY = pt.y;
        }
        c.width = maxX - minX;
        c.height = maxY - minY;
        // Center the offset on the polygon center
        c.offset.x = (minX + maxX) / 2;
        c.offset.y = (minY + maxY) / 2;
      }
    });
  }, [update, sprite]);

  return (
    <div className="inspector-fields">
      <div className="field-group">
        <label className="field-group-label">Shape</label>
        <select
          className="inspector-select"
          value={collider.shape}
          onChange={(e) => handleShapeChange(e.target.value as ColliderShape)}
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
