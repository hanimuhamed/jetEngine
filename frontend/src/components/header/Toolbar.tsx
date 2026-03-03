// components/Toolbar.tsx
import { useCallback, useRef } from 'react';
import { useEngineStore } from '../../store/engineStore';

function Toolbar() {
  const engineState = useEngineStore(s => s.engineState);
  const play = useEngineStore(s => s.play);
  const pause = useEngineStore(s => s.pause);
  const stop = useEngineStore(s => s.stop);
  const editingPrefabId = useEngineStore(s => s.editingPrefabId);
  const editingScriptEntityId = useEngineStore(s => s.editingScriptEntityId);
  const setEditingScript = useEngineStore(s => s.setEditingScript);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePlay = () => {
    // Close script editor when play is clicked
    if (editingScriptEntityId) {
      setEditingScript(null);
    }
    play();
  };

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        {engineState === 'PLAYING' ? (
          <button className="toolbar-btn" onClick={pause} title="Pause">⏸</button>
        ) : (
          <button className="toolbar-btn toolbar-btn-play" onClick={handlePlay} title="Play" disabled={!!editingPrefabId}>▶</button>
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
    </div>
  );
}

export default Toolbar;
