import { create } from "zustand";
import { initialWalls, type SearchResult } from "@/lib/pathfinding";

type LabState = {
  walls: number[];
  results: { dijkstra: SearchResult; astar: SearchResult } | null;
  frame: number;
  running: boolean;
  toggleWall: (node: number) => void;
  resetWalls: () => void;
  setResults: (results: LabState["results"]) => void;
  setFrame: (frame: number) => void;
  setRunning: (running: boolean) => void;
};

export const useLabStore = create<LabState>((set) => ({
  walls: initialWalls,
  results: null,
  frame: 0,
  running: false,
  toggleWall: (node) => set((state) => ({
    walls: state.walls.includes(node)
      ? state.walls.filter((wall) => wall !== node)
      : [...state.walls, node],
    results: null,
    frame: 0,
    running: false,
  })),
  resetWalls: () => set({ walls: initialWalls, results: null, frame: 0, running: false }),
  setResults: (results) => set({ results }),
  setFrame: (frame) => set({ frame }),
  setRunning: (running) => set({ running }),
}));
