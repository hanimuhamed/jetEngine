// components/inspectors/ScriptComponentInspector.tsx
import { useCallback } from 'react';
import { useEngineStore } from '../../../store/engineStore';
import { ScriptComponent } from '../../../engine/components/ScriptComponent';
import type { Entity } from '../../../engine/core/Entity';

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
  const updateComponentById = useEngineStore(s => s.updateComponentById);
  const assets = useEngineStore(s => s.assets);
  const _tick = useEngineStore(s => s._tick);
  void _tick;

  const entity = findEntityAnywhere(entities, editingPrefabEntity, entityId);
  const script = entity?.getComponentById<ScriptComponent>(componentId);
  if (!script) return null;

  const scriptAssets = assets.filter(a => a.type === 'script');

  const handleAssetChange = useCallback((assetName: string) => {
    updateComponentById(entityId, componentId, (comp) => {
      const sc = comp as ScriptComponent;
      sc.scriptAssetName = assetName;
      sc.scriptName = assetName || 'InlineScript';
      // If linking to an asset, load its source
      if (assetName) {
        const asset = assets.find(a => a.type === 'script' && a.name === assetName);
        if (asset && asset.scriptSource) {
          sc.scriptSource = asset.scriptSource;
        }
      }
    });
  }, [entityId, componentId, updateComponentById, assets]);

  return (
    <div className="inspector-fields">
      <div className="field-group">
        <label className="field-group-label">Script Asset</label>
        <select
          className="inspector-select"
          value={script.scriptAssetName}
          onChange={(e) => handleAssetChange(e.target.value)}
        >
          <option value="">(None)</option>
          {scriptAssets.map(a => (
            <option key={a.id} value={a.name}>{a.name}</option>
          ))}
        </select>
        {scriptAssets.length === 0 && (
          <span className="inspector-hint">No script assets — create one in Assets panel</span>
        )}
      </div>
    </div>
  );
}
