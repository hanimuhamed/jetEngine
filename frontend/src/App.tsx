import "./index.css";
import { TopBar } from "./components/header/TopBar";
import { EditorLayout } from "./components/editor/EditorLayout";
import { ScriptLayout } from "./components/editor/script/ScriptLayout";
import { useEngineStore } from "./store/engineStore";

export default function App() {
  const editingScriptEntityId = useEngineStore(s => s.editingScriptEntityId);
  const editingScriptAssetId = useEngineStore(s => s.editingScriptAssetId);

  return (
    <div className="app-root">
      <TopBar />
      {(editingScriptEntityId || editingScriptAssetId) ? <ScriptLayout /> : <EditorLayout />}
      <div className="footer">jetEngine v0.1.0 — 2D Game Engine</div>
    </div>
  );
}

