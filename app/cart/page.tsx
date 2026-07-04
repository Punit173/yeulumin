"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Truck, ShieldCheck } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import GrainOverlay from "../components/GrainOverlay";
import {
  useCartStore,
  getCartSubtotal,
  getCartTotalItems,
  getCartShipping,
  getCartTotal,
} from "../store/cartStore";

export default function CartPage() {
  const [mounted, setMounted] = useState(false);

  // Sync Zustand store safely on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  // Computed fields (only when mounted)
  const cartItems = mounted ? items : [];
  const subtotal = getCartSubtotal(cartItems);
  const totalItems = getCartTotalItems(cartItems);
  const shipping = getCartShipping(subtotal);
  const total = getCartTotal(subtotal, shipping);

  // Shipping progress indicator threshold
  const shippingThreshold = 999;
  const progressToFreeShipping = Math.min((subtotal / shippingThreshold) * 100, 100);
  const amountLeftForFreeShipping = Math.max(shippingThreshold - subtotal, 0);

  return (
    <div className="relative min-h-screen flex flex-col bg-[#F5F6F8] text-[#0A0A0A] antialiased">
      <GrainOverlay />
      <Navbar />

      <main className="flex-grow mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Header Title */}
        <div className="flex flex-col gap-2 mb-10 text-left">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
            <ShoppingBag className="h-4.5 w-4.5" />
            <span>Order Manifest</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight uppercase text-neutral-900">
            YOUR CART
          </h1>
          <div className="h-[2px] w-12 bg-neutral-900 mt-2" />
        </div>

        {cartItems.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start select-none">
            
            {/* LEFT PANEL: Item List (8 columns) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-neutral-200/80 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 shadow-sm hover:border-neutral-300 transition-colors"
                >
                  {/* Left Column: Image & Details */}
                  <div className="flex items-center gap-4">
                    {/* Item Image */}
                    <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl bg-[#F9FAFB] border border-neutral-100 overflow-hidden flex-shrink-0 flex items-center justify-center p-2 relative">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    {/* Item Specs */}
                    <div className="flex flex-col gap-1.5 text-left">
                      <h3 className="font-bold text-neutral-800 text-sm sm:text-base leading-snug">
                        {item.name}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500 font-mono">
                        <span className="flex items-center gap-1">
                          Size: <strong className="text-neutral-700">{item.size}</strong>
                        </span>
                        
                        {/* Base Color preview */}
                        <span className="flex items-center gap-1.5">
                          Base: 
                          <span
                            className="h-3 w-3 rounded-full border border-neutral-200 inline-block"
                            style={{ backgroundColor: item.color }}
                            title={item.color}
                          />
                        </span>

                        {item.style && (
                          <span className="text-blue-600 uppercase text-[9px] font-bold border border-blue-100 bg-blue-50/50 px-1.5 rounded">
                            {item.style}
                          </span>
                        )}
                      </div>

                      {/* Display custom prompt if present */}
                      {item.prompt && (
                        <p className="text-[10px] text-neutral-400 font-mono italic max-w-xs sm:max-w-md line-clamp-1 border-l border-neutral-200 pl-2 mt-1 leading-relaxed">
                          "{item.prompt}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Quantity and Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 border-t sm:border-t-0 pt-4 sm:pt-0 border-neutral-100">
                    
                    {/* Price in INR */}
                    <div className="font-mono text-neutral-900 font-bold text-sm sm:text-base sm:mb-1.5">
                      ₹{item.price * item.quantity}
                    </div>

                    {/* Quantity Selector & Delete button */}
                    <div className="flex items-center gap-3">
                      
                      {/* Quantity Stepper */}
                      <div className="flex items-center bg-neutral-50 border border-neutral-200 rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-800 transition-colors cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-mono font-bold text-neutral-800">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-800 transition-colors cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Delete Action */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50/20 transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                    </div>

                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT PANEL: Order Summary (4 columns) */}
            <div className="lg:col-span-4 flex flex-col gap-6 sticky top-28">
              
              {/* Promo Banner / Free Shipping Tracker */}
              <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 flex flex-col gap-3 shadow-sm">
                <div className="flex items-center justify-between text-xs font-mono text-left">
                  <span className="text-neutral-500">Free Shipping Tracker</span>
                  <span className="text-blue-600 font-bold">{amountLeftForFreeShipping > 0 ? `₹${amountLeftForFreeShipping} remaining` : "Eligible"}</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                    style={{ width: `${progressToFreeShipping}%` }}
                  />
                </div>
                <p className="text-[10px] text-neutral-400 leading-relaxed text-left">
                  {amountLeftForFreeShipping > 0
                    ? `Add items worth ₹${amountLeftForFreeShipping} more to qualify for free express delivery.`
                    : "Your order qualifies for free shipping."}
                </p>
              </div>

              {/* Order Summary Receipt */}
              <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
                <h3 className="font-sans font-bold uppercase tracking-wider text-neutral-700 text-xs pb-3 border-b border-neutral-100 text-left">
                  Summary Matrix
                </h3>

                <div className="flex flex-col gap-3 font-mono text-xs text-neutral-500 text-left">
                  <div className="flex justify-between">
                    <span>Items Count</span>
                    <span className="text-neutral-800">{totalItems} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-neutral-800">₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping Freight</span>
                    <span className="text-neutral-800">
                      {shipping === 0 ? <span className="text-emerald-600 font-bold uppercase text-[10px]">Free</span> : `₹${shipping}`}
                    </span>
                  </div>
                </div>

                <div className="h-[1px] bg-neutral-100 my-1" />

                <div className="flex justify-between items-baseline">
                  <span className="text-xs uppercase font-sans font-bold text-neutral-500">Total Price</span>
                  <span className="font-sans text-neutral-900 text-xl font-black">₹{total}</span>
                </div>

                <Link
                  href="/checkout"
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/20 hover:scale-103 font-sans mt-2"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Safe Checkout Badges */}
              <div className="flex flex-col gap-3 text-[10px] font-mono text-neutral-400 pl-2 text-left">
                <div className="flex items-center gap-2">
                  <Truck className="h-3.5 w-3.5" />
                  <span>Ships in 2-4 business cycles</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>100% Secure Checkout Protocols</span>
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* Empty State */
          <div className="border border-dashed border-neutral-200 rounded-2xl py-24 text-center max-w-md mx-auto mt-12 flex flex-col items-center gap-6 bg-white shadow-sm">
            <div className="relative p-4 rounded-full bg-neutral-50 border border-neutral-100">
              <ShoppingBag className="h-8 w-8 text-neutral-400" />
            </div>
            
            <div className="flex flex-col gap-2 max-w-xs">
              <h3 className="text-base font-bold text-neutral-800 uppercase tracking-widest font-sans">
                Cart Empty
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Your order manifest is empty. Synthesize custom streetwear designs inside the AI design customizer lab.
              </p>
            </div>

            <Link
              href="/customize"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-500/10"
            >
              <span>Start Designing →</span>
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
