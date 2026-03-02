import React, { useRef, useState, useCallback } from "react";
import "./index.css";
import Panel from "./components/Panel";
import Hierarchy from "./components/Hierarchy";
import Inspector from "./components/Inspector";
import Toolbar from "./components/Toolbar";
import SceneView from "./components/SceneView";
import ScriptEditor from "./components/ScriptEditor";
import AssetPanel from "./components/AssetPanel";
import ConsolePanel from "./components/ConsolePanel";
import { useEngineStore } from "./store/engineStore";

/** Parse a .jet filename into a display name:
 *  "newGame.jet" → "New Game"
 *  "my_cool_game.jet" → "My Cool Game"
 *  "camelCaseProject.jet" → "Camel Case Project"
 */
function parseProjectName(filename: string): string {
  // Strip extension
  let base = filename.replace(/\.jet$/i, '');
  // Insert space before uppercase letters (camelCase → Camel Case)
  base = base.replace(/([a-z])([A-Z])/g, '$1 $2');
  // Replace underscores, hyphens with spaces
  base = base.replace(/[_-]/g, ' ');
  // Title case each word
  base = base.replace(/\b\w/g, c => c.toUpperCase());
  return base.trim() || 'Untitled Project';
}

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const topRowRef = useRef<HTMLDivElement>(null);

  const editingScriptEntityId = useEngineStore((s) => s.editingScriptEntityId);
  const editingScriptAssetId = useEngineStore((s) => s.editingScriptAssetId);
  const editingPrefabId = useEngineStore((s) => s.editingPrefabId);
  const savePrefab = useEngineStore((s) => s.savePrefab);
  const cancelPrefabEdit = useEngineStore((s) => s.cancelPrefabEdit);
  const assets = useEngineStore((s) => s.assets);
  const saveScene = useEngineStore((s) => s.saveScene);
  const loadScene = useEngineStore((s) => s.loadScene);
  const projectName = useEngineStore((s) => s.projectName);
  const setProjectName = useEngineStore((s) => s.setProjectName);

  // Get the prefab name for display
  const editingPrefabName = editingPrefabId
    ? assets.find(a => a.id === editingPrefabId)?.name ?? 'Prefab'
    : null;

  // File menu state
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Width of right panel (px)
  const [rightWidth, setRightWidth] = useState(280);
  // Width of left panel (px)
  const [leftWidth, setLeftWidth] = useState(220);
  // Height of top row (px)
  const [topHeight, setTopHeight] = useState(600);
  // Width of bottom-right console panel (px)
  const [bottomRightWidth, setBottomRightWidth] = useState(340);

  // Close file menu when clicking outside
  React.useEffect(() => {
    if (!fileMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [fileMenuOpen]);

  const handleSave = useCallback(async (e: React.MouseEvent) => {
    // Prevent the outside-click handler from closing the menu before we can show the picker
    e.stopPropagation();
    setFileMenuOpen(false);

    // IMPORTANT: showSaveFilePicker must be called synchronously from user gesture.
    const safeName = projectName.replace(/\s+/g, '_').toLowerCase();
    let fileHandle: FileSystemFileHandle | null = null;

    if ('showSaveFilePicker' in window) {
      try {
        fileHandle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
          suggestedName: `${safeName}.jet`,
          types: [{
            description: 'Jet Engine Project',
            accept: { 'application/json': ['.jet'] },
          }],
        });
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') {
          return;
        }
        // Fall through to download fallback
      }
    }

    const json = saveScene();

    if (fileHandle) {
      try {
        const writable = await fileHandle.createWritable();
        await writable.write(json);
        await writable.close();
        const name = fileHandle.name;
        setProjectName(parseProjectName(name));
        return;
      } catch {
        // Fall through to download fallback
      }
    }

    // Fallback: auto-download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.jet`;
    a.click();
    URL.revokeObjectURL(url);
  }, [saveScene, projectName, setProjectName]);

  const handleLoad = useCallback(() => {
    setFileMenuOpen(false);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      loadScene(reader.result as string);
      // Parse project name from filename
      setProjectName(parseProjectName(file.name));
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [loadScene, setProjectName]);

  const startResize = (
    direction: "right" | "left" | "horizontal" | "bottomVertical",
    e: React.MouseEvent
  ) => {
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;

    const startRight = rightWidth;
    const startLeft = leftWidth;
    const startTopHeight = topHeight;
    const startBottomRightWidth = bottomRightWidth;

    const columnHeight = columnRef.current?.clientHeight ?? 800;

    const onMouseMove = (ev: MouseEvent) => {
      if (direction === "right") {
        const dx = ev.clientX - startX;
        const newRight = startRight - dx;
        if (newRight > 200 && newRight < 600) {
          setRightWidth(newRight);
        }
      }

      if (direction === "left") {
        const dx = ev.clientX - startX;
        const newLeft = startLeft + dx;
        if (newLeft > 150 && newLeft < 800) {
          setLeftWidth(newLeft);
        }
      }

      if (direction === "horizontal") {
        const dy = ev.clientY - startY;
        const newTop = startTopHeight + dy;
        if (newTop > 150 && newTop < columnHeight - 150) {
          setTopHeight(newTop);
        }
      }

      if (direction === "bottomVertical") {
        const dx = ev.clientX - startX;
        const newWidth = startBottomRightWidth - dx;
        if (newWidth > 200 && newWidth < 700) {
          setBottomRightWidth(newWidth);
        }
      }
    };

    const stopResize = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopResize);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stopResize);
  };

  return (
    <div className="app-root">
      <div className="top-bar">
        {/* File dropdown menu */}
        <div className="file-menu-wrapper" ref={fileMenuRef}>
          <button
            className="file-menu-trigger"
            onClick={() => setFileMenuOpen(!fileMenuOpen)}
          >
            File
          </button>
          {fileMenuOpen && (
            <div className="file-menu-dropdown">
              <div className="file-menu-item" onMouseDown={handleSave}>
                Save Project
              </div>
              <div className="file-menu-item" onClick={handleLoad}>
                Load Project
              </div>
            </div>
          )}
        </div>

        <span className="top-bar-title">✈ jetEngine</span>
        <span className="top-bar-project-name">{projectName}</span>

        <Toolbar />

        <input
          ref={fileInputRef}
          type="file"
          accept=".jet,.json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {(editingScriptEntityId || editingScriptAssetId) ? (
        /* ── Full-screen Script Editor + Console (75/25) ── */
        <div className="script-fullscreen-container">
          <Panel
            title="SCRIPT EDITOR"
            className="script-fullscreen-editor"
            style={{ flex: 3 }}
          >
            <ScriptEditor />
          </Panel>
          <div className="divider vertical" />
          <Panel
            title="CONSOLE"
            className="script-fullscreen-console"
            style={{ flex: 1 }}
          >
            <ConsolePanel />
          </Panel>
        </div>
      ) : (
        <div className="container" ref={rootRef}>
          {/* LEFT + SCENE + ASSETS COLUMN */}
          <div
            className="left-middle-column"
            ref={columnRef}
            style={{ flex: 1 }}
          >
            {/* TOP ROW (HIERARCHY + SCENE) */}
            <div
              className="top-row"
              ref={topRowRef}
              style={{ height: `${topHeight}px` }}
            >
              <Panel
                title={editingPrefabId ? "PREFAB" : "HIERARCHY"}
                className="left"
                style={{ width: `${leftWidth}px` }}
              >
                <Hierarchy />
              </Panel>

              <div
                className="divider vertical"
                onMouseDown={(e) => startResize("left", e)}
              />

              <Panel
                title={editingPrefabId ? `SCENE — Editing Prefab: ${editingPrefabName}` : "SCENE"}
                className="middle-top"
                style={{ flex: 1 }}
              >
                {editingPrefabId && (
                  <div className="prefab-edit-bar">
                    <span className="prefab-edit-bar-label">Editing: {editingPrefabName}</span>
                    <button className="prefab-edit-bar-btn save" onClick={savePrefab}>Save</button>
                    <button className="prefab-edit-bar-btn cancel" onClick={cancelPrefabEdit}>Cancel</button>
                  </div>
                )}
                <SceneView />
              </Panel>
            </div>

            {/* HORIZONTAL DIVIDER */}
            <div
              className="divider horizontal"
              onMouseDown={(e) => startResize("horizontal", e)}
            />

            {/* BOTTOM (ASSETS + CONSOLE) */}
            <div className="bottom-row">
              <Panel
                title="ASSETS"
                className="middle-bottom"
              >
                <AssetPanel />
              </Panel>
              <div
                className="divider vertical"
                onMouseDown={(e) => startResize("bottomVertical", e)}
              />
              <Panel
                title="CONSOLE"
                className="bottom-right"
                style={{ width: `${bottomRightWidth}px` }}
              >
                <ConsolePanel />
              </Panel>
            </div>
          </div>

          {/* VERTICAL DIVIDER FOR INSPECTOR */}
          <div
            className="divider vertical"
            onMouseDown={(e) => startResize("right", e)}
          />

          {/* RIGHT (INSPECTOR) */}
          <Panel
            title="INSPECTOR"
            className="right"
            style={{ width: `${rightWidth}px` }}
          >
            <Inspector />
          </Panel>
        </div>
      )}

      <div className="footer">
        ✈ jetEngine v0.1.0 — 2D Game Engine
      </div>
    </div>
  );
}

