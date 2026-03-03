import React, { useRef, useState } from 'react';
import Panel from '../ui/Panel';
import Hierarchy from './others/Hierarchy';
import Inspector from './inspectors/Inspector';
import SceneView from './scene/SceneView';
import AssetPanel from './others/AssetPanel';
import ConsolePanel from './script/ConsolePanel';
import { useEngineStore } from '../../store/engineStore';

export function EditorLayout() {
  const editingPrefabId = useEngineStore(s => s.editingPrefabId);
  const savePrefab = useEngineStore(s => s.savePrefab);
  const cancelPrefabEdit = useEngineStore(s => s.cancelPrefabEdit);
  const assets = useEngineStore(s => s.assets);

  const rootRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const topRowRef = useRef<HTMLDivElement>(null);

  const [rightWidth, setRightWidth] = useState(280);
  const [leftWidth, setLeftWidth] = useState(220);
  const [topHeight, setTopHeight] = useState(600);
  const [bottomRightWidth, setBottomRightWidth] = useState(340);

  const editingPrefabName = editingPrefabId
    ? assets.find(a => a.id === editingPrefabId)?.name ?? 'Prefab'
    : null;

  const startResize = (
    direction: 'right' | 'left' | 'horizontal' | 'bottomVertical',
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
      if (direction === 'right') {
        const newRight = startRight - (ev.clientX - startX);
        if (newRight > 200 && newRight < 600) setRightWidth(newRight);
      }
      if (direction === 'left') {
        const newLeft = startLeft + (ev.clientX - startX);
        if (newLeft > 150 && newLeft < 800) setLeftWidth(newLeft);
      }
      if (direction === 'horizontal') {
        const newTop = startTopHeight + (ev.clientY - startY);
        if (newTop > 150 && newTop < columnHeight - 150) setTopHeight(newTop);
      }
      if (direction === 'bottomVertical') {
        const newWidth = startBottomRightWidth - (ev.clientX - startX);
        if (newWidth > 200 && newWidth < 700) setBottomRightWidth(newWidth);
      }
    };

    const stopResize = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopResize);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopResize);
  };

  return (
    <div className="container" ref={rootRef}>
      {/* LEFT + SCENE + ASSETS COLUMN */}
      <div className="left-middle-column" ref={columnRef} style={{ flex: 1 }}>
        {/* TOP ROW (HIERARCHY + SCENE) */}
        <div className="top-row" ref={topRowRef} style={{ height: `${topHeight}px` }}>
          <Panel
            title={editingPrefabId ? 'PREFAB' : 'HIERARCHY'}
            className="left"
            style={{ width: `${leftWidth}px` }}
          >
            <Hierarchy />
          </Panel>

          <div className="divider vertical" onMouseDown={e => startResize('left', e)} />

          <Panel
            title={editingPrefabId ? `SCENE — Editing Prefab: ${editingPrefabName}` : 'SCENE'}
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
        <div className="divider horizontal" onMouseDown={e => startResize('horizontal', e)} />

        {/* BOTTOM (ASSETS + CONSOLE) */}
        <div className="bottom-row">
          <Panel title="ASSETS" className="middle-bottom">
            <AssetPanel />
          </Panel>
          <div className="divider vertical" onMouseDown={e => startResize('bottomVertical', e)} />
          <Panel title="CONSOLE" className="bottom-right" style={{ width: `${bottomRightWidth}px` }}>
            <ConsolePanel />
          </Panel>
        </div>
      </div>

      {/* VERTICAL DIVIDER FOR INSPECTOR */}
      <div className="divider vertical" onMouseDown={e => startResize('right', e)} />

      {/* RIGHT (INSPECTOR) */}
      <Panel title="INSPECTOR" className="right" style={{ width: `${rightWidth}px` }}>
        <Inspector />
      </Panel>
    </div>
  );
}
