import { create } from "zustand";

export type DesignType = "none" | "logo" | "abstract" | "stripe" | "circuit" | "ai";
export type ViewType = "front" | "back" | "side";
export type SizeType = "XS" | "S" | "M" | "L" | "XL" | "XXL";

export interface ViewerState {
  color: string;
  design: DesignType;
  view: ViewType;
  size: SizeType;
  quantity: number;
  setColor: (c: string) => void;
  setDesign: (d: DesignType) => void;
  setView: (v: ViewType) => void;
  setSize: (s: SizeType) => void;
  setQuantity: (q: number) => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  color: "#ffffff",
  design: "none",
  view: "front",
  size: "M",
  quantity: 1,
  setColor: (color) => set({ color }),
  setDesign: (design) => set({ design }),
  setView: (view) => set({ view }),
  setSize: (size) => set({ size }),
  setQuantity: (quantity) => set({ quantity: Math.max(1, Math.min(99, quantity)) }),
}));
