// components/inspectors/SpriteRendererInspector.tsx
import { useCallback } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { SpriteRenderer } from '../../engine/components/SpriteRenderer';
import type { ShapeType } from '../../engine/components/SpriteRenderer';
import DraggableNumber from '../../io/draggableNumber';
import type { Entity } from '../../engine/core/Entity';

const SHAPE_OPTIONS: ShapeType[] = ['rectangle', 'circle', 'triangle', 'sprite'];

/** Find entity in nested tree */
function findInTree(list: Entity[], id: string): Entity | undefined {
  for (const e of list) {
    if (e.id === id) return e;
    const found = findInTree(e.children, id);
    if (found) return found;
  }
  return undefined;
}

export function SpriteRendererInspector({ entityId }: { entityId: string }) {
  const updateComponent = useEngineStore(s => s.updateComponent);
  const entities = useEngineStore(s => s.entities);
  const _tick = useEngineStore(s => s._tick);
  void _tick;

  const entity = findInTree(entities, entityId);
  const sprite = entity?.getComponent<SpriteRenderer>('SpriteRenderer');
  if (!sprite) return null;

  const update = useCallback((updater: (s: SpriteRenderer) => void) => {
    updateComponent(entityId, 'SpriteRenderer', (comp) => {
      updater(comp as SpriteRenderer);
    });
  }, [entityId, updateComponent]);

  return (
    <div className="inspector-fields">
      <div className="field-group">
        <label className="field-group-label">Shape</label>
        <select
          className="inspector-select"
          value={sprite.shapeType}
          onChange={(e) => update(s => { s.shapeType = e.target.value as ShapeType; })}
        >
          {SHAPE_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="field-group">
        <label className="field-group-label">Color</label>
        <div className="field-row">
          <input
            type="color"
            className="inspector-color"
            value={sprite.color}
            onChange={(e) => update(s => { s.color = e.target.value; })}
          />
          <input
            type="text"
            className="inspector-text-input"
            value={sprite.color}
            onChange={(e) => update(s => { s.color = e.target.value; })}
          />
        </div>
      </div>

      <div className="field-group">
        <label className="field-group-label">Size</label>
        <div className="field-row">
          <DraggableNumber label="W" value={sprite.width} onChange={(v) => update(s => { s.width = v; })} />
          <DraggableNumber label="H" value={sprite.height} onChange={(v) => update(s => { s.height = v; })} />
        </div>
      </div>

      <div className="field-group">
        <label className="field-group-label">Layer</label>
        <DraggableNumber value={sprite.layer} onChange={(v) => update(s => { s.layer = Math.round(v); })} />
      </div>

      <div className="field-group">
        <label className="field-group-label">Visible</label>
        <input
          type="checkbox"
          checked={sprite.visible}
          onChange={(e) => update(s => { s.visible = e.target.checked; })}
        />
      </div>

      {sprite.shapeType === 'sprite' && (
        <div className="field-group">
          <label className="field-group-label">Sprite URL</label>
          <input
            type="text"
            className="inspector-text-input"
            value={sprite.spriteUrl}
            placeholder="Image URL..."
            onChange={(e) => update(s => { s.loadImage(e.target.value); })}
          />
        </div>
      )}
    </div>
  );
}
