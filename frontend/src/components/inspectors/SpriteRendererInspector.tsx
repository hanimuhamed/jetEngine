// components/inspectors/SpriteRendererInspector.tsx
import { useCallback } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { SpriteRenderer, defaultPentagonPoints } from '../../engine/components/SpriteRenderer';
import type { ShapeType } from '../../engine/components/SpriteRenderer';
import { Vec2 } from '../../engine/core/Math2D';
import DraggableNumber from '../DraggableNumber';
import { ColorPicker } from '../ColorPicker';
import type { Entity } from '../../engine/core/Entity';

const SHAPE_OPTIONS: ShapeType[] = ['rectangle', 'circle', 'triangle', 'polygon', 'sprite'];

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

export function SpriteRendererInspector({ entityId }: { entityId: string }) {
  const updateComponent = useEngineStore(s => s.updateComponent);
  const entities = useEngineStore(s => s.entities);
  const editingPrefabEntity = useEngineStore(s => s.editingPrefabEntity);
  const assets = useEngineStore(s => s.assets);
  const _tick = useEngineStore(s => s._tick);
  void _tick;

  const entity = findEntityAnywhere(entities, editingPrefabEntity, entityId);
  const sprite = entity?.getComponent<SpriteRenderer>('SpriteRenderer');
  if (!sprite) return null;

  const imageAssets = assets.filter(a => a.type === 'image');

  const update = useCallback((updater: (s: SpriteRenderer) => void) => {
    updateComponent(entityId, 'SpriteRenderer', (comp) => {
      updater(comp as SpriteRenderer);
    });
  }, [entityId, updateComponent]);

  const handleShapeChange = useCallback((newShape: ShapeType) => {
    update(s => {
      s.shapeType = newShape;
      // When switching to polygon, auto-fill with star if empty
      if (newShape === 'polygon' && s.polygonPoints.length < 3) {
        s.polygonPoints = defaultPentagonPoints();
      }
    });
  }, [update]);

  const addPoint = () => {
    update(s => {
      s.polygonPoints = [...s.polygonPoints, new Vec2(0, 0)];
    });
  };

  const removePoint = (idx: number) => {
    update(s => {
      // Enforce minimum 3 points
      if (s.polygonPoints.length <= 3) return;
      s.polygonPoints = s.polygonPoints.filter((_, i) => i !== idx);
    });
  };

  const updatePoint = (idx: number, axis: 'x' | 'y', val: number) => {
    update(s => {
      const pts = [...s.polygonPoints];
      pts[idx] = new Vec2(
        axis === 'x' ? val : pts[idx].x,
        axis === 'y' ? val : pts[idx].y
      );
      s.polygonPoints = pts;
    });
  };

  return (
    <div className="inspector-fields">
      <div className="field-group">
        <label className="field-group-label">Shape</label>
        <select
          className="inspector-select"
          value={sprite.shapeType}
          onChange={(e) => handleShapeChange(e.target.value as ShapeType)}
        >
          {SHAPE_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="field-group">
        <label className="field-group-label">Color</label>
        <ColorPicker
          color={sprite.color}
          onChange={(c) => update(s => { s.color = c; })}
        />
      </div>

      <div className="field-group">
        <label className="field-group-label">Size</label>
        <div className="field-row">
          <DraggableNumber label="W" value={sprite.width} onChange={(v) => update(s => { s.width = v; })} />
          <DraggableNumber label="H" value={sprite.height} onChange={(v) => update(s => { s.height = v; })} />
        </div>
      </div>

      {sprite.shapeType === 'polygon' && (
        <div className="field-group">
          <label className="field-group-label">Polygon Points</label>
          {sprite.polygonPoints.map((pt, idx) => (
            <div key={idx} className="field-row" style={{ marginBottom: 4 }}>
              <DraggableNumber label="X" value={pt.x} onChange={(v) => updatePoint(idx, 'x', v)} />
              <DraggableNumber label="Y" value={pt.y} onChange={(v) => updatePoint(idx, 'y', v)} />
              {sprite.polygonPoints.length > 3 && (
                <button
                  className="inspector-remove-point-btn"
                  onClick={() => removePoint(idx)}
                  title="Remove point"
                >✕</button>
              )}
            </div>
          ))}
          <button className="inspector-add-point-btn" onClick={addPoint}>
            + Add Point
          </button>
        </div>
      )}

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
          <label className="field-group-label">Sprite</label>
          {imageAssets.length > 0 ? (
            <select
              className="inspector-select"
              value={sprite.spriteUrl}
              onChange={(e) => update(s => { s.loadImage(e.target.value); })}
            >
              <option value="">(None)</option>
              {imageAssets.map(a => (
                <option key={a.id} value={a.url ?? a.base64 ?? ''}>{a.name}</option>
              ))}
            </select>
          ) : (
            <span className="inspector-hint">No image assets — add images in Assets panel</span>
          )}
        </div>
      )}
    </div>
  );
}
