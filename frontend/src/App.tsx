import React, { useRef, useState } from "react";
import "./index.css";
import Panel from "./components/Panel";
import Hierarchy from "./components/Hierarchy";
import Inspector, { InspectorComponent } from "./components/Inspector";
import type { TreeNode } from "./types";

// TODO first complete engine, then come back to complete the editor.

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const topRowRef = useRef<HTMLDivElement>(null);

  // Width of right panel (percentage of root)
  const [rightWidth, setRightWidth] = useState(250);

  // Width of left panel (percentage of top row)
  const [leftWidth, setLeftWidth] = useState(250);

  // Height of top row (percentage of column)
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

    const columnHeight = columnRef.current!.clientHeight;

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
      <div className="top-bar">✈ jetEngine</div>

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
              <Hierarchy data={sampleTree} />
            </Panel>

            <div
              className="divider vertical"
              onMouseDown={(e) => startResize("left", e)}
            />

            <Panel
              title="SCENE"
              className="middle-top"
              style={{ flex: 1 }}
            />
          </div>

          {/* HORIZONTAL DIVIDER */}
          <div
            className="divider horizontal"
            onMouseDown={(e) => startResize("horizontal", e)}
          />

          {/* BOTTOM (ASSETS) */}
          <Panel
            title="ASSETS"
            className="middle-bottom"
          />
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
          <Inspector components={components.map((comp) => (
            <InspectorComponent
              key={comp.name}
              name={comp.name}
              attributes={comp.attributes}
            />
          ))} />
        </Panel>
      </div>
      <div className="footer">
        • Big Footer
      </div>
    </div>
  );
}


const sampleTree: TreeNode[] = [
  {
    id: "1",
    name: "src",
    type: "folder",
    children: [
      {
        id: "1",
        name: "components",
        type: "folder",
        children: [
          { id: "3", name: "Panel.tsx", type: "file" },
          { id: "4", name: "Hierarchy.tsx", type: "file" },
        ],
      },
      { id: "5", name: "App.tsx", type: "file" },
      { id: "6", name: "index.css", type: "file" },
    ],
  },
  {
    id: "7",
    name: "package.json",
    type: "file",
  },
];

const transform: Record<string, any> = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

const rigidbody = {
  mass: 1,
  isKinematic: false,
  useGravity: true,
};

const components = [
  {
    name: "Transform",
    attributes: transform,
  },
  {
    name: "Rigidbody",
    attributes: rigidbody,
  },
];

