// store/assetSlice.ts — Assets, script editing, console
import { v4 as uuidv4 } from 'uuid';
import type { AssetSlice, SliceCreator } from './types';

export const createAssetSlice: SliceCreator<AssetSlice> = (set, get) => ({
  assets: [],

  addAsset: (name, url, base64) => {
    set({ assets: [...get().assets, { id: uuidv4(), name, url, type: 'image', base64 }] });
  },

  addPrefabAsset: (name, entityJson) => {
    set({ assets: [...get().assets, { id: uuidv4(), name, url: '', type: 'prefab', prefabJson: entityJson }] });
  },

  addScriptAsset: (name, scriptSource) => {
    set({ assets: [...get().assets, { id: uuidv4(), name, url: '', type: 'script', scriptSource }] });
  },

  removeAsset: (id) => {
    set({ assets: get().assets.filter(a => a.id !== id) });
  },

  updateScriptAsset: (id, scriptSource) => {
    set({ assets: get().assets.map(a => a.id === id ? { ...a, scriptSource } : a) });
  },

  // Script editing
  editingScriptEntityId: null,
  editingScriptComponentId: null,
  setEditingScript: (entityId, componentId) => set({
    editingScriptEntityId: entityId,
    editingScriptComponentId: componentId ?? null,
    editingScriptAssetId: null,
  }),

  editingScriptAssetId: null,
  setEditingScriptAsset: (assetId) => set({
    editingScriptAssetId: assetId,
    editingScriptEntityId: null,
    editingScriptComponentId: null,
  }),

  // Console
  consoleLogs: [],
  addConsoleLog: (entry) => {
    set(state => ({
      consoleLogs: [...state.consoleLogs.slice(-200), entry],
    }));
  },
  clearConsoleLogs: () => set({ consoleLogs: [] }),
});
