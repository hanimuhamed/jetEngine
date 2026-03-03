// components/SceneView.tsx — Canvas scene view
import { useState, useRef, useEffect, useCallback } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { Transform2D } from '../../engine/components/Transform2D';
import { Camera2DComponent } from '../../engine/components/Camera2DComponent';
import { SpriteRenderer } from '../../engine/components/SpriteRenderer';
import { Vec2 } from '../../engine/core/Math2D';
import { getWorldTransform } from '../../engine/core/WorldTransform';
import type { Entity } from '../../engine/core/Entity';

/** Recursively flatten entities (including children) */
function flattenEntities(entities: Entity[]): Entity[] {
  const result: Entity[] = [];
  for (const entity of entities) {
    result.push(entity);
    if (entity.children.length > 0) {
      result.push(...flattenEntities(entity.children));
    }
  }
  return result;
}

const ASPECT_RATIOS: { label: string; value: number | null | 'custom' }[] = [
  { label: 'Free', value: null },
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '1:1', value: 1 },
  { label: '21:9', value: 21 / 9 },
  { label: '9:16', value: 9 / 16 },
  { label: 'Custom', value: 'custom' },
];

type DragMode = 'none' | 'move' | 'scale';
interface ScaleHandle { corner: 'tl' | 'tr' | 'bl' | 'br'; anchorWorld: Vec2; startWorld: Vec2; startScaleX: number; startScaleY: number; startW: number; startH: number; }

