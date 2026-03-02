// components/AssetPanel.tsx
import { useCallback, useRef } from 'react';
import { useEngineStore } from '../store/engineStore';
import { SpriteRenderer } from '../engine/components/SpriteRenderer';

/** Convert a File to a base64 data URL */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function AssetPanel() {
  const assets = useEngineStore(s => s.assets);
  const addAsset = useEngineStore(s => s.addAsset);
  const addPrefabAsset = useEngineStore(s => s.addPrefabAsset);
  const addScriptAsset = useEngineStore(s => s.addScriptAsset);
  const removeAsset = useEngineStore(s => s.removeAsset);
  const selectedEntityId = useEngineStore(s => s.selectedEntityId);
  const updateComponent = useEngineStore(s => s.updateComponent);
  const startEditingPrefab = useEngineStore(s => s.startEditingPrefab);
  const setEditingScriptAsset = useEngineStore(s => s.setEditingScriptAsset);
  const engineState = useEngineStore(s => s.engineState);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleAddScript = useCallback(() => {
    const name = prompt('Script asset name:', 'NewScript');
    if (!name) return;
    const template = `// Script asset: ${name}\n// Entities can reference this script by name.\n\nfunction onStart() {\n  // Called once when the scene starts\n}\n\nfunction onUpdate(deltaTime) {\n  // Called every frame\n}\n\nfunction onCollision(other) {\n  // Called on collision\n}\n\nfunction onDestroy() {\n  // Called when entity is destroyed\n}\n`;
    addScriptAsset(name, template);
  }, [addScriptAsset]);

  const handleAddImage = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleImageFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    addAsset(file.name, base64, base64);
    e.target.value = '';
  }, [addAsset]);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if this is an entity drag from hierarchy (prefab creation)
    const entityJson = e.dataTransfer.getData('application/jet-entity-json');
    const entityName = e.dataTransfer.getData('application/jet-entity-name');
    if (entityJson && entityName) {
      const existing = assets.find(a => a.type === 'prefab' && a.name === entityName);
      if (existing) {
        removeAsset(existing.id);
        addPrefabAsset(entityName, entityJson);
      } else {
        addPrefabAsset(entityName, entityJson);
      }
      return;
    }

    // Handle file drops (images + script files)
    const files = e.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        // Convert to base64 for save/load portability
        const base64 = await fileToBase64(file);
        addAsset(file.name, base64, base64);
      } else if (file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.txt')) {
        // Script file
        const text = await file.text();
        const name = file.name.replace(/\.(js|ts|txt)$/, '');
        addScriptAsset(name, text);
      }
    }
  }, [addAsset, addPrefabAsset, addScriptAsset, removeAsset, assets]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleAssetClick = useCallback((asset: typeof assets[number]) => {
    if (asset.type === 'prefab') {
      if (engineState === 'EDITING') {
        startEditingPrefab(asset.id);
      }
      return;
    }
    if (asset.type === 'script') {
      // Open script asset in the script editor
      setEditingScriptAsset(asset.id);
      return;
    }
    if (!selectedEntityId) return;
    updateComponent(selectedEntityId, 'SpriteRenderer', (comp) => {
      const sr = comp as SpriteRenderer;
      sr.shapeType = 'sprite';
      sr.loadImage(asset.url);
    });
  }, [selectedEntityId, updateComponent, engineState, startEditingPrefab, setEditingScriptAsset]);

  // Drag prefab from asset panel
  const handlePrefabDragStart = useCallback((e: React.DragEvent, asset: typeof assets[number]) => {
    if (asset.type !== 'prefab' || !asset.prefabJson) return;
    e.dataTransfer.setData('application/jet-prefab-name', asset.name);
    e.dataTransfer.setData('application/jet-prefab-json', asset.prefabJson);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const imageAssets = assets.filter(a => a.type === 'image');
  const prefabAssets = assets.filter(a => a.type === 'prefab');
  const scriptAssets = assets.filter(a => a.type === 'script');

  return (
    <div
      className="asset-panel"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageFileChange}
      />
      <div className="asset-actions">
        <button className="hierarchy-btn" onClick={handleAddScript} title="New Script Asset">
          + Script
        </button>
        <button className="hierarchy-btn" onClick={handleAddImage} title="Add Image Asset">
          + Image
        </button>
      </div>
      {assets.length === 0 ? (
        <div className="asset-panel-empty">
          Drop image/script files here to import assets<br/>
          or drag entities from Hierarchy to create prefabs.
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
                    title={`Prefab: ${asset.name}\nClick to edit • Drag to Hierarchy to spawn`}
                    onClick={() => handleAssetClick(asset)}
                    draggable
                    onDragStart={(e) => handlePrefabDragStart(e, asset)}
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
          {scriptAssets.length > 0 && (
            <div className="asset-section">
              <div className="asset-section-title">Scripts</div>
              <div className="asset-grid">
                {scriptAssets.map(asset => (
                  <div
                    key={asset.id}
                    className="asset-item script-item"
                    title={`Script: ${asset.name}\nClick to open in Script Editor`}
                    onClick={() => handleAssetClick(asset)}
                  >
                    <div className="prefab-icon">📜</div>
                    <span className="asset-name">{asset.name}</span>
                    <button
                      className="asset-remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAsset(asset.id);
                      }}
                      title="Remove script"
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
