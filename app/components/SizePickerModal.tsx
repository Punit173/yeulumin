"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Ruler, ShoppingBag, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCartStore, type CartItem } from "../store/cartStore";
import { thumbnailUrl, type Product } from "../lib/products";

export type SizeOption = CartItem["size"];
export const SIZE_OPTIONS: SizeOption[] = ["XS", "S", "M", "L", "XL", "XXL"];

interface SizePickerModalProps {
  title: string;
  image?: string;
  price?: number;
  /** Pre-selected size (e.g. the size already chosen in the Design Lab). Nothing is pre-selected when omitted. */
  initialSize?: SizeOption | null;
  confirmLabel?: string;
  onConfirm: (size: SizeOption) => void;
  onClose: () => void;
}

/** Asks the shopper to pick a size before an item goes into the cart. */
export default function SizePickerModal({
  title,
  image,
  price,
  initialSize = null,
  confirmLabel = "Add to Cart",
  onConfirm,
  onClose,
}: SizePickerModalProps) {
  const [size, setSize] = useState<SizeOption | null>(initialSize);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select size"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 flex flex-col gap-4"
      >
        <div className="flex items-start gap-3">
          {image && (
            <img
              src={thumbnailUrl(image, 256)}
              alt=""
              className="h-16 w-16 rounded-xl object-cover bg-neutral-100 flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0 text-left">
            <h3 className="font-bold text-sm text-neutral-900 truncate">{title}</h3>
            {typeof price === "number" && <p className="text-xs font-mono text-neutral-500 mt-0.5">₹{price}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-500 cursor-pointer flex-shrink-0"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-400 uppercase tracking-widest font-bold">
            <Ruler className="h-3.5 w-3.5" />
            Select size
          </span>
          <div className="grid grid-cols-6 gap-1.5">
            {SIZE_OPTIONS.map((s) => {
              const active = size === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`h-11 rounded-xl border text-xs font-bold flex items-center justify-center cursor-pointer transition-all ${
                    active
                      ? "bg-black border-black text-white"
                      : "bg-white border-neutral-200 text-neutral-700 hover:border-neutral-500"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          disabled={!size}
          onClick={() => size && onConfirm(size)}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {size ? <ShoppingBag className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          {size ? `${confirmLabel} · ${size}` : "Choose a size"}
        </button>
      </div>
    </div>
  );
}

/**
 * Add-to-cart flow for catalog (Drive) products: login check → size picker → cart.
 * Render `sizePicker` somewhere in the page and call `requestAdd(product)` from buttons.
 */
export function useAddProductToCart(redirectPath: string) {
  const { user } = useAuth();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [pending, setPending] = useState<Product | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  const requestAdd = (product: Product, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!user) {
      router.push(`/auth?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }
    setPending(product);
  };

  const confirm = (size: SizeOption) => {
    if (!pending) return;
    addItem({
      // One cart line per product + size
      id: `${pending.id}__${size}`,
      productId: pending.id,
      name: pending.name,
      description: pending.description,
      price: pending.price,
      quantity: 1,
      size,
      color: pending.defaultColor || "#ffffff",
      image: pending.image,
      style: pending.printPosition || "front",
    });
    setAddedId(pending.id);
    setPending(null);
    setTimeout(() => setAddedId(null), 2500);
  };

  const sizePicker = pending ? (
    <SizePickerModal
      title={pending.name}
      image={pending.image}
      price={pending.price}
      onConfirm={confirm}
      onClose={() => setPending(null)}
    />
  ) : null;

  return { requestAdd, sizePicker, addedId };
}
