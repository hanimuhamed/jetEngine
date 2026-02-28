// components/AssetPanel.tsx
import { useCallback } from 'react';
import { useEngineStore } from '../store/engineStore';
import { SpriteRenderer } from '../engine/components/SpriteRenderer';

function AssetPanel() {
  const assets = useEngineStore(s => s.assets);
  const addAsset = useEngineStore(s => s.addAsset);
  const addPrefabAsset = useEngineStore(s => s.addPrefabAsset);
  const removeAsset = useEngineStore(s => s.removeAsset);
  const selectedEntityId = useEngineStore(s => s.selectedEntityId);
  const updateComponent = useEngineStore(s => s.updateComponent);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if this is an entity drag from hierarchy (prefab creation)
    const entityJson = e.dataTransfer.getData('application/jet-entity-json');
    const entityName = e.dataTransfer.getData('application/jet-entity-name');
    if (entityJson && entityName) {
      // Check if prefab with this name already exists
      const existing = assets.find(a => a.type === 'prefab' && a.name === entityName);
      if (existing) {
        // Update existing prefab — remove old, add new
        removeAsset(existing.id);
        addPrefabAsset(entityName, entityJson);
      } else {
        addPrefabAsset(entityName, entityJson);
      }
      return;
    }

    // Otherwise, handle image file drops
    const files = e.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        addAsset(file.name, url);
      }
    }
  }, [addAsset, addPrefabAsset, removeAsset, assets]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleAssetClick = useCallback((asset: typeof assets[number]) => {
    if (asset.type === 'prefab') return; // prefabs are not assignable via click
    if (!selectedEntityId) return;
    updateComponent(selectedEntityId, 'SpriteRenderer', (comp) => {
      const sr = comp as SpriteRenderer;
      sr.shapeType = 'sprite';
      sr.loadImage(asset.url);
    });
  }, [selectedEntityId, updateComponent]);

  const imageAssets = assets.filter(a => a.type === 'image');
  const prefabAssets = assets.filter(a => a.type === 'prefab');

  return (
    <div
      className="asset-panel"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {assets.length === 0 ? (
        <div className="asset-panel-empty">
          Drop image files here to import assets<br/>
          or drag entities from Hierarchy to create prefabs
        </div>
      ) : (
        <div className="asset-sections">
          {prefabAssets.length > 0 && (
            <div className="asset-section">
              <div className="asset-section-title">Prefabs</div>
              <div className="asset-grid">
                {prefabAssets.map(asset => (
                  <div
                    key={asset.id}
                    className="asset-item prefab-item"
                    title={`Prefab: ${asset.name}\nUse assets.spawn("${asset.name}", x, y) in scripts`}
                  >
                    <div className="prefab-icon">📦</div>
                    <span className="asset-name">{asset.name}</span>
                    <button
                      className="asset-remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAsset(asset.id);
                      }}
                      title="Remove prefab"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {imageAssets.length > 0 && (
            <div className="asset-section">
              <div className="asset-section-title">Images</div>
              <div className="asset-grid">
                {imageAssets.map(asset => (
                  <div
                    key={asset.id}
                    className="asset-item"
                    onClick={() => handleAssetClick(asset)}
                    title={`Click to assign to selected entity\n${asset.name}`}
                  >
                    <img src={asset.url} alt={asset.name} className="asset-thumb" />
                    <span className="asset-name">{asset.name}</span>
                    <button
                      className="asset-remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAsset(asset.id);
                      }}
                      title="Remove asset"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AssetPanel;
