// components/ScriptEditor.tsx — Monaco-based script editor
import { useCallback, useRef, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { useEngineStore } from '../store/engineStore';
import { ScriptComponent } from '../engine/components/ScriptComponent';

const SCRIPTING_TYPES = `
declare const entity: {
  id: string;
  name: string;
  getComponent(type: string): any;
  addComponent(type: string): void;
  destroy(): void;
};
declare const transform: {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
};
declare const input: {
  isKeyDown(key: string): boolean;
  isKeyPressed(key: string): boolean;
  isMouseButtonDown(button: number): boolean;
  getMousePosition(): { x: number; y: number };
};
declare const time: {
  deltaTime: number;
  elapsed: number;
  frameCount: number;
};
declare const scene: {
  getEntityByName(name: string): typeof entity | null;
  getAllEntities(): (typeof entity)[];
};
declare function onStart(): void;
declare function onUpdate(deltaTime: number): void;
declare function onDestroy(): void;
`;

function ScriptEditor() {
  const editingScriptEntityId = useEngineStore(s => s.editingScriptEntityId);
  const setEditingScript = useEngineStore(s => s.setEditingScript);
  const entities = useEngineStore(s => s.entities);
  const updateComponent = useEngineStore(s => s.updateComponent);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const sourceRef = useRef<string>('');

  const entity = editingScriptEntityId
    ? entities.find(e => e.id === editingScriptEntityId) ?? null
    : null;

  const script = entity?.getComponent<ScriptComponent>('ScriptComponent') ?? null;

  // Keep source in sync when script entity changes
  useEffect(() => {
    if (script) {
      sourceRef.current = script.scriptSource;
    }
  }, [script]);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor as typeof editorRef.current;

    // Add custom type definitions
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    monaco.languages.typescript.javascriptDefaults.addExtraLib(SCRIPTING_TYPES, 'ts:scripting.d.ts');
  }, []);

  const handleSave = useCallback(() => {
    if (!editingScriptEntityId || !script) return;
    updateComponent(editingScriptEntityId, 'ScriptComponent', (comp) => {
      (comp as ScriptComponent).scriptSource = sourceRef.current;
    });
  }, [editingScriptEntityId, script, updateComponent]);

  if (!entity || !script) {
    return (
      <div className="script-editor">
        <div className="script-editor-empty">
          No script selected. Select an entity with a ScriptComponent and click "Open in Script Editor".
        </div>
      </div>
    );
  }

  return (
    <div className="script-editor">
      <div className="script-editor-header">
        <span className="script-editor-title">
          📝 {script.scriptName} — {entity.name}
        </span>
        <div className="script-editor-actions">
          <button className="toolbar-btn" onClick={handleSave}>💾 Save</button>
          <button className="toolbar-btn" onClick={() => setEditingScript(null)}>✕ Close</button>
        </div>
      </div>
      <div className="script-editor-body">
        <Editor
          height="100%"
          language="javascript"
          theme="vs-dark"
          defaultValue={script.scriptSource}
          onChange={(value) => {
            sourceRef.current = value ?? '';
          }}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: 'Space Mono, monospace',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
}

export default ScriptEditor;
