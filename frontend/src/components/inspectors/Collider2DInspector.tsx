// components/inspectors/Collider2DInspector.tsx
import { useCallback } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { Collider2D } from '../../engine/components/Collider2D';
import DraggableNumber from '../../io/draggableNumber';

export function Collider2DInspector({ entityId }: { entityId: string }) {
  const updateComponent = useEngineStore(s => s.updateComponent);
  const entities = useEngineStore(s => s.entities);
  const _tick = useEngineStore(s => s._tick);
  void _tick;

  const entity = entities.find(e => e.id === entityId);
  const collider = entity?.getComponent<Collider2D>('Collider2D');
  if (!collider) return null;

  const update = useCallback((updater: (c: Collider2D) => void) => {
    updateComponent(entityId, 'Collider2D', (comp) => {
      updater(comp as Collider2D);
    });
  }, [entityId, updateComponent]);

  return (
    <div className="inspector-fields">
      <div className="field-group">
        <label className="field-group-label">Size</label>
        <div className="field-row">
          <DraggableNumber label="W" value={collider.width} onChange={(v) => update(c => { c.width = v; })} />
          <DraggableNumber label="H" value={collider.height} onChange={(v) => update(c => { c.height = v; })} />
        </div>
      </div>

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
    </div>
  );
}
