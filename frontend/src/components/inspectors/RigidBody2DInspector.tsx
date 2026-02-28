// components/inspectors/RigidBody2DInspector.tsx
import { useCallback } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { RigidBody2D } from '../../engine/components/RigidBody2D';
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

export function RigidBody2DInspector({ entityId }: { entityId: string }) {
  const updateComponent = useEngineStore(s => s.updateComponent);
  const entities = useEngineStore(s => s.entities);
  const _tick = useEngineStore(s => s._tick);
  void _tick;

  const entity = findInTree(entities, entityId);
  const rb = entity?.getComponent<RigidBody2D>('RigidBody2D');
  if (!rb) return null;

  const update = useCallback((updater: (r: RigidBody2D) => void) => {
    updateComponent(entityId, 'RigidBody2D', (comp) => {
      updater(comp as RigidBody2D);
    });
  }, [entityId, updateComponent]);

  return (
    <div className="inspector-fields">
      <div className="field-group">
        <label className="field-group-label">Mass</label>
        <DraggableNumber value={rb.mass} onChange={(v) => update(r => { r.mass = v; })} />
      </div>

      <div className="field-group">
        <label className="field-group-label">Gravity Scale</label>
        <DraggableNumber value={rb.gravityScale} onChange={(v) => update(r => { r.gravityScale = v; })} />
      </div>

      <div className="field-group">
        <label className="field-group-label">Velocity</label>
        <div className="field-row">
          <DraggableNumber label="X" value={rb.velocity.x} onChange={(v) => update(r => { r.velocity.x = v; })} />
          <DraggableNumber label="Y" value={rb.velocity.y} onChange={(v) => update(r => { r.velocity.y = v; })} />
        </div>
      </div>

      <div className="field-group">
        <label className="field-group-label">Drag</label>
        <DraggableNumber value={rb.drag} onChange={(v) => update(r => { r.drag = v; })} />
      </div>

      <div className="field-group">
        <label className="field-group-label">Bounciness</label>
        <DraggableNumber value={rb.bounciness} onChange={(v) => update(r => { r.bounciness = v; })} />
      </div>

      <div className="field-group">
        <label className="field-group-label">Is Kinematic</label>
        <input
          type="checkbox"
          checked={rb.isKinematic}
          onChange={(e) => update(r => { r.isKinematic = e.target.checked; })}
        />
      </div>
    </div>
  );
}
