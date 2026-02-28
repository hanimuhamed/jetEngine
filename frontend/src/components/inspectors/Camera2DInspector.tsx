// components/inspectors/Camera2DInspector.tsx
import { useCallback } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { Camera2DComponent } from '../../engine/components/Camera2DComponent';
import DraggableNumber from '../../io/draggableNumber';

export function Camera2DInspector({ entityId }: { entityId: string }) {
  const updateComponent = useEngineStore(s => s.updateComponent);
  const entities = useEngineStore(s => s.entities);
  const assets = useEngineStore(s => s.assets);
  const _tick = useEngineStore(s => s._tick);
  void _tick;

  // Find entity in tree
  const findEntity = (list: typeof entities, id: string): typeof entities[number] | undefined => {
    for (const e of list) {
      if (e.id === id) return e;
      const found = findEntity(e.children, id);
      if (found) return found;
    }
    return undefined;
  };

  const entity = findEntity(entities, entityId);
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
