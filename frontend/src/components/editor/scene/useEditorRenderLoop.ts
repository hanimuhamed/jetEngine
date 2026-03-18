// components/editor/useEditorRenderLoop.ts
import { useEffect, useRef } from 'react';
import { useEngineStore } from '../../../store/engineStore';
import type { EngineState } from '../../../engine/core/GameLoop';
import { flattenEntities, renderCameraOutline } from './sceneViewHelpers';

/**
 * Runs the editor-mode render loop (scene rendering when not playing).
 * Automatically stops when engineState is PLAYING.
 */
export function useEditorRenderLoop(engineState: EngineState, editingPrefabId: string | null) {
  const editorRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (engineState === 'PLAYING') return;

    const renderEditorFrame = () => {
      const {
        entities,
        selectedEntityId,
        renderer: r,
        cameraEntityId,
        editingPrefabId: prefabId,
        editingPrefabEntity,
        sceneAspectRatio,
      } = useEngineStore.getState();

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

      const camEntity = allEntities.find(e => e.id === cameraEntityId);
      if (camEntity) r.cameraEntity = camEntity;

      r.clear();
      r.drawGrid();
      r.renderEntities(allEntities, selectedEntityId);

      if (camEntity && r.canvas) renderCameraOutline(r, camEntity, sceneAspectRatio);

      editorRafRef.current = requestAnimationFrame(renderEditorFrame);
    };

    editorRafRef.current = requestAnimationFrame(renderEditorFrame);

    return () => {
      if (editorRafRef.current !== null) cancelAnimationFrame(editorRafRef.current);
    };
  }, [engineState, editingPrefabId]);
}
