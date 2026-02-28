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

/** Find entity in nested tree */
function findEntityInTree(entities: ReturnType<typeof useEngineStore.getState>['entities'], id: string): ReturnType<typeof useEngineStore.getState>['entities'][number] | undefined {
  for (const e of entities) {
    if (e.id === id) return e;
    const found = findEntityInTree(e.children, id);
    if (found) return found;
  }
  return undefined;
}

function ScriptEditor() {
  const editingScriptEntityId = useEngineStore(s => s.editingScriptEntityId);
  const editingScriptComponentId = useEngineStore(s => s.editingScriptComponentId);
  const setEditingScript = useEngineStore(s => s.setEditingScript);
  const entities = useEngineStore(s => s.entities);
  const updateComponentById = useEngineStore(s => s.updateComponentById);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const entity = editingScriptEntityId
    ? findEntityInTree(entities, editingScriptEntityId) ?? null
    : null;

  const script = entity && editingScriptComponentId
    ? entity.getComponentById<ScriptComponent>(editingScriptComponentId) ?? null
    : null;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor as typeof editorRef.current;

    // Add custom type definitions
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    monaco.languages.typescript.javascriptDefaults.addExtraLib(SCRIPTING_TYPES, 'ts:scripting.d.ts');
  }, []);

  // Auto-save with debounce
  const handleChange = useCallback((value: string | undefined) => {
    if (!editingScriptEntityId || !editingScriptComponentId) return;
    const src = value ?? '';

    // Clear previous timer
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    // Save after a short debounce (300ms)
    saveTimerRef.current = setTimeout(() => {
      updateComponentById(editingScriptEntityId, editingScriptComponentId, (comp) => {
        (comp as ScriptComponent).scriptSource = src;
      });
    }, 300);
  }, [editingScriptEntityId, editingScriptComponentId, updateComponentById]);

  // Manual save (Ctrl+S shortcut via Monaco or button)
  const handleSave = useCallback(() => {
    if (!editingScriptEntityId || !editingScriptComponentId || !editorRef.current) return;
    const src = editorRef.current.getValue() as string;
    // Cancel any pending auto-save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    updateComponentById(editingScriptEntityId, editingScriptComponentId, (comp) => {
      (comp as ScriptComponent).scriptSource = src;
    });
  }, [editingScriptEntityId, editingScriptComponentId, updateComponentById]);

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
          {script.scriptName} — {entity.name}
        </span>
        <div className="script-editor-actions">
          <span className="script-autosave-hint">auto-saves</span>
          <button className="toolbar-btn" onClick={handleSave}>💾 Save</button>
          <button className="toolbar-btn" onClick={() => setEditingScript(null)}>✕ Close</button>
        </div>
      </div>
      <div className="script-editor-body">
        <Editor
          key={editingScriptComponentId}
          height="100%"
          language="javascript"
          theme="vs-dark"
          defaultValue={script.scriptSource}
          onChange={handleChange}
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
