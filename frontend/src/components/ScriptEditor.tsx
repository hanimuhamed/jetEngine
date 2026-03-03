// components/ScriptEditor.tsx — Monaco-based script editor
import { useCallback, useRef, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { useEngineStore } from '../store/engineStore';
import { ScriptComponent } from '../engine/components/ScriptComponent';

const SCRIPTING_TYPES = `
declare const entity: {
  id: string;
  name: string;
  tag: string;
  getComponent(type: "Transform2D"): {
    position: { x: number; y: number };
    rotation: number;
    scale: { x: number; y: number };
    translate(dx: number, dy: number): void;
  } | null;
  getComponent(type: "RigidBody2D"): {
    velocity: { x: number; y: number };
    acceleration: { x: number; y: number };
    mass: number;
    gravityScale: number;
    isKinematic: boolean;
    drag: number;
    bounciness: number;
    applyForce(x: number, y: number): void;
    setVelocity(x: number, y: number): void;
  } | null;
  getComponent(type: "Collider2D"): {
    width: number;
    height: number;
    offset: { x: number; y: number };
    isTrigger: boolean;
    showHitbox: boolean;
  } | null;
  getComponent(type: "SpriteRenderer"): {
    color: string;
    shapeType: string;
    width: number;
    height: number;
    visible: boolean;
    layer: number;
  } | null;
  getComponent(type: "Camera2DComponent"): {
    backgroundColor: string;
    zoom: number;
  } | null;
  getComponent(type: string): any;
  applyForce(x: number, y: number): void;
  destroy(): void;
};
declare const transform: {
  position: { x: number; y: number };
  rotation: number;
  scale: { x: number; y: number };
  translate(dx: number, dy: number): void;
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
  spawn(prefabName: string, x: number, y: number): { id: string; name: string; tag: string } | null;
  destroy(target: { id?: string; name?: string }): void;
};
declare const assets: {
  spawn(prefabName: string, x: number, y: number): { id: string; name: string; tag: string } | null;
};
declare function onStart(): void;
declare function onUpdate(deltaTime: number): void;
declare function onCollision(other: { id: string; name: string; tag: string; isTrigger: boolean }): void;
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
  const editingScriptAssetId = useEngineStore(s => s.editingScriptAssetId);
  const setEditingScript = useEngineStore(s => s.setEditingScript);
  const setEditingScriptAsset = useEngineStore(s => s.setEditingScriptAsset);
  const entities = useEngineStore(s => s.entities);
  const assets = useEngineStore(s => s.assets);
  const updateComponentById = useEngineStore(s => s.updateComponentById);
  const updateScriptAsset = useEngineStore(s => s.updateScriptAsset);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine mode: editing an entity's script component, or a script asset
  const isAssetMode = !!editingScriptAssetId;
  const scriptAsset = isAssetMode ? assets.find(a => a.id === editingScriptAssetId) : null;

  const entity = editingScriptEntityId
    ? findEntityInTree(entities, editingScriptEntityId) ?? null
    : null;

  const script = entity && editingScriptComponentId
    ? entity.getComponentById<ScriptComponent>(editingScriptComponentId) ?? null
    : null;

  // The source code to show in the editor
  const editorSource = isAssetMode
    ? (scriptAsset?.scriptSource ?? '')
    : (script?.scriptSource ?? '');

  // The title to display
  const editorTitle = isAssetMode
    ? `${scriptAsset?.name ?? 'Script Asset'}.js`
    : `${script?.scriptName ?? 'Script'}.js — ${entity?.name ?? ''}`;

  const isActive = isAssetMode ? !!scriptAsset : (!!entity && !!script);

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
    const src = value ?? '';

    // Clear previous timer
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    // Save after a short debounce (300ms)
    saveTimerRef.current = setTimeout(() => {
      if (isAssetMode && editingScriptAssetId) {
        updateScriptAsset(editingScriptAssetId, src);
      } else if (editingScriptEntityId && editingScriptComponentId) {
        updateComponentById(editingScriptEntityId, editingScriptComponentId, (comp) => {
          (comp as ScriptComponent).scriptSource = src;
        });
      }
    }, 300);
  }, [isAssetMode, editingScriptAssetId, editingScriptEntityId, editingScriptComponentId, updateComponentById, updateScriptAsset]);

  // Manual save
  const handleSave = useCallback(() => {
    if (!editorRef.current) return;
    const src = editorRef.current.getValue() as string;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    if (isAssetMode && editingScriptAssetId) {
      updateScriptAsset(editingScriptAssetId, src);
    } else if (editingScriptEntityId && editingScriptComponentId) {
      updateComponentById(editingScriptEntityId, editingScriptComponentId, (comp) => {
        (comp as ScriptComponent).scriptSource = src;
      });
    }
  }, [isAssetMode, editingScriptAssetId, editingScriptEntityId, editingScriptComponentId, updateComponentById, updateScriptAsset]);

  const handleClose = useCallback(() => {
    if (isAssetMode) {
      setEditingScriptAsset(null);
    } else {
      setEditingScript(null);
    }
  }, [isAssetMode, setEditingScriptAsset, setEditingScript]);

  if (!isActive) {
    return (
      <div className="script-editor">
        <div className="script-editor-empty">
          No script selected. Click a script asset in the Assets panel to edit it,
          or reference a script in a ScriptComponent.
        </div>
      </div>
    );
  }

  return (
    <div className="script-editor">
      <div className="script-editor-header">
        <span className="script-editor-title">
          {editorTitle}
        </span>
        <div className="script-editor-actions">
          <span className="script-autosave-hint">auto-saves</span>
          <button className="toolbar-btn" onClick={handleSave}>Save</button>
          <button className="toolbar-btn" onClick={handleClose}>Close</button>
        </div>
      </div>
      <div className="script-editor-body">
        <Editor
          key={isAssetMode ? editingScriptAssetId : editingScriptComponentId}
          height="100%"
          language="javascript"
          theme="vs-dark"
          defaultValue={editorSource}
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
