// components/editor/useSceneInput.ts — Mouse/drag handling for SceneView
import { useCallback, useRef } from 'react';
import { useEngineStore } from '../../../store/engineStore';
import { Transform2D } from '../../../engine/components/Transform2D';
import { SpriteRenderer } from '../../../engine/components/SpriteRenderer';
import { Vec2 } from '../../../engine/core/Math2D';
import { getWorldTransform } from '../../../engine/core/WorldTransform';
import type { Renderer2D } from '../../../engine/rendering/Renderer2D';
import type { EngineState } from '../../../engine/core/GameLoop';
import { flattenEntities, worldFromLocal, getSelectionCorners, hitTestCorner } from './sceneViewHelpers';

type DragMode = 'none' | 'move' | 'scale';

interface ScaleHandle {
  corner: 'tl' | 'tr' | 'bl' | 'br';
  anchorWorld: Vec2;
  startWorld: Vec2;
  startScaleX: number;
  startScaleY: number;
  startW: number;
  startH: number;
}

/** Returns refs and event handlers for the SceneView canvas. */
export function useSceneInput(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  renderer: Renderer2D,
  selectEntity: (id: string | null) => void,
  engineState: EngineState,
) {
  const isPanningRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const dragModeRef = useRef<DragMode>('none');
  const dragStartWorldRef = useRef<Vec2>(Vec2.zero());
  const dragStartPosRef = useRef<Vec2>(Vec2.zero());
  const scaleHandleRef = useRef<ScaleHandle | null>(null);

  /** Resolve the entity list to check (scene or prefab). */
  const getEntities = () => {
    const { entities, editingPrefabId, editingPrefabEntity } = useEngineStore.getState();
    return (editingPrefabId && editingPrefabEntity)
      ? flattenEntities([editingPrefabEntity])
      : flattenEntities(entities);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1) {
      e.preventDefault();
      isPanningRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button !== 0 || engineState === 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const { selectedEntityId, cameraEntityId, editingPrefabId, editingPrefabEntity } = useEngineStore.getState();
    const entitiesToCheck = getEntities();

    // Check corner handles for scaling the selected entity
    if (selectedEntityId && selectedEntityId !== cameraEntityId) {
      const selectedEntity = entitiesToCheck.find(ent => ent.id === selectedEntityId);
      if (selectedEntity) {
        const corners = getSelectionCorners(selectedEntity, renderer);
        if (corners) {
          const corner = hitTestCorner(sx, sy, corners);
          if (corner) {
            const worldPt = renderer.screenToWorld(new Vec2(sx, sy));
            const oppositeKey = corner === 'tl' ? 'br' : corner === 'tr' ? 'bl' : corner === 'bl' ? 'tr' : 'tl';
            const transform = selectedEntity.getComponent<Transform2D>('Transform2D');
            const sprite = selectedEntity.getComponent<SpriteRenderer>('SpriteRenderer');
            if (transform) {
              dragModeRef.current = 'scale';
              scaleHandleRef.current = {
                corner,
                anchorWorld: renderer.screenToWorld(corners[oppositeKey]),
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
      if (hit.id !== useEngineStore.getState().cameraEntityId) {
        const transform = hit.getComponent<Transform2D>('Transform2D');
        if (transform) {
          dragModeRef.current = 'move';
          dragStartWorldRef.current = renderer.screenToWorld(new Vec2(sx, sy));
          dragStartPosRef.current = new Vec2(transform.position.x, transform.position.y);
        }
      }
    } else {
      selectEntity(editingPrefabId && editingPrefabEntity ? editingPrefabEntity.id : null);
    }
  }, [renderer, selectEntity, engineState, canvasRef]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Panning
    if (isPanningRef.current) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      renderer.editorCamera.position.x -= dx / renderer.editorCamera.zoom;
      renderer.editorCamera.position.y += dy / renderer.editorCamera.zoom;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldPt = renderer.screenToWorld(new Vec2(sx, sy));

    // Move drag
    if (dragModeRef.current === 'move') {
      const { selectedEntityId } = useEngineStore.getState();
      if (!selectedEntityId) return;
      const entity = getEntities().find(ent => ent.id === selectedEntityId);
      if (!entity) return;
      const transform = entity.getComponent<Transform2D>('Transform2D');
      if (!transform) return;

      const dx = worldPt.x - dragStartWorldRef.current.x;
      const dy = worldPt.y - dragStartWorldRef.current.y;

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

    // Scale drag
    if (dragModeRef.current === 'scale') {
      const handle = scaleHandleRef.current;
      if (!handle) return;
      const { selectedEntityId } = useEngineStore.getState();
      if (!selectedEntityId) return;
      const entity = getEntities().find(ent => ent.id === selectedEntityId);
      if (!entity) return;
      const transform = entity.getComponent<Transform2D>('Transform2D');
      if (!transform) return;

      const scaleFactorX = Math.abs(handle.startWorld.x - handle.anchorWorld.x) > 0.01
        ? (worldPt.x - handle.anchorWorld.x) / (handle.startWorld.x - handle.anchorWorld.x) : 1;
      const scaleFactorY = Math.abs(handle.startWorld.y - handle.anchorWorld.y) > 0.01
        ? (worldPt.y - handle.anchorWorld.y) / (handle.startWorld.y - handle.anchorWorld.y) : 1;

      transform.scale.x = handle.startScaleX * scaleFactorX;
      transform.scale.y = handle.startScaleY * scaleFactorY;

      // Keep anchor corner fixed
      const sprite = entity.getComponent<SpriteRenderer>('SpriteRenderer');
      const w = sprite ? sprite.width : 50;
      const h = sprite ? sprite.height : 50;
      const anchorLocalX = handle.corner === 'tl' || handle.corner === 'bl' ? w / 2 : -w / 2;
      const anchorLocalY = handle.corner === 'tl' || handle.corner === 'tr' ? -h / 2 : h / 2;
      const actualAnchor = worldFromLocal(entity, anchorLocalX, anchorLocalY);
      transform.position.x += handle.anchorWorld.x - actualAnchor.x;
      transform.position.y += handle.anchorWorld.y - actualAnchor.y;

      useEngineStore.getState().syncEntities();
    }
  }, [renderer, canvasRef]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1) isPanningRef.current = false;
    if (e.button === 0) { dragModeRef.current = 'none'; scaleHandleRef.current = null; }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    renderer.editorCamera.zoom = Math.max(0.1, Math.min(10, renderer.editorCamera.zoom * zoomFactor));
  }, [renderer]);

  return { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel };
}
