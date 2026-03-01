// components/inspectors/Camera2DInspector.tsx
import { useCallback } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { Camera2DComponent } from '../../engine/components/Camera2DComponent';
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

function findEntityAnywhere(entities: Entity[], prefabEntity: Entity | null, id: string): Entity | undefined {
  if (prefabEntity) {
    const found = findInTree([prefabEntity], id);
    if (found) return found;
  }
  return findInTree(entities, id);
}

export function Camera2DInspector({ entityId }: { entityId: string }) {
  const updateComponent = useEngineStore(s => s.updateComponent);
  const entities = useEngineStore(s => s.entities);
  const editingPrefabEntity = useEngineStore(s => s.editingPrefabEntity);
  const assets = useEngineStore(s => s.assets);
  const _tick = useEngineStore(s => s._tick);
  void _tick;

  const entity = findEntityAnywhere(entities, editingPrefabEntity, entityId);
  const cam = entity?.getComponent<Camera2DComponent>('Camera2DComponent');
  if (!cam) return null;

  const update = useCallback((updater: (c: Camera2DComponent) => void) => {
    updateComponent(entityId, 'Camera2DComponent', (comp) => {
      updater(comp as Camera2DComponent);
    });
  }, [entityId, updateComponent]);

  return (
    <div className="inspector-fields">
      <div className="field-group">
        <label className="field-group-label">Zoom</label>
        <div className="field-row">
          <DraggableNumber label="Zoom" value={cam.zoom} onChange={(v) => update(c => { c.zoom = Math.max(0.1, Math.min(10, v)); })} />
        </div>
      </div>

      <div className="field-group">
        <label className="field-group-label">Background Color</label>
        <div className="field-row">
          <input
            type="color"
            className="inspector-color"
            value={cam.backgroundColor}
            onChange={(e) => update(c => { c.backgroundColor = e.target.value; })}
          />
          <input
            type="text"
            className="inspector-text-input"
            value={cam.backgroundColor}
            onChange={(e) => update(c => { c.backgroundColor = e.target.value; })}
          />
        </div>
      </div>

      <div className="field-group">
        <label className="field-group-label">Background Image</label>
        <input
          type="text"
          className="inspector-text-input"
          value={cam.backgroundImageUrl}
          placeholder="Image URL or drop asset..."
          onChange={(e) => update(c => { c.loadBackgroundImage(e.target.value); })}
        />
        {assets.length > 0 && (
          <select
            className="inspector-select"
            value=""
            onChange={(e) => {
              if (e.target.value) {
                update(c => { c.loadBackgroundImage(e.target.value); });
              }
            }}
          >
            <option value="">Select from assets...</option>
            {assets.map(asset => (
              <option key={asset.id} value={asset.url}>{asset.name}</option>
            ))}
          </select>
        )}
        {cam.backgroundImageUrl && (
          <button
            className="toolbar-btn"
            style={{ marginTop: 4, fontSize: 11 }}
            onClick={() => update(c => { c.loadBackgroundImage(''); c.backgroundImageUrl = ''; })}
          >
            ✕ Clear Image
          </button>
        )}
      </div>
    </div>
  );
}
