// components/inspectors/ScriptComponentInspector.tsx
import { useEngineStore } from '../../store/engineStore';
import { ScriptComponent } from '../../engine/components/ScriptComponent';

export function ScriptComponentInspector({ entityId }: { entityId: string }) {
  const entities = useEngineStore(s => s.entities);
  const setEditingScript = useEngineStore(s => s.setEditingScript);
  const _tick = useEngineStore(s => s._tick);
  void _tick;

  const entity = entities.find(e => e.id === entityId);
  const script = entity?.getComponent<ScriptComponent>('ScriptComponent');
  if (!script) return null;

  return (
    <div className="inspector-fields">
      <div className="field-group">
        <label className="field-group-label">Script Name</label>
        <span className="inspector-text-value">{script.scriptName}</span>
      </div>
      <button
        className="inspector-open-script-btn"
        onClick={() => setEditingScript(entityId)}
      >
        ✏️ Open in Script Editor
      </button>
    </div>
  );
}
