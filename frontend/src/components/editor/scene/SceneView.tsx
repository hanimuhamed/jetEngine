// components/editor/SceneView.tsx � Canvas scene view
import { useState, useRef, useEffect } from 'react';
import { useEngineStore } from '../../../store/engineStore';
import { ASPECT_RATIOS } from './sceneViewHelpers';
import { useEditorRenderLoop } from './useEditorRenderLoop';
import { useSceneInput } from './useSceneInput';

function SceneView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const [isCustom, setIsCustom] = useState(false);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) setCanvas(canvas);
  }, [setCanvas]);

  // Resize canvas to fit container (with optional aspect ratio)
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver(() => {
      const cw = container.clientWidth;
      const ch = container.clientHeight - 32;
      if (aspectRatio) {
        if (cw / ch > aspectRatio) {
          canvas.height = ch;
          canvas.width = Math.round(ch * aspectRatio);
        } else {
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

  // Editor render loop
  useEditorRenderLoop(engineState, editingPrefabId);

  // Mouse / drag input
  const { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel } =
    useSceneInput(canvasRef, renderer, selectEntity, engineState);

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
