import React, { useRef, useState } from "react";
import "./index.css";
import Panel from "./components/Panel";
import Hierarchy from "./components/Hierarchy";
import Inspector from "./components/Inspector";
import Toolbar from "./components/Toolbar";
import SceneView from "./components/SceneView";
import ScriptEditor from "./components/ScriptEditor";
import AssetPanel from "./components/AssetPanel";
import { useEngineStore } from "./store/engineStore";

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const topRowRef = useRef<HTMLDivElement>(null);

  const editingScriptEntityId = useEngineStore((s) => s.editingScriptEntityId);

  // Width of right panel (px)
  const [rightWidth, setRightWidth] = useState(280);
  // Width of left panel (px)
  const [leftWidth, setLeftWidth] = useState(220);
  // Height of top row (px)
  const [topHeight, setTopHeight] = useState(600);

  const startResize = (
    direction: "right" | "left" | "horizontal",
    e: React.MouseEvent
  ) => {
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;

    const startRight = rightWidth;
    const startLeft = leftWidth;
    const startTopHeight = topHeight;

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
              title="HIERARCHY"
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
              title="SCENE"
              className="middle-top"
              style={{ flex: 1 }}
            >
              <SceneView />
            </Panel>
          </div>

          {/* HORIZONTAL DIVIDER */}
          <div
            className="divider horizontal"
            onMouseDown={(e) => startResize("horizontal", e)}
          />

          {/* BOTTOM (ASSETS or SCRIPT EDITOR) */}
          <Panel
            title={editingScriptEntityId ? "SCRIPT EDITOR" : "ASSETS"}
            className="middle-bottom"
          >
            {editingScriptEntityId ? <ScriptEditor /> : <AssetPanel />}
          </Panel>
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

