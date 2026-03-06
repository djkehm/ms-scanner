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

export const useStore = create<ScannerStore>()(
  persist(
    (set, get) => ({
      // Favorites
      favorites: [],
      addFavorite: (server) =>
        set((state) => ({
          favorites: [
            ...state.favorites.filter(
              (f) => !(f.ip === server.ip && f.port === server.port),
            ),
            server,
          ],
        })),
      removeFavorite: (ip, port) =>
        set((state) => ({
          favorites: state.favorites.filter(
            (f) => !(f.ip === ip && f.port === port),
          ),
        })),
      isFavorite: (ip, port) =>
        get().favorites.some((f) => f.ip === ip && f.port === port),

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
          if (newScans.length > 1000) {
            newScans.length = 1000;
          }
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
