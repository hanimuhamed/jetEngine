// components/inspectors/ScriptComponentInspector.tsx
import { useCallback } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { ScriptComponent } from '../../engine/components/ScriptComponent';
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

export function ScriptComponentInspector({ entityId, componentId }: { entityId: string; componentId: string }) {
  const entities = useEngineStore(s => s.entities);
  const editingPrefabEntity = useEngineStore(s => s.editingPrefabEntity);
  const setEditingScript = useEngineStore(s => s.setEditingScript);
  const updateComponentById = useEngineStore(s => s.updateComponentById);
  const _tick = useEngineStore(s => s._tick);
  void _tick;

  const entity = findEntityAnywhere(entities, editingPrefabEntity, entityId);
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
        Open in Script Editor
      </button>
    </div>
  );
}
