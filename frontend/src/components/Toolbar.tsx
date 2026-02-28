// components/Toolbar.tsx
import { useCallback, useRef } from 'react';
import { useEngineStore } from '../store/engineStore';

function Toolbar() {
  const engineState = useEngineStore(s => s.engineState);
  const play = useEngineStore(s => s.play);
  const pause = useEngineStore(s => s.pause);
  const stop = useEngineStore(s => s.stop);
  const addEntity = useEngineStore(s => s.addEntity);
  const saveScene = useEngineStore(s => s.saveScene);
  const loadScene = useEngineStore(s => s.loadScene);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(() => {
    const json = saveScene();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scene.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [saveScene]);

  const handleLoad = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      loadScene(reader.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [loadScene]);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        {engineState === 'PLAYING' ? (
          <button className="toolbar-btn" onClick={pause} title="Pause">⏸</button>
        ) : (
          <button className="toolbar-btn toolbar-btn-play" onClick={play} title="Play">▶</button>
        )}
        <button
          className="toolbar-btn toolbar-btn-stop"
          onClick={stop}
          title="Stop"
          disabled={engineState === 'EDITING'}
        >
          ⏹
        </button>
      </div>

      <div className="toolbar-state">
        <span className={`state-badge state-${engineState.toLowerCase()}`}>
          {engineState}
        </span>
      </div>

      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={() => addEntity()} title="Add Entity">
          + Entity
        </button>
        <button className="toolbar-btn" onClick={handleSave} title="Save Scene">
          💾 Save
        </button>
        <button className="toolbar-btn" onClick={handleLoad} title="Load Scene">
          📂 Load
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}

export default Toolbar;
