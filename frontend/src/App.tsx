import "./index.css";
import Panel from "./components/Panel";
import ScriptEditor from "./components/editor/ScriptEditor";
import ConsolePanel from "./components/editor/ConsolePanel";
import { TopBar } from "./components/TopBar";
import { EditorLayout } from "./components/EditorLayout";
import { useEngineStore } from "./store/engineStore";

export default function App() {
  const editingScriptEntityId = useEngineStore(s => s.editingScriptEntityId);
  const editingScriptAssetId = useEngineStore(s => s.editingScriptAssetId);

  const isScriptEditing = editingScriptEntityId || editingScriptAssetId;

  return (
    <div className="app-root">
      <TopBar />

      {isScriptEditing ? (
        <div className="script-fullscreen-container">
          <Panel title="SCRIPT EDITOR" className="script-fullscreen-editor" style={{ flex: 3 }}>
            <ScriptEditor />
          </Panel>
          <div className="divider vertical" />
          <Panel title="CONSOLE" className="script-fullscreen-console" style={{ flex: 1 }}>
            <ConsolePanel />
          </Panel>
        </div>
      ) : (
        <EditorLayout />
      )}

      <div className="footer">
        jetEngine v0.1.0 — 2D Game Engine
      </div>
    </div>
  );
}

