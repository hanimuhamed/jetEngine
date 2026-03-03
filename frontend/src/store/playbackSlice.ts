// store/playbackSlice.ts — Play/pause/stop, canvas, engine instances
import { Renderer2D } from '../engine/rendering/Renderer2D';
import { InputManager } from '../engine/core/InputManager';
import { GameLoop } from '../engine/core/GameLoop';
import { SceneSerializer } from '../engine/scene/SceneSerializer';
import type { PlaybackSlice, SliceCreator } from './types';
import { collectAllEntities } from './storeHelpers';

// Singleton instances
const renderer = new Renderer2D();
const inputManager = new InputManager();

// Snapshot for undo on stop
let sceneSnapshot: { json: string } | null = null;

export const createPlaybackSlice: SliceCreator<PlaybackSlice> = (set, get) => ({
  engineState: 'EDITING',
  renderer,
  inputManager,
  gameLoop: null,

  setCanvas: (canvas) => {
    const { renderer: r, inputManager: im } = get();
    r.attach(canvas);
    im.attach(canvas);

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resize();

    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
  },

  play: () => {
    const state = get();
    if (state.engineState === 'PLAYING') return;

    if (state.engineState === 'EDITING') {
      sceneSnapshot = { json: SceneSerializer.toJSON(state.scene) };
    }

    let gl = state.gameLoop;
    if (!gl) {
      gl = new GameLoop(state.renderer, state.inputManager, state.scene);
      gl.onFrameCallback = () => {
        set({ _tick: get()._tick + 1, entities: [...get().scene.entities] });
      };
      set({ gameLoop: gl });
    }

    gl.setScene(state.scene);

    // Pass assets to game loop
    gl.prefabs.clear();
    gl.scriptAssets.clear();
    for (const asset of state.assets) {
      if (asset.type === 'prefab' && asset.prefabJson) gl.prefabs.set(asset.name, asset.prefabJson);
      if (asset.type === 'script' && asset.scriptSource) gl.scriptAssets.set(asset.name, asset.scriptSource);
    }

    gl.play();
    set({ engineState: 'PLAYING' });
  },

  pause: () => {
    get().gameLoop?.pause();
    set({ engineState: 'PAUSED' });
  },

  stop: () => {
    const { gameLoop } = get();
    gameLoop?.stop();

    if (sceneSnapshot) {
      const restoredScene = SceneSerializer.fromJSON(sceneSnapshot.json);
      const allEntities = collectAllEntities(restoredScene.entities);
      const cameraEntity = allEntities.find(e => e.hasComponent('Camera2DComponent'));

      set({
        scene: restoredScene,
        entities: [...restoredScene.entities],
        engineState: 'EDITING',
        selectedEntityId: null,
        cameraEntityId: cameraEntity?.id ?? get().cameraEntityId,
      });

      if (gameLoop) gameLoop.setScene(restoredScene);
      sceneSnapshot = null;
    } else {
      set({ engineState: 'EDITING' });
    }
  },
});
