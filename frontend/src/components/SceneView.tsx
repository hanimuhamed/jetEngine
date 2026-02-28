// components/SceneView.tsx — Canvas scene view
import { useRef, useEffect, useCallback } from 'react';
import { useEngineStore } from '../store/engineStore';
import { Transform2D } from '../engine/components/Transform2D';
import { Camera2DComponent } from '../engine/components/Camera2DComponent';
import type { Entity } from '../engine/core/Entity';

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

function SceneView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const editorRafRef = useRef<number | null>(null);

  const setCanvas = useEngineStore(s => s.setCanvas);
  const renderer = useEngineStore(s => s.renderer);
  const selectEntity = useEngineStore(s => s.selectEntity);
  const engineState = useEngineStore(s => s.engineState);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setCanvas(canvas);
  }, [setCanvas]);

  // Editor render loop (runs when not playing)
  useEffect(() => {
    if (engineState === 'PLAYING') return;

    const renderEditorFrame = () => {
      const { entities, selectedEntityId, renderer: r, cameraEntityId } = useEngineStore.getState();
      const allEntities = flattenEntities(entities);
      
      // Sync camera from camera entity
      const camEntity = allEntities.find(e => e.id === cameraEntityId);
      if (camEntity) {
        r.cameraEntity = camEntity;
      }
      r.syncCameraFromEntity();

      r.clear();
      r.drawGrid();
      r.renderEntities(allEntities, selectedEntityId);
      editorRafRef.current = requestAnimationFrame(renderEditorFrame);
    };

    editorRafRef.current = requestAnimationFrame(renderEditorFrame);

    return () => {
      if (editorRafRef.current !== null) {
        cancelAnimationFrame(editorRafRef.current);
      }
    };
  }, [engineState]);

  // Canvas click — select entity
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const { entities } = useEngineStore.getState();
    const allEntities = flattenEntities(entities);
    const hit = renderer.hitTest(allEntities, x, y);
    selectEntity(hit?.id ?? null);
  }, [renderer, selectEntity]);

  // Pan with middle mouse button
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1) {
      // Middle mouse
      e.preventDefault();
      isPanningRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };

      // Move the camera entity's transform (panning moves camera, which shifts the scene)
      // Y-up: dragging up (negative dy) should increase camera Y
      const { cameraEntityId, entities } = useEngineStore.getState();
      const allEntities = flattenEntities(entities);
      const camEntity = allEntities.find(e => e.id === cameraEntityId);
      if (camEntity) {
        const t = camEntity.getComponent<Transform2D>('Transform2D');
        if (t) {
          t.position.x -= dx / renderer.camera.zoom;
          t.position.y += dy / renderer.camera.zoom;
          useEngineStore.getState().syncEntities();
        }
      }
    }
  }, [renderer]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1) {
      isPanningRef.current = false;
    }
  }, []);

  // Zoom with scroll — updates Camera2DComponent zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const { cameraEntityId, entities: ents } = useEngineStore.getState();
    const allEnts = flattenEntities(ents);
    const camEntity = allEnts.find(e2 => e2.id === cameraEntityId);
    if (camEntity) {
      const cam = camEntity.getComponent<Camera2DComponent>('Camera2DComponent');
      if (cam) {
        cam.zoom = Math.max(0.1, Math.min(10, cam.zoom * zoomFactor));
        useEngineStore.getState().syncEntities();
      }
    }
  }, []);

  return (
    <div className="scene-view" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="scene-canvas"
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}

export default SceneView;
