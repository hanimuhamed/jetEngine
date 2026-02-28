import React, { useRef, useState } from "react";
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

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const topRowRef = useRef<HTMLDivElement>(null);

  const editingScriptEntityId = useEngineStore((s) => s.editingScriptEntityId);
  const editingPrefabId = useEngineStore((s) => s.editingPrefabId);
  const editingPrefabEntity = useEngineStore((s) => s.editingPrefabEntity);
  const savePrefab = useEngineStore((s) => s.savePrefab);
  const cancelPrefabEdit = useEngineStore((s) => s.cancelPrefabEdit);
  const assets = useEngineStore((s) => s.assets);

  // Get the prefab name for display
  const editingPrefabName = editingPrefabId
    ? assets.find(a => a.id === editingPrefabId)?.name ?? 'Prefab'
    : null;

  // Width of right panel (px)
  const [rightWidth, setRightWidth] = useState(280);
  // Width of left panel (px)
  const [leftWidth, setLeftWidth] = useState(220);
  // Height of top row (px)
  const [topHeight, setTopHeight] = useState(600);
  // Width of bottom-right console panel (px)
  const [bottomRightWidth, setBottomRightWidth] = useState(340);

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
        <span className="top-bar-title">✈ jetEngine</span>
        <Toolbar />
      </div>

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
                  <span className="prefab-edit-bar-label">📦 Editing: {editingPrefabName}</span>
                  <button className="prefab-edit-bar-btn save" onClick={savePrefab}>💾 Save</button>
                  <button className="prefab-edit-bar-btn cancel" onClick={cancelPrefabEdit}>✕ Cancel</button>
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

          {/* BOTTOM (ASSETS/SCRIPT EDITOR + CONSOLE) */}
          <div className="bottom-row">
            <Panel
              title={editingScriptEntityId ? "SCRIPT EDITOR" : "ASSETS"}
              className="middle-bottom"
            >
              {editingScriptEntityId ? <ScriptEditor /> : <AssetPanel />}
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

      <div className="footer">
        ✈ jetEngine v0.1.0 — 2D Game Engine
      </div>
    </div>
  );
}

