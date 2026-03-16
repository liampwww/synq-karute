import { create } from "zustand";

const STORAGE_KEY = "synq-karute-appearance";

export type CoachingNotesStyle = "styled" | "minimal";
export type UIDensity = "compact" | "relaxed" | "spacious";
export type CardElevation = "subtle" | "elevated";

interface AppearanceState {
  coachingNotesStyle: CoachingNotesStyle;
  uiDensity: UIDensity;
  cardElevation: CardElevation;
  colorfulMode: boolean;
  subtleColorMode: boolean;
  setCoachingNotesStyle: (v: CoachingNotesStyle) => void;
  setUIDensity: (v: UIDensity) => void;
  setCardElevation: (v: CardElevation) => void;
  setColorfulMode: (v: boolean) => void;
  setSubtleColorMode: (v: boolean) => void;
  hydrate: () => void;
}

function loadStored(): Partial<AppearanceState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string | boolean>;
    return {
      coachingNotesStyle: parsed.coachingNotesStyle as CoachingNotesStyle | undefined,
      uiDensity: parsed.uiDensity as UIDensity | undefined,
      cardElevation: parsed.cardElevation as CardElevation | undefined,
      colorfulMode: parsed.colorfulMode as boolean | undefined,
      subtleColorMode: parsed.subtleColorMode as boolean | undefined,
    };
  } catch {
    return {};
  }
}

function save(state: AppearanceState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        coachingNotesStyle: state.coachingNotesStyle,
        uiDensity: state.uiDensity,
        cardElevation: state.cardElevation,
        colorfulMode: state.colorfulMode,
        subtleColorMode: state.subtleColorMode,
      })
    );
  } catch {
    // ignore
  }
}

export const useAppearanceStore = create<AppearanceState>((set, get) => ({
  coachingNotesStyle: "styled",
  uiDensity: "relaxed",
  cardElevation: "elevated",
  colorfulMode: false,
  subtleColorMode: false,
  setCoachingNotesStyle: (v) => {
    set({ coachingNotesStyle: v });
    save({ ...get(), coachingNotesStyle: v });
  },
  setUIDensity: (v) => {
    set({ uiDensity: v });
    save({ ...get(), uiDensity: v });
  },
  setCardElevation: (v) => {
    set({ cardElevation: v });
    save({ ...get(), cardElevation: v });
  },
  setColorfulMode: (v) => {
    set({ colorfulMode: v });
    save({ ...get(), colorfulMode: v });
  },
  setSubtleColorMode: (v) => {
    set({ subtleColorMode: v });
    save({ ...get(), subtleColorMode: v });
  },
  hydrate: () => {
    const stored = loadStored();
    set((s) => ({
      coachingNotesStyle: stored.coachingNotesStyle ?? s.coachingNotesStyle,
      uiDensity: stored.uiDensity ?? s.uiDensity,
      cardElevation: stored.cardElevation ?? s.cardElevation,
      colorfulMode: stored.colorfulMode ?? s.colorfulMode,
      subtleColorMode: stored.subtleColorMode ?? s.subtleColorMode,
    }));
  },
}));
