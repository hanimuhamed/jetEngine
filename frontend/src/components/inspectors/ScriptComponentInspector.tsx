// components/inspectors/ScriptComponentInspector.tsx
import { useCallback } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { ScriptComponent } from '../../engine/components/ScriptComponent';

export function ScriptComponentInspector({ entityId, componentId }: { entityId: string; componentId: string }) {
  const entities = useEngineStore(s => s.entities);
  const setEditingScript = useEngineStore(s => s.setEditingScript);
  const updateComponentById = useEngineStore(s => s.updateComponentById);
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
  const script = entity?.getComponentById<ScriptComponent>(componentId);
  if (!script) return null;

  const handleRename = useCallback((newName: string) => {
    updateComponentById(entityId, componentId, (comp) => {
      (comp as ScriptComponent).scriptName = newName;
    });
  }, [entityId, componentId, updateComponentById]);

  return (
    <div className="inspector-fields">
      <div className="field-group">
        <label className="field-group-label">Script Name</label>
        <input
          type="text"
          className="inspector-text-input"
          value={script.scriptName}
          onChange={(e) => handleRename(e.target.value)}
        />
      </div>
      <button
        className="inspector-open-script-btn"
        onClick={() => setEditingScript(entityId, componentId)}
      >
        ✏️ Open in Script Editor
      </button>
    </div>
  );
}
