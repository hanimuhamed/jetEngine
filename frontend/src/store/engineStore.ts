// store/engineStore.ts — Combines all store slices
import { create } from 'zustand';
import { addConsoleListener } from '../engine/scripting/ScriptRunner';
import type { EngineStore } from './types';
import { createEntitySlice } from './entitySlice';
import { createPlaybackSlice } from './playbackSlice';
import { createSceneSlice } from './sceneSlice';
import { createAssetSlice } from './assetSlice';
import { createPrefabSlice } from './prefabSlice';

// Re-export types that consumers need
export type { EngineStore, Asset } from './types';

export const useEngineStore = create<EngineStore>((set, get) => {
  // Wire up console listener from script runner
  addConsoleListener((entry) => {
    get().addConsoleLog(entry);
  });

  return {
    ...createEntitySlice(set, get),
    ...createPlaybackSlice(set, get),
    ...createSceneSlice(set, get),
    ...createAssetSlice(set, get),
    ...createPrefabSlice(set, get),
  };
});
