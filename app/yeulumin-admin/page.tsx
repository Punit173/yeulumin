"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { PRODUCTS, Product } from "../lib/products";
import { ShieldAlert, Plus, Trash2, Edit3, Save, X, Loader2, Sparkles, Package, Eye, Check } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import GrainOverlay from "../components/GrainOverlay";

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  price: number;
  size: string;
  color: string;
  style: string;
  image: string;
}

interface Order {
  id: string;
  user_id: string | null;
  email: string;
  status: "pending" | "shipped" | "delivered" | "cancelled";
  total_price: number;
  shipping_address: {
    fullName: string;
    email: string;
    phone: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    pinCode: string;
    country: string;
  };
  created_at: string;
}

export default function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<"products" | "orders">("products");
  const [loading, setLoading] = useState(true);

  // Expanded Order details modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<OrderItem[]>([]);
  const [loadingOrderItems, setLoadingOrderItems] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
    price: 999,
    badge: "New Drop" as "Bestseller" | "New Drop" | "AI Generated",
    image: "",
    category: "Abstract" as "Abstract" | "Typographic" | "Minimal" | "Illustrated",
    tagsString: "",
    defaultColor: "#ffffff",
    defaultView: "front" as "front" | "back",
    printPosition: "front" as "front" | "back",
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Guard route - Strict Admin Only
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/auth?redirect=/yeulumin-admin");
      } else if (!profile || !profile.is_admin) {
        router.push("/");
      }
    }
  }, [user, profile, authLoading, router]);

  const fetchProducts = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const mapped: Product[] = data.map((d: any, idx: number) => ({
          id: d.id,
          name: d.name,
          description: d.description || "",
          price: Number(d.price),
          badge: d.badge,
          image: d.image,
          category: d.category,
          tags: d.tags || [],
          defaultColor: d.default_color,
          defaultView: d.default_view,
          printPosition: d.print_position,
          version: d.version || `Version ${idx + 1}`
        }));
        setProducts(mapped);
      } else {
        setProducts(PRODUCTS);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
      setProducts(PRODUCTS);
    }
  };

  const fetchOrders = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    if (activeTab === "products") {
      await fetchProducts();
    } else {
      await fetchOrders();
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && profile?.is_admin) {
      loadData();
    }
  }, [user, profile, activeTab]);

  const handleEdit = (prod: Product) => {
    setEditingId(prod.id);
    setForm({
      id: prod.id,
      name: prod.name,
      description: prod.description,
      price: prod.price,
      badge: prod.badge || "New Drop",
      image: prod.image,
      category: prod.category,
      tagsString: prod.tags.join(", "),
      defaultColor: prod.defaultColor || "#ffffff",
      defaultView: prod.defaultView || "front",
      printPosition: prod.printPosition || "front",
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    clearForm();
  };

  const clearForm = () => {
    setForm({
      id: "",
      name: "",
      description: "",
      price: 999,
      badge: "New Drop",
      image: "",
      category: "Abstract",
      tagsString: "",
      defaultColor: "#ffffff",
      defaultView: "front",
      printPosition: "front",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!isSupabaseConfigured()) {
      setFormError("Supabase keys are not set.");
      return;
    }

    const tags = form.tagsString
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload = {
      id: form.id,
      name: form.name,
      description: form.description,
      price: Number(form.price),
      badge: form.badge || null,
      image: form.image,
      category: form.category,
      tags: tags,
      default_color: form.defaultColor,
      default_view: form.defaultView,
      print_position: form.printPosition,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        setFormSuccess("Product updated successfully!");
        setEditingId(null);
      } else {
        const { error } = await supabase
          .from("products")
          .insert([payload]);

        if (error) throw error;
        setFormSuccess("Product added to catalog database!");
      }
      clearForm();
      fetchProducts();
    } catch (err: any) {
      console.error("Save product failed:", err);
      setFormError(err.message || "Failed to commit record.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete product "${id}"?`)) return;

    if (!isSupabaseConfigured()) {
      alert("Database offline.");
      return;
    }

    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Delete product failed:", err);
      alert("Could not remove product.");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    if (!isSupabaseConfigured()) return;
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Could not update order status.");
    }
  };

  const handleViewOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    setLoadingOrderItems(true);
    setSelectedOrderItems([]);

    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);

      if (error) throw error;
      setSelectedOrderItems(data || []);
    } catch (err) {
      console.error("Failed to fetch items:", err);
    } finally {
      setLoadingOrderItems(false);
    }
  };

  // Seed DB utility
  const handleSeedDatabase = async () => {
    if (!isSupabaseConfigured()) {
      alert("Supabase keys are missing.");
      return;
    }
    if (!confirm("Are you sure you want to seed the Supabase database with all 12 products?")) return;

    try {
      setLoading(true);
      const mappedPayload = PRODUCTS.map((prod) => ({
        id: prod.id,
        name: prod.name,
        description: prod.description,
        price: prod.price,
        badge: prod.badge,
        image: prod.image,
        category: prod.category,
        tags: prod.tags,
        default_color: prod.defaultColor || null,
        default_view: prod.defaultView || null,
        print_position: prod.printPosition || null,
        version: prod.version || null
      }));

      await supabase.from("products").delete().neq("id", "0");

      const { error } = await supabase.from("products").insert(mappedPayload);
      if (error) throw error;

      alert("Database seeded successfully!");
      fetchProducts();
    } catch (err: any) {
      console.error("Seed failed:", err);
      alert(`Seed failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#F5F6F8] text-[#0A0A0A] antialiased">
        <GrainOverlay />
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user || !profile?.is_admin) {
    return (
      <div className="relative min-h-screen flex flex-col justify-between bg-[#F5F6F8] text-[#0A0A0A] antialiased">
        <GrainOverlay />
        <Navbar />
        <main className="flex-grow flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white border border-red-200 rounded-3xl p-8 text-center flex flex-col items-center gap-6 shadow-md">
            <div className="p-3 bg-red-50 border border-red-200 rounded-full text-red-500">
              <ShieldAlert className="h-10 w-10 animate-bounce" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="font-sans text-lg font-black uppercase text-neutral-900 tracking-wider">
                ACCESS DENIED
              </h2>
              <p className="text-xs text-neutral-500 leading-relaxed font-mono">
                ADMINISTRATOR PRIVILEGES REQUIRED TO UPDATE CENTRAL CATALOG SYSTEM.
              </p>
            </div>
            <Link
              href="/"
              className="py-2.5 px-6 rounded-xl bg-white border border-neutral-200 text-xs font-bold text-neutral-500 hover:text-black hover:border-neutral-400 transition-all uppercase tracking-wider shadow-sm"
            >
              Abort Mission
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-[#F5F6F8] text-[#0A0A0A] antialiased">
      <GrainOverlay />
      <Navbar />

      <main className="flex-grow mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-12 select-none">
        
        {/* Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10 text-left">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
              <Package className="h-4.5 w-4.5" />
              <span>Control Deck</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight uppercase text-neutral-900">
              ADMIN DASHBOARD
            </h1>
            <div className="h-[2px] w-12 bg-neutral-900 mt-2" />
          </div>

          <div className="flex items-center gap-3">
            {activeTab === "products" && (
              <button
                onClick={handleSeedDatabase}
                className="text-xs font-bold font-mono px-4 py-2 border border-blue-200 text-blue-600 bg-white hover:bg-neutral-50 rounded-xl cursor-pointer transition-colors shadow-sm"
              >
                ✦ Seed Database Preset Matrix
              </button>
            )}
          </div>
        </div>

        {/* Tab selection menu */}
        <div className="flex border-b border-neutral-200 mb-8">
          <button
            onClick={() => setActiveTab("products")}
            className={`py-3 px-6 text-xs font-bold uppercase tracking-wider transition-all border-b-2 -mb-[2px] cursor-pointer ${
              activeTab === "products"
                ? "border-blue-600 text-blue-600 font-black"
                : "border-transparent text-neutral-400 hover:text-neutral-700"
            }`}
          >
            Manage Products
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`py-3 px-6 text-xs font-bold uppercase tracking-wider transition-all border-b-2 -mb-[2px] cursor-pointer ${
              activeTab === "orders"
                ? "border-blue-600 text-blue-600 font-black"
                : "border-transparent text-neutral-400 hover:text-neutral-700"
            }`}
          >
            Manage Orders
          </button>
        </div>

        {/* TAB CONTENT: PRODUCTS */}
        {activeTab === "products" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Add / Edit Form Panel */}
            <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm text-left">
              <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-neutral-800 mb-6 pb-3 border-b border-neutral-100 flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5 text-blue-600" />
                <span>{editingId ? "Update Product Drops" : "Compile New Product"}</span>
              </h3>

              {formError && (
                <div className="mb-4 text-[10px] p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="mb-4 text-[10px] p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-medium">
                  {formSuccess}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-neutral-400 uppercase">Product ID</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingId}
                    value={form.id}
                    onChange={(e) => setForm({ ...form, id: e.target.value })}
                    placeholder="e.g. 20"
                    className="bg-white border border-neutral-200 focus:border-neutral-400 rounded-xl px-3 py-2.5 text-neutral-800 placeholder-neutral-400 focus:outline-none transition-colors disabled:opacity-50 shadow-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-neutral-400 uppercase">Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Cyberpunk Circuit Tee"
                    className="bg-white border border-neutral-200 focus:border-neutral-400 rounded-xl px-3 py-2.5 text-neutral-800 placeholder-neutral-400 focus:outline-none transition-colors shadow-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-neutral-400 uppercase">Description</label>
                  <textarea
                    required
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="High-fidelity digital circuitry overlaying premium heavy cotton..."
                    className="bg-white border border-neutral-200 focus:border-neutral-400 rounded-xl px-3 py-2.5 text-neutral-800 placeholder-neutral-400 focus:outline-none transition-colors shadow-sm h-20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-neutral-400 uppercase">Price (₹)</label>
                    <input
                      type="number"
                      required
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      placeholder="1899"
                      className="bg-white border border-neutral-200 focus:border-neutral-400 rounded-xl px-3 py-2.5 text-neutral-800 placeholder-neutral-400 focus:outline-none transition-colors shadow-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-neutral-400 uppercase">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                      className="bg-white border border-neutral-200 focus:border-neutral-400 rounded-xl px-3 py-2.5 text-neutral-800 placeholder-neutral-400 focus:outline-none transition-colors cursor-pointer shadow-sm"
                    >
                      <option value="Abstract">Abstract</option>
                      <option value="Typographic">Typographic</option>
                      <option value="Minimal">Minimal</option>
                      <option value="Illustrated">Illustrated</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-neutral-400 uppercase">Image URL</label>
                  <input
                    type="text"
                    required
                    value={form.image}
                    onChange={(e) => setForm({ ...form, image: e.target.value })}
                    placeholder="/collection/filename.png"
                    className="bg-white border border-neutral-200 focus:border-neutral-400 rounded-xl px-3 py-2.5 text-neutral-800 placeholder-neutral-400 focus:outline-none transition-colors shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-neutral-400 uppercase">Badge</label>
                    <select
                      value={form.badge}
                      onChange={(e) => setForm({ ...form, badge: e.target.value as any })}
                      className="bg-white border border-neutral-200 focus:border-neutral-400 rounded-xl px-3 py-2.5 text-neutral-800 placeholder-neutral-400 focus:outline-none transition-colors cursor-pointer shadow-sm"
                    >
                      <option value="New Drop">New Drop</option>
                      <option value="Bestseller">Bestseller</option>
                      <option value="AI Generated">AI Generated</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-neutral-400 uppercase">Default Color</label>
                    <input
                      type="color"
                      value={form.defaultColor}
                      onChange={(e) => setForm({ ...form, defaultColor: e.target.value })}
                      className="h-9 w-full bg-transparent border-0 cursor-pointer focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-neutral-400 uppercase">Default View</label>
                    <select
                      value={form.defaultView}
                      onChange={(e) => setForm({ ...form, defaultView: e.target.value as any })}
                      className="bg-white border border-neutral-200 focus:border-neutral-400 rounded-xl px-3 py-2.5 text-neutral-800 placeholder-neutral-400 focus:outline-none transition-colors cursor-pointer shadow-sm"
                    >
                      <option value="front">Front</option>
                      <option value="back">Back</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-neutral-400 uppercase">Print Position</label>
                    <select
                      value={form.printPosition}
                      onChange={(e) => setForm({ ...form, printPosition: e.target.value as any })}
                      className="bg-white border border-neutral-200 focus:border-neutral-400 rounded-xl px-3 py-2.5 text-neutral-800 placeholder-neutral-400 focus:outline-none transition-colors cursor-pointer shadow-sm"
                    >
                      <option value="front">Front</option>
                      <option value="back">Back</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-neutral-400 uppercase">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={form.tagsString}
                    onChange={(e) => setForm({ ...form, tagsString: e.target.value })}
                    placeholder="cyberpunk, neon, circuit"
                    className="bg-white border border-neutral-200 focus:border-neutral-400 rounded-xl px-3 py-2.5 text-neutral-800 placeholder-neutral-400 focus:outline-none transition-colors shadow-sm"
                  />
                </div>

                <div className="flex gap-3 mt-4">
                  {editingId ? (
                    <>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/20 cursor-pointer animate-scaleIn"
                      >
                        <Save className="h-4 w-4" />
                        <span>Update</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="py-2.5 px-4 bg-neutral-50 border border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:border-neutral-300 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="submit"
                      className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Deploy Product</span>
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Product list table */}
            <div className="lg:col-span-8 bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-neutral-100 text-left">
                <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-neutral-700">
                  ACTIVE MATRIX DROPS ({products.length})
                </h3>
              </div>

              {loading ? (
                <div className="py-24 text-center flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 text-neutral-400 animate-spin" />
                  <span className="text-xs font-mono text-neutral-400">Retrieving catalog drops...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono text-neutral-500">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-400 uppercase tracking-wider">
                        <th className="p-4 font-bold">Garment</th>
                        <th className="p-4 font-bold">Category</th>
                        <th className="p-4 font-bold">Price</th>
                        <th className="p-4 font-bold">Badge</th>
                        <th className="p-4 font-bold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((prod) => (
                        <tr
                          key={prod.id}
                          className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors"
                        >
                          <td className="p-4 flex items-center gap-3">
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="h-10 w-10 object-contain rounded bg-[#F9FAFB] border border-neutral-100"
                            />
                            <div className="flex flex-col gap-0.5 text-left">
                              <span className="text-neutral-800 font-bold font-sans text-xs">{prod.name}</span>
                              <span className="text-[9px] text-neutral-400">ID: {prod.id} | {prod.version || "Custom"}</span>
                            </div>
                          </td>
                          <td className="p-4 text-neutral-600 font-semibold font-sans">{prod.category}</td>
                          <td className="p-4 text-neutral-900 font-bold">₹{prod.price}</td>
                          <td className="p-4">
                            {prod.badge && (
                              <span className="text-[9px] bg-neutral-50 border border-neutral-200 text-neutral-500 px-2 py-0.5 rounded font-sans font-semibold">
                                {prod.badge}
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center items-center gap-2">
                              <button
                                onClick={() => handleEdit(prod)}
                                className="p-1.5 rounded-lg bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-500 hover:text-black hover:border-neutral-300 transition-colors cursor-pointer"
                                title="Edit product"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(prod.id)}
                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                                title="Delete product"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB CONTENT: ORDERS */}
        {activeTab === "orders" && (
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-neutral-100 text-left">
              <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-neutral-700">
                Customer Transactions ledger ({orders.length})
              </h3>
            </div>

            {loading ? (
              <div className="py-24 text-center flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 text-neutral-400 animate-spin" />
                <span className="text-xs font-mono text-neutral-400">Decrypting order ledger...</span>
              </div>
            ) : orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono text-neutral-500">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-400 uppercase tracking-wider">
                      <th className="p-4 font-bold">Order ID</th>
                      <th className="p-4 font-bold">Recipient</th>
                      <th className="p-4 font-bold">Amount</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">Timestamp</th>
                      <th className="p-4 font-bold text-center">Inspect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors"
                      >
                        <td className="p-4 font-bold text-neutral-900">
                          {order.id.slice(0, 8)}...
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-0.5 text-left">
                            <span className="text-neutral-800 font-bold font-sans">
                              {order.shipping_address?.fullName || "Guest User"}
                            </span>
                            <span className="text-[10px] text-neutral-400">{order.email}</span>
                          </div>
                        </td>
                        <td className="p-4 text-neutral-900 font-bold">₹{order.total_price}</td>
                        <td className="p-4">
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as any)}
                            className={`px-2.5 py-1 rounded-lg bg-white border text-[10px] uppercase font-bold focus:outline-none cursor-pointer ${
                              order.status === "pending"
                                ? "border-yellow-200 text-yellow-600 bg-yellow-50"
                                : order.status === "shipped"
                                ? "border-blue-200 text-blue-600 bg-blue-50"
                                : order.status === "delivered"
                                ? "border-emerald-200 text-emerald-600 bg-emerald-50"
                                : "border-red-200 text-red-500 bg-red-50"
                            }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="p-4 text-[10px] text-neutral-400">
                          {new Date(order.created_at).toLocaleString("en-IN")}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleViewOrderDetails(order)}
                            className="p-1.5 rounded-lg bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-500 hover:text-blue-600 hover:border-blue-300 transition-colors cursor-pointer inline-flex items-center gap-1 text-[10px]"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-24 text-center flex flex-col items-center gap-2">
                <span className="text-3xl text-neutral-300">📦</span>
                <span className="text-xs text-neutral-400 font-bold uppercase">No orders registered in database</span>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Expanded Order detail modal overlay */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-white border border-neutral-200 rounded-3xl overflow-hidden relative shadow-2xl">
            
            {/* Header top bar indicator */}
            <div className="h-[2px] bg-gradient-to-r from-blue-500 to-indigo-600" />
            
            {/* Title */}
            <div className="p-6 border-b border-neutral-100 flex justify-between items-start text-left">
              <div>
                <h3 className="font-sans font-black text-sm uppercase text-neutral-900 tracking-wider">
                  Order Details Log
                </h3>
                <span className="text-[9px] font-mono text-neutral-400 block mt-0.5 select-all">
                  ID: {selectedOrder.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-neutral-400 hover:text-neutral-800 p-1 hover:bg-neutral-50 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="p-6 max-h-[70vh] overflow-y-auto flex flex-col gap-6 text-xs text-left">
              
              {/* Recipient Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] uppercase font-mono font-bold text-neutral-400 mb-2">
                    Shipping Details
                  </h4>
                  <div className="font-mono text-neutral-600 leading-relaxed flex flex-col gap-1 p-3.5 bg-[#F9FAFB] border border-neutral-200/60 rounded-xl">
                    <span className="font-bold text-neutral-900 font-sans text-xs">
                      {selectedOrder.shipping_address?.fullName}
                    </span>
                    <span>{selectedOrder.shipping_address?.address1}</span>
                    {selectedOrder.shipping_address?.address2 && (
                      <span>{selectedOrder.shipping_address.address2}</span>
                    )}
                    <span>
                      {selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.state} -{" "}
                      {selectedOrder.shipping_address?.pinCode}
                    </span>
                    <span>{selectedOrder.shipping_address?.country}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] uppercase font-mono font-bold text-neutral-400 mb-2">
                    Metadata Ledger
                  </h4>
                  <div className="font-mono text-neutral-600 leading-relaxed flex flex-col gap-2 p-3.5 bg-[#F9FAFB] border border-neutral-200/60 rounded-xl">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Contact:</span>
                      <span className="text-neutral-800">{selectedOrder.shipping_address?.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Email:</span>
                      <span className="text-neutral-800 select-all">{selectedOrder.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Total Price:</span>
                      <span className="text-neutral-900 font-bold">₹{selectedOrder.total_price}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-400">Status:</span>
                      <span className="text-neutral-800 capitalize font-bold">
                        {selectedOrder.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order items details */}
              <div>
                <h4 className="text-[10px] uppercase font-mono font-bold text-neutral-400 mb-2.5">
                  Ordered Items
                </h4>
                {loadingOrderItems ? (
                  <div className="py-12 text-center flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 text-neutral-400 animate-spin" />
                    <span className="text-[10px] text-neutral-400 font-mono">Decoding cargo log...</span>
                  </div>
                ) : selectedOrderItems.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {selectedOrderItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 bg-[#F9FAFB] border border-neutral-200/60 p-3.5 rounded-xl"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-12 w-12 object-contain rounded bg-white border border-neutral-100"
                        />
                        <div className="flex-grow">
                          <h5 className="font-bold text-neutral-800 font-sans text-xs">{item.name}</h5>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-neutral-400 font-mono mt-1">
                            <span>Style: <strong className="text-neutral-700">{item.style}</strong></span>
                            <span>Size: <strong className="text-neutral-700">{item.size}</strong></span>
                            <span className="flex items-center gap-1">
                              Color: 
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full border border-neutral-200"
                                style={{ backgroundColor: item.color }}
                              />
                            </span>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-neutral-900 font-bold">₹{item.price * item.quantity}</div>
                          <div className="text-[9px] text-neutral-400">
                            {item.quantity} x ₹{item.price}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-neutral-400 font-mono">
                    No items registered for this order.
                  </div>
                )}
              </div>

            </div>

            {/* Actions Footer */}
            <div className="p-6 border-t border-neutral-100 bg-[#F9FAFB] flex justify-end gap-3 text-xs">
              {selectedOrder.status !== "delivered" && selectedOrder.status !== "cancelled" && (
                <button
                  onClick={() => {
                    handleUpdateOrderStatus(selectedOrder.id, "delivered");
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-1.5 text-[10px]"
                >
                  <Check className="h-4 w-4" />
                  <span>Mark Delivered</span>
                </button>
              )}
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-black font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-[10px]"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
