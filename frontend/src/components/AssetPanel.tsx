// components/AssetPanel.tsx
import { useCallback } from 'react';
import { useEngineStore } from '../store/engineStore';
import { SpriteRenderer } from '../engine/components/SpriteRenderer';

function AssetPanel() {
  const assets = useEngineStore(s => s.assets);
  const addAsset = useEngineStore(s => s.addAsset);
  const removeAsset = useEngineStore(s => s.removeAsset);
  const selectedEntityId = useEngineStore(s => s.selectedEntityId);
  const updateComponent = useEngineStore(s => s.updateComponent);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        addAsset(file.name, url);
      }
    }
  }, [addAsset]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleAssetClick = useCallback((url: string) => {
    if (!selectedEntityId) return;
    updateComponent(selectedEntityId, 'SpriteRenderer', (comp) => {
      const sr = comp as SpriteRenderer;
      sr.shapeType = 'sprite';
      sr.loadImage(url);
    });
  }, [selectedEntityId, updateComponent]);

  return (
    <div
      className="asset-panel"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {assets.length === 0 ? (
        <div className="asset-panel-empty">
          Drop image files here to import assets
        </div>
      ) : (
        <div className="asset-grid">
          {assets.map(asset => (
            <div
              key={asset.id}
              className="asset-item"
              onClick={() => handleAssetClick(asset.url)}
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
      )}
    </div>
  );
}

export default AssetPanel;
