import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useState, useEffect } from "react";

export interface ServerResult {
  ip: string;
  port: number;
  type: "java" | "bedrock";
  online: boolean;
  motd?: string;
  motdRaw?: any;
  favicon?: string;
  version?: string;
  protocol?: number;
  playersOnline?: number;
  playersMax?: number;
  playerList?: string[];
  latency?: number;
  gameMode?: string;
  serverGUID?: string;
  scannedAt: number;
}

interface ScannerStore {
  // Favorites
  favorites: ServerResult[];
  favoritesKeys: Record<string, boolean>;
  addFavorite: (server: ServerResult) => void;
  removeFavorite: (ip: string, port: number) => void;
  isFavorite: (ip: string, port: number) => boolean;

  // Recent scans
  recentScans: ServerResult[];
  addRecentScan: (server: ServerResult) => void;
  clearRecentScans: () => void;

  // Settings
  settings: {
    defaultType: "java" | "bedrock";
    timeout: number;
    concurrency: number;
  };
  updateSettings: (settings: Partial<ScannerStore["settings"]>) => void;
}

import { get, set as idbSet, del } from "idb-keyval";
import { createJSONStorage, type StateStorage } from "zustand/middleware";

const indexedDBStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await idbSet(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

export const useStore = create<ScannerStore>()(
  persist(
    (set, getLocal) => ({
      // Favorites
      favorites: [],
      favoritesKeys: {},
      addFavorite: (server) =>
        set((state) => {
          const key = `${server.ip}:${server.port}`;
          if (state.favoritesKeys[key]) return state;
          return {
            favorites: [
              ...state.favorites.filter(
                (f) => !(f.ip === server.ip && f.port === server.port),
              ),
              server,
            ],
            favoritesKeys: { ...state.favoritesKeys, [key]: true },
          };
        }),
      removeFavorite: (ip, port) =>
        set((state) => {
          const key = `${ip}:${port}`;
          if (!state.favoritesKeys[key]) return state;
          const newKeys = { ...state.favoritesKeys };
          delete newKeys[key];
          return {
            favorites: state.favorites.filter(
              (f) => !(f.ip === ip && f.port === port),
            ),
            favoritesKeys: newKeys,
          };
        }),
      isFavorite: (ip, port) => {
        const state = getLocal();
        return !!state.favoritesKeys[`${ip}:${port}`];
      },

      // Recent scans
      recentScans: [],
      addRecentScan: (server) =>
        set((state) => {
          const newScans = [
            server,
            ...state.recentScans.filter(
              (s) => !(s.ip === server.ip && s.port === server.port),
            ),
          ];
          return { recentScans: newScans };
        }),
      clearRecentScans: () => set({ recentScans: [] }),

      // Settings
      settings: {
        defaultType: "java",
        timeout: 5000,
        concurrency: 5,
      },
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
    }),
    {
      name: "mc-scanner-storage",
      storage: createJSONStorage(() => indexedDBStorage),
      merge: (persistedState: any, currentState) => {
        const merged = { ...currentState, ...persistedState };

        // Ensure favoritesKeys is populated for existing users who only had favorites array
        if (
          !merged.favoritesKeys ||
          Object.keys(merged.favoritesKeys).length === 0
        ) {
          merged.favoritesKeys = {};
          if (Array.isArray(merged.favorites)) {
            merged.favorites.forEach((f: any) => {
              if (f.ip && f.port) {
                merged.favoritesKeys[`${f.ip}:${f.port}`] = true;
              }
            });
          }
        }

        return merged as ScannerStore;
      },
    },
  ),
);

export function useHydrated() {
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  return isHydrated;
}
