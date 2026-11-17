import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";

import { idbGet, idbSet, idbDel } from "@/app/lib/idbKv";

// IndexedDB-backed storage: uploaded/generated designs are base64 images that can
// exceed localStorage's ~5MB quota.
const idbStorage: StateStorage = {
  getItem: (name) => idbGet<string>(name),
  setItem: async (name, value) => {
    await idbSet(name, value);
  },
  removeItem: (name) => idbDel(name),
};

export type DesignType = "none" | "logo" | "abstract" | "stripe" | "circuit" | "ai";
export type ViewType = "front" | "back" | "side";
export type SizeType = "XS" | "S" | "M" | "L" | "XL" | "XXL";

// Original uploaded image + the crop/rounding applied to it, so the user can re-edit later
export interface DesignSource {
  src: string;
  crop: { x: number; y: number; w: number; h: number } | null; // in source-image pixels
  radius: number; // corner rounding, 0–50 (% of the crop's shorter side)
  aspect: string; // "free" | "1:1" | "4:3" | "3:4" | "16:9"
}

export interface ViewerState {
  color: string;
  design: DesignType;
  view: ViewType;
  size: SizeType;
  quantity: number;
  customTextureUrl: string | null;
  customPrompt: string | null;
  designSource: DesignSource | null;
  history: string[];
  decalScale: number;
  decalPosY: number;
  decalPosX: number;
  decalTarget: "front" | "back";
  garmentType: "tshirt" | "hoodie" | "oversized";
  garmentChosen: boolean; // user has picked a garment at least once (skips the picker on reload)
  setColor: (c: string) => void;
  setDesign: (d: DesignType) => void;
  setView: (v: ViewType) => void;
  setSize: (s: SizeType) => void;
  setQuantity: (q: number) => void;
  setCustomTextureUrl: (url: string | null) => void;
  setCustomPrompt: (prompt: string | null) => void;
  setDesignSource: (source: DesignSource | null) => void;
  addToHistory: (url: string) => void;
  setDecalScale: (s: number) => void;
  setDecalPosY: (y: number) => void;
  setDecalPosX: (x: number) => void;
  setDecalTarget: (t: "front" | "back") => void;
  setGarmentType: (t: "tshirt" | "hoodie" | "oversized") => void;
  resetDecalPlacement: () => void;
}

export const useViewerStore = create<ViewerState>()(
  persist(
    (set) => ({
  color: "#ffffff",
  design: "none",
  view: "front",
  size: "M",
  quantity: 1,
  customTextureUrl: null,
  customPrompt: null,
  designSource: null,
  history: [],
  decalScale: 0.35,
  decalPosY: 0.05,
  decalPosX: 0.00,
  decalTarget: "front",
  garmentType: "tshirt",
  garmentChosen: false,
  setColor: (color) => set({ color }),
  setDesign: (design) => set({ design }),
  setView: (view) => set({ view }),
  setSize: (size) => set({ size }),
  setQuantity: (quantity) => set({ quantity: Math.max(1, Math.min(99, quantity)) }),
  // A new texture from any other path (AI, presets) invalidates the stored upload source
  setCustomTextureUrl: (customTextureUrl) => set({ customTextureUrl, designSource: null }),
  setDesignSource: (designSource) => set({ designSource }),
  setCustomPrompt: (customPrompt) => set({ customPrompt }),
  addToHistory: (url) => set((state) => ({ history: [url, ...state.history.filter((h) => h !== url)].slice(0, 12) })), // limit history to 12 items
  setDecalScale: (decalScale) => set({ decalScale }),
  setDecalPosY: (decalPosY) => set({ decalPosY }),
  setDecalPosX: (decalPosX) => set({ decalPosX }),
  setDecalTarget: (decalTarget) => set({ decalTarget }),
  setGarmentType: (garmentType) => set({ garmentType, garmentChosen: true }),
  resetDecalPlacement: () => set({ decalScale: 0.35, decalPosY: 0.05, decalPosX: 0.00, decalTarget: "front" }),
    }),
    {
      name: "yeulumin-viewer-design",
      storage: createJSONStorage(() => idbStorage),
      // Persist the current design only (history can hold many large images)
      partialize: (state) => ({
        color: state.color,
        design: state.design,
        view: state.view,
        size: state.size,
        quantity: state.quantity,
        customTextureUrl: state.customTextureUrl,
        customPrompt: state.customPrompt,
        designSource: state.designSource,
        decalScale: state.decalScale,
        decalPosY: state.decalPosY,
        decalPosX: state.decalPosX,
        decalTarget: state.decalTarget,
        garmentType: state.garmentType,
        garmentChosen: state.garmentChosen,
      }),
    }
  )
);
