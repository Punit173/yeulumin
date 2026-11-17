// Full editable copies of designs that were added to the cart, so a cart item can be
// reopened in the Design Lab. Stored in IndexedDB (images are too large for localStorage),
// keyed by the cart item id.
import { idbDel, idbGet, idbSet } from "./idbKv";
import { useViewerStore, type ViewerState } from "@/components/viewer/useViewerStore";

export type DesignSnapshot = Pick<
  ViewerState,
  | "color"
  | "design"
  | "view"
  | "size"
  | "customTextureUrl"
  | "customPrompt"
  | "designSource"
  | "decalScale"
  | "decalPosX"
  | "decalPosY"
  | "decalTarget"
  | "garmentType"
> & { style?: string };

const key = (cartItemId: string) => `cart-design:${cartItemId}`;

export function captureDesignSnapshot(style?: string): DesignSnapshot {
  const s = useViewerStore.getState();
  return {
    color: s.color,
    design: s.design,
    view: s.view,
    size: s.size,
    customTextureUrl: s.customTextureUrl,
    customPrompt: s.customPrompt,
    designSource: s.designSource,
    decalScale: s.decalScale,
    decalPosX: s.decalPosX,
    decalPosY: s.decalPosY,
    decalTarget: s.decalTarget,
    garmentType: s.garmentType,
    style,
  };
}

export const saveDesignSnapshot = (cartItemId: string, snapshot: DesignSnapshot) => idbSet(key(cartItemId), snapshot);
export const loadDesignSnapshot = (cartItemId: string) => idbGet<DesignSnapshot>(key(cartItemId));
export const deleteDesignSnapshot = (cartItemId: string) => idbDel(key(cartItemId));
