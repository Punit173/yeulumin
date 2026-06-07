import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string; // unique ID: either product.id or custom-[timestamp]
  productId?: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  image: string;
  size: "XS" | "S" | "M" | "L" | "XL" | "XXL";
  color: string; // e.g., "#0A0A0A" or "#FFFFFF"
  prompt?: string;
  style?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (newItem) =>
        set((state) => {
          const quantity = newItem.quantity ?? 1;
          const existingItemIndex = state.items.findIndex(
            (item) =>
              item.productId === newItem.productId &&
              item.size === newItem.size &&
              item.color === newItem.color &&
              item.prompt === newItem.prompt
          );

          if (existingItemIndex > -1) {
            const updatedItems = [...state.items];
            updatedItems[existingItemIndex].quantity += quantity;
            return { items: updatedItems };
          }

          return {
            items: [
              ...state.items,
              { ...newItem, quantity } as CartItem,
            ],
          };
        }),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
          ),
        })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: "yeulumin-cart-storage",
    }
  )
);

// Helper selectors to compute totals reactively and safely handle SSR hydration mismatches
export const getCartSubtotal = (items: CartItem[]) => {
  return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
};

export const getCartTotalItems = (items: CartItem[]) => {
  return items.reduce((acc, item) => acc + item.quantity, 0);
};

export const getCartShipping = (subtotal: number) => {
  if (subtotal === 0) return 0;
  return subtotal >= 999 ? 0 : 99; // Free over ₹999, else ₹99
};

export const getCartTotal = (subtotal: number, shipping: number) => {
  return subtotal + shipping;
};