function SceneView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const editorRafRef = useRef<number | null>(null);

  // Drag state for moving/scaling entities
  const dragModeRef = useRef<DragMode>('none');
  const dragStartWorldRef = useRef<Vec2>(Vec2.zero());
  const dragStartPosRef = useRef<Vec2>(Vec2.zero());
  const scaleHandleRef = useRef<ScaleHandle | null>(null);

  const setCanvas = useEngineStore(s => s.setCanvas);
  const renderer = useEngineStore(s => s.renderer);
  const selectEntity = useEngineStore(s => s.selectEntity);
  const engineState = useEngineStore(s => s.engineState);
  const editingPrefabId = useEngineStore(s => s.editingPrefabId);
  const aspectRatio = useEngineStore(s => s.sceneAspectRatio);
  const setAspectRatio = useEngineStore(s => s.setSceneAspectRatio);
  const customRatioX = useEngineStore(s => s.customRatioX);
  const customRatioY = useEngineStore(s => s.customRatioY);
  const setCustomRatio = useEngineStore(s => s.setCustomRatio);

  // Track whether custom ratio is selected
  const [isCustom, setIsCustom] = useState(false);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setCanvas(canvas);
  }, [setCanvas]);

  // Resize canvas to fit container (with optional aspect ratio)
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver(() => {
      const cw = container.clientWidth;
      const ch = container.clientHeight - 32; // subtract ratio bar height
      if (aspectRatio) {
        const containerAR = cw / ch;
        if (containerAR > aspectRatio) {
          // Container is wider than desired — pillarbox
          canvas.height = ch;
          canvas.width = Math.round(ch * aspectRatio);
        } else {
          // Container is taller — letterbox
          canvas.width = cw;
          canvas.height = Math.round(cw / aspectRatio);
        }
      } else {
        canvas.width = cw;
        canvas.height = ch;
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [aspectRatio]);

  // Editor render loop (runs when not playing)
  useEffect(() => {
    if (engineState === 'PLAYING') return;

    const renderEditorFrame = () => {
      const { entities, selectedEntityId, renderer: r, cameraEntityId, editingPrefabId: prefabId, editingPrefabEntity } = useEngineStore.getState();

      r.useEditorCamera();

      // If editing a prefab, render only the prefab entity
      if (prefabId && editingPrefabEntity) {
        const prefabEntities = flattenEntities([editingPrefabEntity]);
        r.cameraEntity = null;
        r.clear();
        r.drawGrid();
        r.renderEntities(prefabEntities, selectedEntityId);
        editorRafRef.current = requestAnimationFrame(renderEditorFrame);
        return;
      }

      const allEntities = flattenEntities(entities);
      
      // Set camera entity reference (for white outline rendering etc.)
      const camEntity = allEntities.find(e => e.id === cameraEntityId);
      if (camEntity) {
        r.cameraEntity = camEntity;
      }
      // Don't sync camera from entity — editor uses its own camera

      r.clear();
      r.drawGrid();
      r.renderEntities(allEntities, selectedEntityId);

      // Render camera entity as white outline box
      if (camEntity && r.canvas) {
        renderCameraOutline(r, camEntity);
      }

      editorRafRef.current = requestAnimationFrame(renderEditorFrame);
    };

    editorRafRef.current = requestAnimationFrame(renderEditorFrame);

    return () => {
      if (editorRafRef.current !== null) {
        cancelAnimationFrame(editorRafRef.current);
      }
    };
  }, [engineState, editingPrefabId]);

  // Render a white rectangle outline showing the camera's viewport in world space
  function renderCameraOutline(r: typeof renderer, camEntity: Entity) {
    const canvas = r.canvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cam = camEntity.getComponent<Camera2DComponent>('Camera2DComponent');
    const t = camEntity.getComponent<Transform2D>('Transform2D');
    if (!cam || !t) return;

    // The camera shows a viewport based on a fixed reference resolution (1920x1080),
    // not the current canvas size, so resizing the panel doesn't change the viewport
    const REF_W = 1920;
    const REF_H = 1080;
    const vw = REF_W / cam.zoom;
    const vh = REF_H / cam.zoom;

    // Four corners of the camera viewport in world space
    const cx = t.position.x;
    const cy = t.position.y;
    const corners = [
      new Vec2(cx - vw / 2, cy + vh / 2), // top-left (world Y-up)
      new Vec2(cx + vw / 2, cy + vh / 2), // top-right
      new Vec2(cx + vw / 2, cy - vh / 2), // bottom-right
      new Vec2(cx - vw / 2, cy - vh / 2), // bottom-left
    ];

    // Convert to screen using editor camera
    const screenCorners = corners.map(c => r.worldToScreen(c));

    ctx.save();
    ctx.strokeStyle = '#ffffff40';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(screenCorners[0].x, screenCorners[0].y);
    for (let i = 1; i < 4; i++) {
      ctx.lineTo(screenCorners[i].x, screenCorners[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Label
    ctx.fillStyle = '#ffffff88';
    ctx.font = '11px monospace';
    ctx.setLineDash([]);
    ctx.fillText('Camera', screenCorners[0].x + 4, screenCorners[0].y - 6);

    ctx.restore();
  }

  // Helper: get selection box corners in screen space for an entity
  function getSelectionCorners(entity: Entity): { tl: Vec2; tr: Vec2; bl: Vec2; br: Vec2 } | null {
    const sprite = entity.getComponent<SpriteRenderer>('SpriteRenderer');
    const w = sprite ? sprite.width : 50;
    const h = sprite ? sprite.height : 50;
    const hw = w / 2;
    const hh = h / 2;

    const tl = renderer.worldToScreen(worldFromLocal(entity, -hw, hh));
    const tr = renderer.worldToScreen(worldFromLocal(entity, hw, hh));
    const bl = renderer.worldToScreen(worldFromLocal(entity, -hw, -hh));
    const br = renderer.worldToScreen(worldFromLocal(entity, hw, -hh));
    return { tl, tr, bl, br };
  }

  // Convert entity-local coordinates to world
  function worldFromLocal(entity: Entity, lx: number, ly: number): Vec2 {
    const world = getWorldTransform(entity);
    const rad = (world.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const sx = lx * world.scaleX;
    const sy = ly * world.scaleY;
    return new Vec2(
      world.position.x + sx * cos - sy * sin,
      world.position.y + sx * sin + sy * cos
    );
  }

  // Check if screen point is near a corner handle (returns corner key or null)
  function hitTestCorner(sx: number, sy: number, corners: { tl: Vec2; tr: Vec2; bl: Vec2; br: Vec2 }): 'tl' | 'tr' | 'bl' | 'br' | null {
    const threshold = 8;
    for (const key of ['tl', 'tr', 'bl', 'br'] as const) {
      const c = corners[key];
      if (Math.abs(sx - c.x) <= threshold && Math.abs(sy - c.y) <= threshold) {
        return key;
      }
    }
    return null;
  }

  // Canvas mouse down — select entity, start move/scale, or pan
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1) {
      // Middle mouse — pan editor camera
      e.preventDefault();
      isPanningRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button === 0 && engineState !== 'PLAYING') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      const { selectedEntityId, entities, cameraEntityId, editingPrefabId: prefabId, editingPrefabEntity } = useEngineStore.getState();

      const entitiesToCheck = (prefabId && editingPrefabEntity)
        ? flattenEntities([editingPrefabEntity])
        : flattenEntities(entities);

      // Check if clicking on a corner handle of the selected entity for scaling
      if (selectedEntityId && selectedEntityId !== cameraEntityId) {
        const selectedEntity = entitiesToCheck.find(ent => ent.id === selectedEntityId);
        if (selectedEntity) {
          const corners = getSelectionCorners(selectedEntity);
          if (corners) {
            const corner = hitTestCorner(sx, sy, corners);
            if (corner) {
              // Start scale drag
              const worldPt = renderer.screenToWorld(new Vec2(sx, sy));
              const oppositeKey = corner === 'tl' ? 'br' : corner === 'tr' ? 'bl' : corner === 'bl' ? 'tr' : 'tl';
              const transform = selectedEntity.getComponent<Transform2D>('Transform2D');
              const sprite = selectedEntity.getComponent<SpriteRenderer>('SpriteRenderer');
              if (transform) {
                const anchorCorner = corners[oppositeKey];
                const anchorWorld = renderer.screenToWorld(anchorCorner);
                dragModeRef.current = 'scale';
                scaleHandleRef.current = {
                  corner,
                  anchorWorld,
                  startWorld: worldPt,
                  startScaleX: transform.scale.x,
                  startScaleY: transform.scale.y,
                  startW: sprite ? sprite.width : 50,
                  startH: sprite ? sprite.height : 50,
                };
              }
              return;
            }
          }
        }
      }

      // Hit test for selecting
      const hit = renderer.hitTest(entitiesToCheck, sx, sy);
      if (hit) {
        selectEntity(hit.id);
        // If hit entity is not the camera, start move drag
        if (hit.id !== cameraEntityId) {
          const transform = hit.getComponent<Transform2D>('Transform2D');
          if (transform) {
            dragModeRef.current = 'move';
            dragStartWorldRef.current = renderer.screenToWorld(new Vec2(sx, sy));
            dragStartPosRef.current = new Vec2(transform.position.x, transform.position.y);
          }
        }
      } else {
        if (prefabId && editingPrefabEntity) {
          selectEntity(editingPrefabEntity.id);
        } else {
          selectEntity(null);
        }
      }
    }
  }, [renderer, selectEntity, engineState]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };

      // Pan editor camera (not entity camera)
      renderer.editorCamera.position.x -= dx / renderer.editorCamera.zoom;
      renderer.editorCamera.position.y += dy / renderer.editorCamera.zoom;
      return;
    }

    if (dragModeRef.current === 'move') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const worldPt = renderer.screenToWorld(new Vec2(sx, sy));

      const { selectedEntityId, entities, editingPrefabId: prefabId, editingPrefabEntity } = useEngineStore.getState();
      if (!selectedEntityId) return;

      const entitiesToCheck = (prefabId && editingPrefabEntity)
        ? flattenEntities([editingPrefabEntity])
        : flattenEntities(entities);
      
      const entity = entitiesToCheck.find(ent => ent.id === selectedEntityId);
      if (!entity) return;
      const transform = entity.getComponent<Transform2D>('Transform2D');
      if (!transform) return;

      const dx = worldPt.x - dragStartWorldRef.current.x;
      const dy = worldPt.y - dragStartWorldRef.current.y;

      // If entity has a parent, need to convert world delta to local delta
      if (entity.parent) {
        const pw = getWorldTransform(entity.parent);
        const rad = -(pw.rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        transform.position.x = dragStartPosRef.current.x + (dx * cos - dy * sin) / pw.scaleX;
        transform.position.y = dragStartPosRef.current.y + (dx * sin + dy * cos) / pw.scaleY;
      } else {
        transform.position.x = dragStartPosRef.current.x + dx;
        transform.position.y = dragStartPosRef.current.y + dy;
      }
      useEngineStore.getState().syncEntities();
    }

    if (dragModeRef.current === 'scale') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const worldPt = renderer.screenToWorld(new Vec2(sx, sy));
      const handle = scaleHandleRef.current;
      if (!handle) return;

      const { selectedEntityId, entities, editingPrefabId: prefabId, editingPrefabEntity } = useEngineStore.getState();
      if (!selectedEntityId) return;

      const entitiesToCheck = (prefabId && editingPrefabEntity)
        ? flattenEntities([editingPrefabEntity])
        : flattenEntities(entities);

      const entity = entitiesToCheck.find(ent => ent.id === selectedEntityId);
      if (!entity) return;
      const transform = entity.getComponent<Transform2D>('Transform2D');
      const sprite = entity.getComponent<SpriteRenderer>('SpriteRenderer');
      if (!transform) return;

      // Compute scale factor based on distance from anchor
      const startDx = handle.startWorld.x - handle.anchorWorld.x;
      const startDy = handle.startWorld.y - handle.anchorWorld.y;
      const curDx = worldPt.x - handle.anchorWorld.x;
      const curDy = worldPt.y - handle.anchorWorld.y;

      const scaleFactorX = Math.abs(startDx) > 0.01 ? curDx / startDx : 1;
      const scaleFactorY = Math.abs(startDy) > 0.01 ? curDy / startDy : 1;

      transform.scale.x = handle.startScaleX * scaleFactorX;
      transform.scale.y = handle.startScaleY * scaleFactorY;

      // Optionally adjust position to keep anchor fixed
      // Recompute entity center so that the anchor corner stays put
      const w = sprite ? sprite.width : 50;
      const h = sprite ? sprite.height : 50;
      // anchor is the opposite corner in local space
      const anchorLocalX = handle.corner === 'tl' || handle.corner === 'bl' ? w / 2 : -w / 2;
      const anchorLocalY = handle.corner === 'tl' || handle.corner === 'tr' ? -h / 2 : h / 2;
      // Where the anchor should be in world space (unchanged)
      const targetAnchor = handle.anchorWorld;
      // Where the anchor actually is now
      const actualAnchor = worldFromLocal(entity, anchorLocalX, anchorLocalY);
      // Shift position
      transform.position.x += targetAnchor.x - actualAnchor.x;
      transform.position.y += targetAnchor.y - actualAnchor.y;

      useEngineStore.getState().syncEntities();
    }
  }, [renderer]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1) {
      isPanningRef.current = false;
    }
    if (e.button === 0) {
      dragModeRef.current = 'none';
      scaleHandleRef.current = null;
    }
  }, []);

  // Zoom with scroll — affects EDITOR camera only
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    renderer.editorCamera.zoom = Math.max(0.1, Math.min(10, renderer.editorCamera.zoom * zoomFactor));
  }, [renderer]);

  return (
    <div className="scene-view" ref={containerRef}>
      <div className="scene-ratio-bar">
        <label className="scene-ratio-label">Ratio:</label>
        <select
          className="scene-ratio-select"
          value={isCustom ? 'custom' : (aspectRatio?.toString() ?? '')}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'custom') {
              setIsCustom(true);
              setCustomRatio(customRatioX, customRatioY);
            } else {
              setIsCustom(false);
              setAspectRatio(val ? Number(val) : null);
            }
          }}
        >
          {ASPECT_RATIOS.map(ar => (
            <option key={ar.label} value={ar.value?.toString() ?? ''}>
              {ar.label}
            </option>
          ))}
        </select>
        {isCustom && (
          <div className="scene-ratio-custom">
            <input
              type="number"
              className="scene-ratio-custom-input"
              value={customRatioX}
              min={1}
              onChange={(e) => {
                const x = Math.max(1, Number(e.target.value) || 1);
                setCustomRatio(x, customRatioY);
              }}
            />
            <span className="scene-ratio-custom-sep">:</span>
            <input
              type="number"
              className="scene-ratio-custom-input"
              value={customRatioY}
              min={1}
              onChange={(e) => {
                const y = Math.max(1, Number(e.target.value) || 1);
                setCustomRatio(customRatioX, y);
              }}
            />
          </div>
        )}
      </div>
      <div className="scene-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="scene-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    </div>
  );
}

export default SceneView;
