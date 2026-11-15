import { create } from "zustand";
import { comparePathfinding, generatePathfindingMap, type Difficulty, type RandomMap } from "@/lib/pathfinding";

type Results = ReturnType<typeof comparePathfinding>;
type LabState = {
  difficulty: Difficulty;
  map: RandomMap | null;
  results: Results | null;
  lastFrame: number;
  frame: number;
  running: boolean;
};

type LabControls = {
  setDifficulty: (difficulty: Difficulty) => void;
  ensureMap: () => void;
  randomize: () => void;
  run: () => void;
  reproduce: (difficulty: Difficulty, seed: number) => void;
  togglePlayback: () => void;
  tick: () => void;
  step: () => void;
  reset: () => void;
};

export const useLabStore = create<LabState & LabControls>((set, get) => {
  const usedSeeds = new Set<number>();
  const usedBoards = new Set<string>();
  const fingerprint = (map: RandomMap) => [map.start, map.goal, ...map.walls].join(",");

  function remember(map: RandomMap) {
    usedSeeds.add(map.seed);
    usedBoards.add(fingerprint(map));
  }

  function freshMap() {
    let seed = crypto.getRandomValues(new Uint32Array(1))[0];
    while (true) {
      if (!usedSeeds.has(seed)) {
        const map = generatePathfindingMap(get().difficulty, seed);
        if (!usedBoards.has(fingerprint(map))) {
          remember(map);
          return map;
        }
      }
      seed = (seed + 1) >>> 0;
    }
  }

  function begin(map: RandomMap) {
    const results = comparePathfinding(map);
    const frames = Object.values(results).map(({ visited, path }) => visited.length + Math.max(0, path.length - 1));
    set({ difficulty: map.difficulty, map, results, lastFrame: Math.max(...frames), frame: 0, running: true });
  }

  function advance(playing: boolean) {
    set((state) => {
      if (!state.results || (playing && !state.running)) return state;
      const frame = Math.min(state.frame + 1, state.lastFrame);
      return { frame, running: playing && frame < state.lastFrame };
    });
  }

  return {
    difficulty: "normal",
    map: null,
    results: null,
    lastFrame: 0,
    frame: 0,
    running: false,
    setDifficulty: (difficulty) => set({ difficulty }),
    ensureMap: () => { if (!get().map) get().randomize(); },
    randomize: () => set({ map: freshMap(), results: null, lastFrame: 0, frame: 0, running: false }),
    run: () => begin(freshMap()),
    reproduce: (difficulty, seed) => {
      const map = generatePathfindingMap(difficulty, seed);
      remember(map);
      begin(map);
    },
    togglePlayback: () => set((state) => {
      if (!state.results) return state;
      return { running: !state.running, frame: state.frame === state.lastFrame ? 0 : state.frame };
    }),
    tick: () => advance(true),
    step: () => advance(false),
    reset: () => set({ frame: 0, running: false }),
  };
});
