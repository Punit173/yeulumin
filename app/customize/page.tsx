"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useViewerStore } from "@/components/viewer/useViewerStore";
import { useCartStore } from "../store/cartStore";
import { useAuth } from "../context/AuthContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { isCatalogDesignUrl } from "../lib/products";
import SizePickerModal, { type SizeOption } from "../components/SizePickerModal";
import { getGarmentFrontAndBackSnapshots } from "../lib/garmentRenderer";
import {
  ArrowLeft,
  Sparkles,
  ShoppingBag,
  Heart,
  RotateCw,
  ZoomIn,
  RefreshCw,
  Eye,
  Sliders,
  Palette,
  Scissors,
  Move,
  Maximize2,
  Mic,
  Image as ImageIcon,
  Wand2,
  Check,
  Undo as UndoIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FolderHeart,
  Upload,
  X,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Plus,
  Minus,
  RotateCcw,
  Trash2,
  Crop,
  Loader2
} from "lucide-react";
import GrainOverlay from "../components/GrainOverlay";
import ImageCropModal from "../components/ImageCropModal";
import { captureDesignSnapshot, saveDesignSnapshot, loadDesignSnapshot } from "../lib/designSnapshots";
import type { DesignSource } from "@/components/viewer/useViewerStore";

// Dynamically import 3D Viewer to disable SSR (Window and WebGL references)
const TshirtViewer = dynamic(() => import("@/components/viewer/TshirtViewer"), {
  ssr: false,
});

const COLOR_SWATCHES = [
  { name: "White", hex: "#ffffff" },
  { name: "Black", hex: "#1a1a1a" },
  { name: "Cream", hex: "#f5e6d3" },
  { name: "Grey", hex: "#9ca3af" },
  { name: "Red", hex: "#8B0000" },
  { name: "Forest", hex: "#2d5016" },
  { name: "Royal", hex: "#1d4ed8" },
  { name: "Purple", hex: "#6b21a8" },
  { name: "Orange", hex: "#ea580c" },
];

const PROMPT_SUGGESTIONS = [
  "Create a cyberpunk wolf with neon blue accents.",
  "A Japanese cherry blossom dragon in watercolor style.",
  "Geometric mandala pattern with gold and purple tones.",
  "Abstract streetwear graffiti art with bold splashes.",
];

// Placement limits (shared by the on-stage placement panel)
const POS_X_RANGE: [number, number] = [-0.1, 0.1];
const POS_Y_RANGE: [number, number] = [-0.1, 0.2];
const SCALE_RANGE: [number, number] = [0.1, 0.6];
const clamp = (v: number, [min, max]: [number, number]) =>
  Math.round(Math.min(max, Math.max(min, v)) * 1000) / 1000;

// Button that repeats its action while held down (press-and-hold to keep nudging)
function HoldButton({
  onStep,
  title,
  children,
  className = "h-9 w-9",
}: {
  onStep: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    if (interval.current) clearInterval(interval.current);
    timer.current = null;
    interval.current = null;
  };

  useEffect(() => stop, []);

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onPointerDown={(e) => {
        e.preventDefault();
        onStep();
        timer.current = setTimeout(() => {
          interval.current = setInterval(onStep, 70);
        }, 350);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onStep();
        }
      }}
      className={`rounded-lg bg-neutral-100 hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100 text-neutral-700 flex items-center justify-center transition-colors cursor-pointer touch-none select-none ${className}`}
    >
      {children}
    </button>
  );
}

// Fabric colour context for the prompt refiner: swatch name (if any), hex and light/dark tone
function describeFabric(hex: string) {
  const swatch = COLOR_SWATCHES.find((s) => s.hex.toLowerCase() === hex.toLowerCase());
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  let tone: "light" | "dark" | undefined;
  if (m) {
    const n = parseInt(m[1], 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    tone = 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "light" : "dark";
  }
  return { hex: m ? `#${m[1]}` : hex, name: swatch?.name, tone };
}

function useRotatingPlaceholder() {
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % PROMPT_SUGGESTIONS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return { placeholderIdx, setPlaceholderIdx, placeholder: PROMPT_SUGGESTIONS[placeholderIdx] };
}

export default function DesignLabPage() {
  const { user } = useAuth();
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const updateCartItem = useCartStore((state) => state.updateItem);
  const cartItems = useCartStore((state) => state.items);

  // States from store
  const {
    color,
    design,
    view,
    size,
    quantity,
    customTextureUrl,
    customPrompt,
    designSource,
    decalScale,
    decalPosY,
    decalPosX,
    decalTarget,
    garmentType,
    setColor,
    setDesign,
    setView,
    setSize,
    setQuantity,
    setCustomTextureUrl,
    setCustomPrompt,
    setDesignSource,
    addToHistory,
    setDecalScale,
    setDecalPosY,
    setDecalPosX,
    setDecalTarget,
    setGarmentType,
    resetDecalPlacement,
  } = useViewerStore();

  // Rotating prompt placeholder hook
  const rotatingPlaceholder = useRotatingPlaceholder();

  // Local state controls
  const [prompt, setPrompt] = useState("");
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Keep the prompt box sized to its content, also when text is set programmatically (e.g. a refinement)
  useEffect(() => {
    const el = promptRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    el.style.overflowY = el.scrollHeight > 120 ? "auto" : "hidden";
  }, [prompt]);

  // ── Refine prompt with Gemini ──
  type Refinement = { refined: string; suggestions: string[]; tips: string[] };
  const [refining, setRefining] = useState(false);
  const [refinement, setRefinement] = useState<Refinement | null>(null);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [promptBeforeRefine, setPromptBeforeRefine] = useState<string | null>(null);
  const [appliedRefinement, setAppliedRefinement] = useState<string | null>(null);
  const refinePanelRef = useRef<HTMLDivElement>(null);

  // On small screens the suggestions open below the fold: bring them into view
  useEffect(() => {
    if (refinement) refinePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [refinement]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTool, setActiveTool] = useState<"color" | "garment" | "placement" | "size" | null>(null);
  const [selectedTag, setSelectedTag] = useState("Cyberpunk");
  const [autoRotate, setAutoRotate] = useState(false);
  const [zoomLevel, setZoomLevel] = useState("wide"); // wide, close
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [wishlistSuccess, setWishlistSuccess] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);
  const [showGarmentModal, setShowGarmentModal] = useState(true);
  // Upload-to-model (decal) state
  const [isUploading, setIsUploading] = useState(false);
  const [showPlacement, setShowPlacement] = useState(false);

  // When a cart item is reopened for editing, its id is kept here (and in sessionStorage so a reload keeps it)
  const EDITING_KEY = "yeulumin-editing-cart-item";
  const [editingCartId, setEditingCartIdState] = useState<string | null>(null);
  const setEditingCartId = (id: string | null) => {
    setEditingCartIdState(id);
    try {
      if (id) sessionStorage.setItem(EDITING_KEY, id);
      else sessionStorage.removeItem(EDITING_KEY);
    } catch {
      /* storage unavailable */
    }
  };
  const editingItem = editingCartId ? cartItems.find((i) => i.id === editingCartId) ?? null : null;

  // Crop / rounded-corner editor session
  const [cropSession, setCropSession] = useState<{
    source: DesignSource;
    target: "front" | "back";
    name: string;
  } | null>(null);

  const applyCroppedImage = (dataUrl: string, source: DesignSource) => {
    if (!cropSession) return;
    const { target, name } = cropSession;
    setCustomTextureUrl(dataUrl); // (clears designSource, so set it after)
    setDesignSource(source);
    setCustomPrompt(name);
    addToHistory(dataUrl);
    setDesign("ai");
    setDecalTarget(target);
    setView(target);
    setShowPlacement(true); // let the user fine-tune right away
    setCropSession(null);
  };

  // Re-open the editor for the design currently on the garment
  const openCropForCurrent = () => {
    if (!customTextureUrl) return;
    setCropSession({
      source: designSource ?? { src: customTextureUrl, crop: null, radius: 0, aspect: "free" },
      target: decalTarget,
      name: customPrompt || "Custom Design",
    });
  };
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasDesign = !!customTextureUrl || design !== "none";

  // Auto-cancel the delete confirmation after a few seconds
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  // Remove the current design (also from the saved/cached copy) so the user can start over.
  // Garment type and fabric color are kept.
  const handleDeleteDesign = () => {
    setCustomTextureUrl(null);
    setCustomPrompt(null);
    setDesign("none");
    resetDecalPlacement();
    setView("front");
    setShowPlacement(false);
    setConfirmDelete(false);
    // Drop ?texture= / ?preset= so a reload doesn't bring the old design back
    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  };
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const modelFileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadTarget = useRef<"front" | "back">("front");

  // Prompt reference image state
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceName, setReferenceName] = useState("");
  const refFileInputRef = useRef<HTMLInputElement>(null);

  // Validate, read and downscale an image file into a data URL
  const fileToDataUrl = async (
    file: File,
    mime: "image/png" | "image/jpeg" = "image/png",
    max = 1024,
    square = false // pad onto a transparent square so prints never stretch on the garment
  ): Promise<string> => {
    if (!file.type.startsWith("image/")) {
      throw new Error("Please upload an image file (PNG, JPG, WEBP, SVG).");
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("Image is too large. Please upload an image under 10MB.");
    }

    const originalUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that image. Please try another file."));
      el.src = originalUrl;
    });

    const w = img.naturalWidth || max;
    const h = img.naturalHeight || max;
    const ratio = Math.min(1, max / Math.max(w, h));
    const drawW = Math.max(1, Math.round(w * ratio));
    const drawH = Math.max(1, Math.round(h * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = square ? Math.max(drawW, drawH) : drawW;
    canvas.height = square ? Math.max(drawW, drawH) : drawH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported in this browser.");
    if (mime === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, (canvas.width - drawW) / 2, (canvas.height - drawH) / 2, drawW, drawH);
    return canvas.toDataURL(mime, 0.9);
  };

  // Open file picker for placing an image on the model at the chosen side
  const startModelUpload = (target: "front" | "back") => {
    pendingUploadTarget.current = target;
    setUploadMenuOpen(false);
    modelFileInputRef.current?.click();
  };

  // Apply an uploaded image directly to the 3D model (front or back)
  const handleModelImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    setIsUploading(true);
    try {
      // Keep a larger original so cropping still has detail; PNG preserves transparency
      const dataUrl = await fileToDataUrl(file, "image/png", 2048, false);
      setCropSession({
        source: { src: dataUrl, crop: null, radius: 0, aspect: "free" },
        target: pendingUploadTarget.current,
        name: file.name.replace(/\.[^.]+$/, "") || "Uploaded Design",
      });
    } catch (err: any) {
      console.error("Image upload failed:", err);
      alert(err?.message || "Failed to load that image. Please try another file.");
    } finally {
      setIsUploading(false);
    }
  };

  // Attach a reference image that guides AI generation
  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file, "image/jpeg", 768); // smaller payload for the API
      setReferenceImage(dataUrl);
      setReferenceName(file.name);
    } catch (err: any) {
      console.error("Reference image failed:", err);
      alert(err?.message || "Failed to load that image. Please try another file.");
    }
  };


  // Load preset or custom params on mount (after the saved design is restored, so URL params win)
  useEffect(() => {
    const applyParams = () => {
    const state = useViewerStore.getState();
    if (state.customTextureUrl && isCatalogDesignUrl(state.customTextureUrl)) {
      useViewerStore.setState({ customTextureUrl: null, designSource: null, design: "none" });
    }
    if (state.garmentChosen || state.customTextureUrl || state.design !== "none") {
      setShowGarmentModal(false); // a saved garment/design was restored
    }

    const searchParams = new URLSearchParams(window.location.search);

    // Reopen a design from the cart: /customize?edit=<cartItemId>
    const editId = searchParams.get("edit");
    if (editId) {
      const item = useCartStore.getState().items.find((i) => i.id === editId);
      loadDesignSnapshot(item?.designId ?? editId).then((snap) => {
        if (!snap) {
          alert("Sorry, the saved design for this cart item could not be found on this device.");
          return;
        }
        const { style, ...viewerFields } = snap;
        useViewerStore.setState({ ...viewerFields, garmentChosen: true });
        if (style) setSelectedTag(style);
        setEditingCartId(editId);
        setShowGarmentModal(false);
      });
      // Drop the param so a reload keeps the user's in-progress edits instead of reloading the snapshot
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    // Still editing a cart item after a reload?
    try {
      const pendingEdit = sessionStorage.getItem(EDITING_KEY);
      if (pendingEdit && useCartStore.getState().items.some((i) => i.id === pendingEdit)) {
        setEditingCartIdState(pendingEdit);
      } else if (pendingEdit) {
        sessionStorage.removeItem(EDITING_KEY);
      }
    } catch {
      /* storage unavailable */
    }
    // Catalog (Google Drive) designs are buy-only: they are never loaded into the Design Lab
    const rawTexture = searchParams.get("texture");
    const textureParam = rawTexture && !isCatalogDesignUrl(rawTexture) ? rawTexture : null;
    const nameParam = searchParams.get("name");
    const garmentParam = searchParams.get("garment");

    if (garmentParam === "hoodie" || garmentParam === "tshirt" || garmentParam === "oversized") {
      setGarmentType(garmentParam as "hoodie" | "tshirt" | "oversized");
      setShowGarmentModal(false);
    }

    if (textureParam) {
      setCustomTextureUrl(textureParam);
      setCustomPrompt(nameParam ? decodeURIComponent(nameParam) : "Custom Streetwear Graphic");
      setDesign("ai");
      setShowGarmentModal(false);
    }
    };

    if (useViewerStore.persist.hasHydrated()) {
      applyParams();
      return;
    }
    return useViewerStore.persist.onFinishHydration(() => applyParams());
  }, [setColor, setCustomTextureUrl, setCustomPrompt, setDesign, setView, setDecalTarget, setGarmentType]);

  const handleRefinePrompt = async () => {
    const idea = prompt.trim();
    if (!idea) {
      setRefinement(null);
      setRefineError("Type your idea first, then tap refine.");
      return;
    }
    setRefining(true);
    setRefineError(null);
    try {
      const res = await fetch("/api/refine-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: idea,
          style: selectedTag,
          garment: garmentType,
          printSide: decalTarget,
          fabric: describeFabric(color), // so suggestions use inks that read on this fabric colour
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Couldn't refine the prompt.");
      setRefinement({ refined: data.refined, suggestions: data.suggestions ?? [], tips: data.tips ?? [] });
    } catch (err) {
      setRefinement(null);
      setRefineError(err instanceof Error ? err.message : "Couldn't refine the prompt.");
    } finally {
      setRefining(false);
    }
  };

  const applyRefinedText = (text: string) => {
    setPromptBeforeRefine((prev) => prev ?? prompt); // remember the user's own wording once, for Undo
    setPrompt(text);
    setAppliedRefinement(text);
    setRefinement(null);
    promptRef.current?.focus();
  };

  // Synthesis generator using Stability AI
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);

    try {
      const fullPrompt = referenceImage
        ? `Using the attached image as a visual reference, ${prompt}, styled as a modern graphic design print decal, ${selectedTag.toLowerCase()} style, centered, high quality, vector graphic, isolated white background`
        : `${prompt}, styled as a modern graphic design print decal, ${selectedTag.toLowerCase()} style, centered, high quality, vector graphic, isolated white background`;

      const response = await fetch("/api/stability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: fullPrompt, referenceImage }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate design");
      }

      setCustomTextureUrl(data.image);
      setCustomPrompt(prompt);
      addToHistory(data.image);
      setDesign("ai");
    } catch (err) {
      console.error("AI Generation failed:", err);
      alert("Failed to synthesize design textures. Proceeding with default assets.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Add custom design to shopping cart
  const garmentPrice = garmentType === "hoodie" ? 1999 : garmentType === "oversized" ? 1299 : 999;

  // Add to Cart / Update first asks for a size (pre-selected with the current one)
  const [sizePromptMode, setSizePromptMode] = useState<"auto" | "new" | null>(null);
  const requestAddToCart = (mode: "auto" | "new") => {
    if (!user) {
      router.push(`/auth?redirect=/customize`);
      return;
    }
    setSizePromptMode(mode);
  };

  // Adds the design to the cart (saving an editable copy), or updates the cart item being edited
  const handleAddToCart = async (mode: "auto" | "new", chosenSize: SizeOption) => {
    if (!user) {
      router.push(`/auth?redirect=/customize`);
      return;
    }
    setSize(chosenSize); // keep the lab + saved snapshot in sync with the chosen size

    const updating = mode === "auto" && !!editingItem;
    setCartSuccess(true);
    const activeDecalUrl = customTextureUrl || (design === "logo" ? "/logos/trimmed_yeulumin ai-05.png" : null);
    const snapshots = await getGarmentFrontAndBackSnapshots(
      color,
      garmentType,
      activeDecalUrl,
      decalTarget,
      decalScale,
      decalPosX,
      decalPosY,
      view === "back" ? "back" : "front",
      design
    );

    const details = {
      name: `Custom ${selectedTag} ${garmentType === "hoodie" ? "Hoodie" : garmentType === "oversized" ? "Oversized Tee" : "Tee"}`,
      description: prompt || `Bespoke customized streetwear ${garmentType === "hoodie" ? "hoodie" : garmentType === "oversized" ? "oversized tee" : "garment"}.`,
      price: garmentPrice,
      size: chosenSize,
      color: color,
      image: snapshots.front,
      backImage: snapshots.back,
      prompt: customPrompt || prompt || "",
      style: selectedTag,
    };
    const designSnapshot = captureDesignSnapshot(selectedTag);

    if (updating && editingItem) {
      const designId = editingItem.designId ?? editingItem.id;
      await saveDesignSnapshot(designId, designSnapshot);
      updateCartItem(editingItem.id, { ...details, designId });
      setEditingCartId(null);
      setTimeout(() => {
        setCartSuccess(false);
        router.push("/cart");
      }, 900);
      return;
    }

    const id = `custom-lab-${Date.now()}`;
    // Save the editable copy first so the cart never points at a missing design
    await saveDesignSnapshot(id, designSnapshot);
    addItem({ id, ...details, quantity: 1, designId: id });
    if (mode === "new") setEditingCartId(null);

    setTimeout(() => setCartSuccess(false), 2500);
  };

  // Save custom design configuration to DB collection
  const handleSaveToCollection = async () => {
    if (!user) {
      router.push(`/auth?redirect=/customize`);
      return;
    }

    if (!isSupabaseConfigured()) {
      alert("Supabase is not configured.");
      return;
    }

    setWishlistSuccess(true);

    try {
      const activeDecalUrl = customTextureUrl || (design === "logo" ? "/logos/trimmed_yeulumin ai-05.png" : null);
      const snapshots = await getGarmentFrontAndBackSnapshots(
        color,
        garmentType,
        activeDecalUrl,
        decalTarget,
        decalScale,
        decalPosX,
        decalPosY,
        view === "back" ? "back" : "front",
        design
      );
      const { error } = await supabase.from("customizations").insert({
        user_id: user.id,
        name: `Bespoke ${selectedTag} ${garmentType === "hoodie" ? "Hoodie" : garmentType === "oversized" ? "Oversized Tee" : "Tee"}`,
        description: prompt || `Bespoke customized streetwear ${garmentType === "hoodie" ? "hoodie" : garmentType === "oversized" ? "oversized tee" : "garment"}.`,
        color,
        design: selectedTag.toLowerCase(),
        custom_texture_url: snapshots.front,
        custom_prompt: prompt,
        decal_scale: decalScale,
        decal_pos_x: decalPosX,
        decal_pos_y: decalPosY,
        decal_target: decalTarget,
      });

      if (error) throw error;
      setTimeout(() => setWishlistSuccess(false), 2500);
    } catch (err) {
      console.error("Save design failed:", err);
      alert("Failed to save customization to collection.");
      setWishlistSuccess(false);
    }
  };


  // The wand glows when there is fresh text to refine (not while refining, not while
  // suggestions are open, and not for a prompt that is already the AI-refined version)
  const refineReady =
    prompt.trim().length > 0 && !refining && !refinement && !isGenerating && prompt !== appliedRefinement;

  // Print placement controls (rendered over the stage on larger screens, below it on phones)
  const nudgeX = (d: number) => setDecalPosX(clamp(useViewerStore.getState().decalPosX + d, POS_X_RANGE));
  const nudgeY = (d: number) => setDecalPosY(clamp(useViewerStore.getState().decalPosY + d, POS_Y_RANGE));
  const nudgeScale = (d: number) => setDecalScale(clamp(useViewerStore.getState().decalScale + d, SCALE_RANGE));
  const moveBtn = "h-11 flex-1 sm:h-9 sm:w-9 sm:flex-none";

  const placementPanel = (
    <div className="bg-white/95 backdrop-blur-md border border-neutral-200 rounded-2xl shadow-xl p-3">
      <div className="flex items-center justify-between gap-2 mb-3 sm:mb-2.5">
        <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest font-bold whitespace-nowrap">
          Adjust print
        </span>
        <div className="flex items-center gap-1">
          {customTextureUrl && (
            <button
              type="button"
              onClick={openCropForCurrent}
              className="h-8 sm:h-7 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 hover:bg-blue-100 flex items-center gap-1 cursor-pointer"
              title="Crop the image and round its corners"
            >
              <Crop className="h-3.5 w-3.5" />
              <span className="sm:hidden">Crop</span>
              <span className="hidden sm:inline">Crop &amp; corners</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const target = decalTarget;
              resetDecalPlacement();
              setDecalTarget(target);
            }}
            className="h-8 sm:h-7 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-blue-600 hover:bg-blue-50 flex items-center gap-1 cursor-pointer"
            title="Reset position & size"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPlacement(false)}
            className="h-8 w-8 sm:h-7 sm:w-7 rounded-lg text-neutral-500 hover:bg-neutral-100 flex items-center justify-center cursor-pointer"
            title="Done"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Phones: 2-column grid with a full-width move row; larger screens: one row */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-4">
        {/* Side */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex w-full sm:w-auto bg-neutral-100 p-1 rounded-xl">
            {(["front", "back"] as const).map((target) => (
              <button
                key={target}
                type="button"
                onClick={() => {
                  setDecalTarget(target);
                  setView(target);
                }}
                className={`flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-[10px] font-bold uppercase rounded-lg cursor-pointer transition-all ${
                  decalTarget === target ? "bg-white text-blue-600 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {target}
              </button>
            ))}
          </div>
          <span className="text-[8px] font-mono uppercase tracking-wider text-neutral-400">Side</span>
        </div>

        {/* Size */}
        <div className="flex flex-col items-center gap-1 sm:order-last">
          <div className="flex items-center gap-1">
            <HoldButton title="Smaller" className="h-10 w-10 sm:h-9 sm:w-9" onStep={() => nudgeScale(-0.01)}>
              <Minus className="h-4 w-4" />
            </HoldButton>
            <span className="w-11 text-center text-xs font-bold text-neutral-700 tabular-nums">
              {Math.round(decalScale * 100)}%
            </span>
            <HoldButton title="Bigger" className="h-10 w-10 sm:h-9 sm:w-9" onStep={() => nudgeScale(0.01)}>
              <Plus className="h-4 w-4" />
            </HoldButton>
          </div>
          <span className="text-[8px] font-mono uppercase tracking-wider text-neutral-400">Size</span>
        </div>

        {/* Move */}
        <div className="col-span-2 flex flex-col items-center gap-1">
          <div className="flex w-full sm:w-auto items-center gap-1.5 sm:gap-1">
            <HoldButton title="Move left" className={moveBtn} onStep={() => nudgeX(-0.005)}>
              <ArrowLeft className="h-4 w-4" />
            </HoldButton>
            <HoldButton title="Move up" className={moveBtn} onStep={() => nudgeY(0.005)}>
              <ArrowUp className="h-4 w-4" />
            </HoldButton>
            <HoldButton title="Move down" className={moveBtn} onStep={() => nudgeY(-0.005)}>
              <ArrowDown className="h-4 w-4" />
            </HoldButton>
            <HoldButton title="Move right" className={moveBtn} onStep={() => nudgeX(0.005)}>
              <ArrowRight className="h-4 w-4" />
            </HoldButton>
          </div>
          <span className="text-[8px] font-mono uppercase tracking-wider text-neutral-400">Move (press &amp; hold)</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen flex flex-col bg-[#F5F6F8] text-[#0A0A0A] overflow-x-hidden antialiased">
      <GrainOverlay />

      {/* ─── DESIGN LAB HEADER TOP BAR ─── */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between z-20">
        <button
          onClick={() => router.back()}
          className="h-10 w-10 rounded-full bg-white border border-neutral-200 shadow-sm flex items-center justify-center hover:bg-neutral-50 transition-colors cursor-pointer"
          title="Back"
        >
          <ArrowLeft className="h-5 w-5 text-neutral-800" />
        </button>

        {/* Logo and title */}
        <div className="flex items-center gap-1.5">
          <img
            src="/logos/trimmed_yeulumin ai-05.png"
            alt="Yeulumin AI Logo"
            className="h-7 w-7 object-contain"
          />
          <span className="font-sans font-black text-base uppercase tracking-wider text-neutral-900">
            Yeulumin Ai
          </span>
        </div>

        {/* Right Save action pill */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveToCollection}
            className="p-2.5 rounded-full bg-white border border-neutral-200 text-neutral-500 hover:text-red-500 shadow-sm transition-colors cursor-pointer flex items-center justify-center"
            title="Save to Collection"
          >
            <FolderHeart className={`h-4.5 w-4.5 ${wishlistSuccess ? "text-red-500 fill-current" : ""}`} />
          </button>
        </div>
      </header>

      {/* ─── MAIN WORKSPACE CONTENT ─── */}
      <main className="flex-grow flex flex-col items-center justify-start relative select-none w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-1 pb-4 gap-3">
        
        {/* 3D MANNEQUIN SHOWROOM STAGE */}
        <div
          className={`w-full max-w-3xl min-h-[300px] max-h-[760px] relative flex items-center justify-center ${
            // On phones the placement panel (taller than the prompt box) sits below the stage
            showPlacement ? "h-[calc(100svh-21.5rem)] sm:h-[calc(100svh-17.5rem)]" : "h-[calc(100svh-17.5rem)]"
          }`}
        >
          
          {/* Orbital blue glow ring behind t-shirt mesh */}
          <div className="absolute inset-0 m-auto w-[18rem] h-[18rem] sm:w-[22rem] sm:h-[22rem] md:w-[28rem] md:h-[28rem] rounded-full border border-blue-500/10 bg-transparent flex items-center justify-center pointer-events-none select-none z-0">
            <div className="w-[16rem] h-[16rem] sm:w-[20rem] sm:h-[20rem] md:w-[26rem] md:h-[26rem] rounded-full border border-blue-400/20 blur-[8px] animate-pulse" />
          </div>

          {/* Three.js interactive model canvas */}
          <div className="absolute inset-0 z-10">
            <TshirtViewer
              scale={3.2}
              autoRotateSpeed={autoRotate ? 2.0 : 0}
              cameraDistance={zoomLevel === "close" ? 2.4 : 3.6}
            />
          </div>

          {/* TOP-LEFT FLOATING CAMERA CONTROL MODULE */}
          <div className="absolute left-0 top-0 z-20 flex flex-col">
            
            {/* View toggle button */}
            <button
              onClick={() => setViewMenuOpen(!viewMenuOpen)}
              className="bg-blue-600 text-white rounded-xl px-2.5 py-2.5 sm:px-3 sm:py-2 text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer hover:bg-blue-700 transition-colors"
              style={{ borderBottomLeftRadius: viewMenuOpen ? 0 : undefined, borderBottomRightRadius: viewMenuOpen ? 0 : undefined }}
              title="Toggle View Controls"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">View</span>
              <ChevronDown className={`hidden sm:block h-3 w-3 transition-transform duration-300 ${viewMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Collapsible controller card list */}
            <div
              className="bg-white border border-t-0 border-neutral-200/80 rounded-b-xl shadow-md overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                maxHeight: viewMenuOpen ? "220px" : "0px",
                opacity: viewMenuOpen ? 1 : 0,
                padding: viewMenuOpen ? "10px" : "0px 10px",
              }}
            >
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`flex flex-col items-center justify-center gap-1 p-1.5 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer ${
                    autoRotate ? "text-blue-600 font-bold" : "text-neutral-500"
                  }`}
                  title="Toggle Rotation"
                >
                  <RefreshCw className={`h-4.5 w-4.5 ${autoRotate ? "animate-spin-slow" : ""}`} />
                  <span className="text-[8px] font-mono uppercase tracking-wider">Rotate</span>
                </button>

                <button
                  onClick={() => setZoomLevel(zoomLevel === "wide" ? "close" : "wide")}
                  className={`flex flex-col items-center justify-center gap-1 p-1.5 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer ${
                    zoomLevel === "close" ? "text-blue-600 font-bold" : "text-neutral-500"
                  }`}
                  title="Toggle Zoom"
                >
                  <ZoomIn className="h-4.5 w-4.5" />
                  <span className="text-[8px] font-mono uppercase tracking-wider">Zoom</span>
                </button>

                <button
                  onClick={() => {
                    setColor("#ffffff");
                    setCustomTextureUrl(null);
                    setDesign("none");
                    resetDecalPlacement();
                    setAutoRotate(false);
                    setZoomLevel("wide");
                  }}
                  className="flex flex-col items-center justify-center gap-1 p-1.5 rounded-lg hover:bg-neutral-50 transition-colors text-neutral-500 cursor-pointer"
                  title="Reset Workspace"
                >
                  <Maximize2 className="h-4.5 w-4.5" />
                  <span className="text-[8px] font-mono uppercase tracking-wider">Reset</span>
                </button>
              </div>
            </div>

          </div>


          {/* EDITING-CART-ITEM BANNER */}
          {editingItem && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl pl-3 pr-1 py-1 shadow-sm max-w-[45%]">
              <ShoppingBag className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-widest truncate">
                Editing<span className="hidden sm:inline"> cart item</span>
              </span>
              <button
                type="button"
                onClick={() => setEditingCartId(null)}
                className="h-6 w-6 rounded-lg hover:bg-amber-100 flex items-center justify-center cursor-pointer flex-shrink-0"
                title="Stop editing (cart item stays unchanged)"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* TOP-RIGHT DELETE DESIGN BUTTON */}
          {hasDesign && (
            <button
              type="button"
              onClick={() => (confirmDelete ? handleDeleteDesign() : setConfirmDelete(true))}
              className={`absolute right-0 top-0 z-20 rounded-xl px-3 py-2 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-md cursor-pointer transition-colors ${
                confirmDelete
                  ? "bg-red-600 text-white hover:bg-red-700 shadow-red-600/20"
                  : "bg-white border border-neutral-200 text-neutral-600 hover:text-red-600 hover:border-red-200"
              }`}
              title="Delete this design and start over"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className={confirmDelete ? "" : "hidden sm:inline"}>{confirmDelete ? "Tap to confirm" : "Delete design"}</span>
            </button>
          )}

          {/* ON-STAGE PLACEMENT PANEL — desktop/tablet: floats over the stage */}
          {showPlacement && (
            <div className="hidden sm:block absolute bottom-2 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1rem)] max-w-md animate-fadeIn">
              {placementPanel}
            </div>
          )}

        </div>

        {/* PLACEMENT PANEL — phones: takes the prompt console's spot below the model */}
        {showPlacement && <div className="sm:hidden w-full z-20 animate-fadeIn">{placementPanel}</div>}

        {/* ─── AI GENERATOR INPUT CONSOLE (FLOATING CARD) ─── */}
        <section className={`w-full max-w-xl bg-white border border-neutral-200/80 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-lg z-20 flex-col gap-2.5 sm:gap-3 relative mx-auto ${showPlacement ? "hidden sm:flex" : "flex"}`}>
          
          {/* Prompt input with rotating placeholder carousel */}
          <div className="relative">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-[#3BA6FC] flex-shrink-0 mt-0.5" />
              <textarea
                ref={promptRef}
                rows={1}
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  if (refineError) setRefineError(null);
                }}
                onFocus={() => { if (PROMPT_SUGGESTIONS.includes(prompt)) setPrompt(""); }}
                disabled={isGenerating}
                placeholder={rotatingPlaceholder.placeholder}
                className="w-full bg-transparent text-xs sm:text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none leading-relaxed resize-none overflow-hidden"
                style={{ minHeight: '22px' }}
              />
            </div>

            {/* Dot indicators */}
            <div className="flex items-center justify-center gap-1.5 mt-2">
              {PROMPT_SUGGESTIONS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    rotatingPlaceholder.setPlaceholderIdx(idx);
                    setPrompt(PROMPT_SUGGESTIONS[idx]);
                  }}
                  className={`h-1.5 sm:h-2 rounded-full transition-all cursor-pointer ${
                    idx === rotatingPlaceholder.placeholderIdx
                      ? "w-1.5 sm:w-2 bg-[#3BA6FC]"
                      : "w-1.5 sm:w-2 bg-[#3BA6FC]/30 hover:bg-[#3BA6FC]/50"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Undo after applying a refinement */}
          {promptBeforeRefine !== null && !refinement && (
            <div className="flex items-center justify-between gap-2 -mt-1 text-[10px]">
              <span className="text-neutral-400 font-mono uppercase tracking-wider">AI-refined prompt</span>
              <button
                type="button"
                onClick={() => {
                  setPrompt(promptBeforeRefine);
                  setPromptBeforeRefine(null);
                }}
                className="font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                Undo — back to my text
              </button>
            </div>
          )}

          {/* Refinement error */}
          {refineError && (
            <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{refineError}</div>
          )}

          {/* Gemini refinement + suggestions */}
          {refinement && (
            <div
              ref={refinePanelRef}
              className="border border-blue-100 bg-blue-50/40 rounded-2xl p-2.5 sm:p-3 flex flex-col gap-2 max-h-[45svh] sm:max-h-80 overflow-y-auto scroll-mb-4 animate-fadeIn"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest font-bold text-blue-600">
                  <Wand2 className="h-3.5 w-3.5" />
                  Refined prompt
                </span>
                <button
                  type="button"
                  onClick={() => setRefinement(null)}
                  className="h-6 w-6 rounded-lg hover:bg-blue-100 text-neutral-500 flex items-center justify-center cursor-pointer"
                  title="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => applyRefinedText(refinement.refined)}
                className="text-left bg-white border border-blue-200 hover:border-blue-500 rounded-xl p-2.5 text-xs text-neutral-800 leading-relaxed cursor-pointer transition-colors group"
              >
                {refinement.refined}
                <span className="block mt-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 group-hover:underline">
                  Use this prompt
                </span>
              </button>

              {refinement.suggestions.length > 0 && (
                <>
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-neutral-400 mt-1">
                    Other directions
                  </span>
                  {refinement.suggestions.map((sugg, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyRefinedText(sugg)}
                      className="text-left bg-white border border-neutral-200 hover:border-blue-400 rounded-xl px-2.5 py-2 text-[11px] text-neutral-700 leading-relaxed cursor-pointer transition-colors"
                    >
                      {sugg}
                    </button>
                  ))}
                </>
              )}

              {refinement.tips.length > 0 && (
                <ul className="text-[10px] text-neutral-500 list-disc pl-4 space-y-0.5">
                  {refinement.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Attached reference image chip */}
          {referenceImage && (
            <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl p-1.5 pr-2 self-start max-w-full">
              <img
                src={referenceImage}
                alt="Reference"
                className="h-9 w-9 rounded-lg object-cover border border-neutral-200"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest font-bold">
                  Reference
                </span>
                <span className="text-[11px] text-neutral-700 truncate max-w-[180px]">{referenceName}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReferenceImage(null);
                  setReferenceName("");
                }}
                className="ml-1 h-5 w-5 rounded-full bg-neutral-200 hover:bg-neutral-300 text-neutral-600 flex items-center justify-center cursor-pointer"
                title="Remove reference image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Lower controls bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-2.5 sm:pt-3">
            
            {/* Input helpers */}
            <div className="flex items-center gap-1 text-neutral-500">
              <button
                type="button"
                className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-neutral-100 hover:bg-neutral-200 transition-colors cursor-pointer"
                title="Voice Input"
              >
                <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              {/* Reference image for the prompt */}
              <input
                ref={refFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleReferenceUpload}
              />
              <button
                type="button"
                onClick={() => refFileInputRef.current?.click()}
                disabled={isGenerating}
                className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl transition-colors cursor-pointer disabled:opacity-40 ${
                  referenceImage ? "bg-blue-50 text-blue-600" : "bg-neutral-100 hover:bg-neutral-200"
                }`}
                title="Attach Reference Image for Prompt"
              >
                <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>

              {/* Upload image directly onto the model (front / back) */}
              <input
                ref={modelFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleModelImageUpload}
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUploadMenuOpen(!uploadMenuOpen)}
                  disabled={isUploading || isGenerating}
                  className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl transition-colors cursor-pointer disabled:opacity-40 ${
                    uploadMenuOpen ? "bg-blue-50 text-blue-600" : "bg-neutral-100 hover:bg-neutral-200"
                  }`}
                  title="Upload Image to Model"
                >
                  <Upload className={`h-4 w-4 sm:h-5 sm:w-5 ${isUploading ? "animate-pulse text-blue-600" : ""}`} />
                </button>
                {uploadMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 z-30 bg-white border border-neutral-200 rounded-xl shadow-lg p-2 flex flex-col gap-1 min-w-[150px] animate-fadeIn">
                    <span className="px-2 pt-1 pb-1.5 text-[9px] font-mono text-neutral-400 uppercase tracking-widest font-bold">
                      Place image on
                    </span>
                    {(["front", "back"] as const).map((target) => (
                      <button
                        key={target}
                        type="button"
                        onClick={() => startModelUpload(target)}
                        className="text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer capitalize"
                      >
                        {target}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleRefinePrompt}
                disabled={refining || isGenerating}
                className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl transition-colors cursor-pointer disabled:opacity-60 ${
                  refineReady
                    ? "refine-glow bg-gradient-to-br from-blue-500 to-violet-500 text-white"
                    : refinement
                      ? "bg-blue-50 text-blue-600"
                      : "bg-neutral-100 hover:bg-neutral-200"
                }`}
                title={refineReady ? "Refine this prompt with AI" : "Refine prompt with AI"}
              >
                {refining ? (
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-blue-600" />
                ) : (
                  <Wand2 className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>
            </div>

            {/* Generate button - compact on mobile, pill on desktop */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="group btn-shine-sweep relative overflow-hidden px-4 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-[#3BA6FC] via-[#369CFD] to-[#307AFB] bg-[length:200%_auto] hover:bg-right text-white text-xs sm:text-sm font-bold rounded-full shadow-lg shadow-blue-400/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-1.5 sm:gap-2 cursor-pointer disabled:opacity-40"
            >
              <Sparkles className={`h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current transition-all duration-300 ${isGenerating ? "animate-spin" : "group-hover:scale-115 group-hover:rotate-12"}`} />
              <span>{isGenerating ? "Synthesizing..." : "Generate"}</span>
            </button>

          </div>

        </section>

        {/* ─── EXPANDABLE DRAWER OVERLAY FOR TOOLS ─── */}
        {activeTool && (
          <div className="w-full max-w-xl bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-md z-20 flex flex-col gap-4 animate-fadeIn">
            
            {/* COLOR DRAWER */}
            {activeTool === "color" && (
              <div className="flex flex-col gap-3 text-left">
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest font-bold">
                  Select Fabric Color
                </span>
                <div className="flex flex-wrap gap-3">
                  {COLOR_SWATCHES.map((swatch) => {
                    const isActive = color.toLowerCase() === swatch.hex.toLowerCase();
                    return (
                      <button
                        key={swatch.name}
                        onClick={() => setColor(swatch.hex)}
                        className={`h-9 w-9 rounded-full border-2 cursor-pointer transition-all duration-200 flex items-center justify-center ${
                          isActive
                            ? "border-blue-600 scale-108 shadow-md"
                            : "border-neutral-200 hover:scale-105"
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                        title={swatch.name}
                      >
                        {isActive && <Check className={`h-4.5 w-4.5 ${swatch.hex === "#ffffff" ? "text-black" : "text-white"}`} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* GARMENT SELECTOR DRAWER */}
            {activeTool === "garment" && (
              <div className="flex flex-col gap-4 text-left">
                
                {/* Select Garment Type */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest font-bold">
                    Select Garment Type
                  </span>
                  <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200 max-w-[280px]">
                    {(["tshirt", "oversized", "hoodie"] as const).map((type) => {
                      const isActive = garmentType === type;
                      return (
                        <button
                          key={type}
                          onClick={() => setGarmentType(type)}
                          className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg cursor-pointer transition-all ${
                            isActive ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                          }`}
                        >
                          {type === "tshirt" ? "T-Shirt" : type === "oversized" ? "Oversized" : "Hoodie"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Print Placement Front vs Back */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest font-bold">
                    Decal target placement
                  </span>
                  <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200 max-w-[200px]">
                    {(["front", "back"] as const).map((target) => {
                      const isActive = decalTarget === target;
                      return (
                        <button
                          key={target}
                          onClick={() => {
                            setDecalTarget(target);
                            setView(target);
                          }}
                          className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg cursor-pointer transition-all ${
                            isActive ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                          }`}
                        >
                          {target}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Size Swatch Picker */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest font-bold">
                    Select Fit size
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {["XS", "S", "M", "L", "XL", "XXL"].map((sz) => {
                      const isActive = size === sz;
                      return (
                        <button
                          key={sz}
                          onClick={() => setSize(sz as any)}
                          className={`h-8 w-12 text-[10px] font-bold rounded-lg border flex items-center justify-center cursor-pointer transition-all ${
                            isActive
                              ? "bg-black border-black text-white"
                              : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400"
                          }`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* ─── GARMENT STYLING TOOLS (PILLS BAR) ─── */}
        <section className="w-full max-w-xl bg-white border border-neutral-200/80 rounded-2xl px-5 py-3 shadow-md z-20 flex justify-around items-center">
          
          <button
            onClick={() => setActiveTool(activeTool === "color" ? null : "color")}
            className={`flex flex-col items-center gap-1 text-neutral-400 hover:text-neutral-800 transition-colors cursor-pointer ${
              activeTool === "color" ? "text-blue-600 font-semibold" : ""
            }`}
          >
            <Palette className="h-5 w-5" />
            <span className="text-[9px] uppercase font-bold tracking-wider">Color</span>
          </button>

          <button
            onClick={() => setActiveTool(activeTool === "garment" ? null : "garment")}
            className={`flex flex-col items-center gap-1 text-neutral-400 hover:text-neutral-800 transition-colors cursor-pointer ${
              activeTool === "garment" ? "text-blue-600 font-semibold" : ""
            }`}
          >
            <Scissors className="h-5 w-5" />
            <span className="text-[9px] uppercase font-bold tracking-wider">Garment</span>
          </button>

          <button
            onClick={() => {
              setShowPlacement(!showPlacement);
              setActiveTool(null);
            }}
            className={`flex flex-col items-center gap-1 text-neutral-400 hover:text-neutral-800 transition-colors cursor-pointer ${
              showPlacement ? "text-blue-600 font-semibold" : ""
            }`}
          >
            <Move className="h-5 w-5" />
            <span className="text-[9px] uppercase font-bold tracking-wider">Placement</span>
          </button>

          <button
            onClick={() => {
              setShowPlacement(!showPlacement);
              setActiveTool(null);
            }}
            className={`flex flex-col items-center gap-1 text-neutral-400 hover:text-neutral-800 transition-colors cursor-pointer ${
              showPlacement ? "text-blue-600 font-semibold" : ""
            }`}
          >
            <Maximize2 className="h-5 w-5" />
            <span className="text-[9px] uppercase font-bold tracking-wider">Size</span>
          </button>

          <button
            onClick={() => {
              resetDecalPlacement();
              setActiveTool(null);
            }}
            className="flex flex-col items-center gap-1 text-neutral-400 hover:text-neutral-800 transition-colors cursor-pointer"
          >
            <UndoIcon className="h-5 w-5" />
            <span className="text-[9px] uppercase font-bold tracking-wider">Undo</span>
          </button>

        </section>

        {/* Add to Cart CTA Button */}
        <div className="w-full max-w-xl z-20">
          <button
            onClick={() => requestAddToCart("auto")}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-500/20 hover:scale-101 active:scale-99 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ShoppingBag className="h-4.5 w-4.5" />
            <span>
              {editingItem
                ? cartSuccess
                  ? "Cart Updated!"
                  : `Update Cart Item (₹${garmentPrice})`
                : cartSuccess
                  ? "Added to Cart!"
                  : `Add to Cart (₹${garmentPrice})`}
            </span>
          </button>
          {editingItem && (
            <button
              type="button"
              onClick={() => requestAddToCart("new")}
              className="w-full mt-2 py-2 text-[11px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Or add as a new item
            </button>
          )}
        </div>

        {/* ─── AI STYLE PICKER (steers the prompt; catalog designs are buy-only and not shown here) ─── */}
        <section className="w-full my-8 text-left">
          
          <div className="flex items-center gap-2 mb-6">
            <h2 className="font-display text-lg font-black uppercase tracking-wider text-neutral-900">
              AI design style
            </h2>
            <div className="h-[2px] w-8 bg-neutral-900" />
          </div>

          {/* Filter Pills Category bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none w-full mb-6">
            <button
              onClick={() => setSelectedTag("Cyberpunk")}
              className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all duration-200 uppercase tracking-widest whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedTag === "Cyberpunk"
                  ? "bg-blue-50 border-blue-500 text-blue-600 font-bold shadow-sm"
                  : "bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-black"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 fill-current" />
              <span>Cyberpunk</span>
            </button>
            
            {["Anime", "Gym", "Minimal", "Luxury", "Streetwear", "Typography", "Vintage"].map((tag) => {
              const isActive = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all duration-200 uppercase tracking-widest whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-blue-50 border-blue-500 text-blue-600 font-bold shadow-sm"
                      : "bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-black"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>

        </section>

      </main>

      {/* SIZE PICKER (before adding / updating the cart) */}
      {sizePromptMode && (
        <SizePickerModal
          title={`Custom ${garmentType === "hoodie" ? "Hoodie" : garmentType === "oversized" ? "Oversized Tee" : "Tee"}`}
          price={garmentPrice}
          initialSize={size}
          confirmLabel={sizePromptMode === "auto" && editingItem ? "Update Cart Item" : "Add to Cart"}
          onConfirm={(chosen) => {
            const mode = sizePromptMode;
            setSizePromptMode(null);
            void handleAddToCart(mode, chosen);
          }}
          onClose={() => setSizePromptMode(null)}
        />
      )}

      {/* IMAGE CROP / ROUNDED CORNERS EDITOR */}
      {cropSession && (
        <ImageCropModal
          source={cropSession.source}
          onCancel={() => setCropSession(null)}
          onApply={applyCroppedImage}
        />
      )}

      {/* GARMENT SELECTION INITIAL MODAL POP-UP */}
      {showGarmentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fadeIn px-4">
          <div className="bg-white/95 backdrop-blur-2xl border border-neutral-200/90 shadow-[0_25px_60px_rgba(0,0,0,0.2)] rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center flex flex-col gap-6 animate-scaleUp relative overflow-hidden">
            
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-mono font-bold uppercase tracking-widest mb-3">
                <Sparkles className="w-3 h-3 text-blue-600" />
                <span>STEP 1: SELECT CANVAS</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-black uppercase tracking-wider text-neutral-900">
                Select Your Canvas
              </h2>
              <p className="text-xs text-neutral-500 font-mono mt-1 uppercase tracking-widest">
                Choose base garment structure
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3.5">
              {/* T-Shirt option */}
              <button
                onClick={() => {
                  setGarmentType("tshirt");
                  setShowGarmentModal(false);
                }}
                className={`relative flex flex-col items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 group cursor-pointer ${
                  garmentType === "tshirt"
                    ? "border-blue-600 bg-blue-50/40 ring-4 ring-blue-500/15 shadow-md"
                    : "border-neutral-200/70 bg-neutral-50/60 hover:border-blue-500 hover:bg-blue-50/20 hover:shadow-md"
                }`}
              >
                {garmentType === "tshirt" && (
                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <div className="h-14 w-14 rounded-2xl bg-white border border-neutral-200/80 group-hover:border-blue-200 group-hover:bg-blue-50/80 shadow-sm flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                  <svg className={`w-7 h-7 transition-colors ${garmentType === "tshirt" ? "text-blue-600" : "text-neutral-700 group-hover:text-blue-600"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3.5L9.5 2h5L18 3.5l3.5 4-2.5 3-2.5-1.5V21H7.5V9L5 10.5l-2.5-3L6 3.5z" />
                    <path d="M9.5 2c0 1.5 1.1 2.5 2.5 2.5s2.5-1 2.5-2.5" />
                  </svg>
                </div>
                <div className="mt-3">
                  <span className={`text-[11px] font-bold uppercase block tracking-tight transition-colors ${garmentType === "tshirt" ? "text-blue-600" : "text-neutral-900 group-hover:text-blue-600"}`}>
                    Streetwear Tshirt
                  </span>
                  <span className="text-[9px] text-neutral-400 font-mono block mt-0.5">Classic crewneck</span>
                </div>
              </button>

              {/* Oversized T-Shirt option */}
              <button
                onClick={() => {
                  setGarmentType("oversized");
                  setShowGarmentModal(false);
                }}
                className={`relative flex flex-col items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 group cursor-pointer ${
                  garmentType === "oversized"
                    ? "border-blue-600 bg-blue-50/40 ring-4 ring-blue-500/15 shadow-md"
                    : "border-neutral-200/70 bg-neutral-50/60 hover:border-blue-500 hover:bg-blue-50/20 hover:shadow-md"
                }`}
              >
                {garmentType === "oversized" && (
                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <div className="h-14 w-14 rounded-2xl bg-white border border-neutral-200/80 group-hover:border-blue-200 group-hover:bg-blue-50/80 shadow-sm flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                  <svg className={`w-7 h-7 transition-colors ${garmentType === "oversized" ? "text-blue-600" : "text-neutral-700 group-hover:text-blue-600"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 4.5L8.5 2h7l5 2.5 3 4.5-3.5 3-2.5-1.5V22H6.5V11L4 12.5 1 9.5l2.5-5z" />
                    <path d="M8.5 2c0 2 1.5 3.2 3.5 3.2s3.5-1.2 3.5-3.2" />
                    <path d="M6.5 10.5h11" strokeDasharray="2 2" />
                  </svg>
                </div>
                <div className="mt-3">
                  <span className={`text-[11px] font-bold uppercase block tracking-tight transition-colors ${garmentType === "oversized" ? "text-blue-600" : "text-neutral-900 group-hover:text-blue-600"}`}>
                    Oversized Tshirt
                  </span>
                  <span className="text-[9px] text-neutral-400 font-mono block mt-0.5">Drop-shoulder fit</span>
                </div>
              </button>

              {/* Hoodie option */}
              <button
                onClick={() => {
                  setGarmentType("hoodie");
                  setShowGarmentModal(false);
                }}
                className={`relative flex flex-col items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 group cursor-pointer ${
                  garmentType === "hoodie"
                    ? "border-blue-600 bg-blue-50/40 ring-4 ring-blue-500/15 shadow-md"
                    : "border-neutral-200/70 bg-neutral-50/60 hover:border-blue-500 hover:bg-blue-50/20 hover:shadow-md"
                }`}
              >
                {garmentType === "hoodie" && (
                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <div className="h-14 w-14 rounded-2xl bg-white border border-neutral-200/80 group-hover:border-blue-200 group-hover:bg-blue-50/80 shadow-sm flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                  <svg className={`w-7 h-7 transition-colors ${garmentType === "hoodie" ? "text-blue-600" : "text-neutral-700 group-hover:text-blue-600"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 5.5L9.5 3h5L18 5.5l3.5 4-2.5 3-2-1.5V22H7V11L5 12.5 2.5 9.5 6 5.5z" />
                    <path d="M9.5 3a2.5 2.5 0 005 0" />
                    <path d="M12 3v5.5" />
                    <path d="M9.5 11.5a2.5 2.5 0 005 0" />
                    <path d="M8.5 16h7v4.5h-7z" />
                  </svg>
                </div>
                <div className="mt-3">
                  <span className={`text-[11px] font-bold uppercase block tracking-tight transition-colors ${garmentType === "hoodie" ? "text-blue-600" : "text-neutral-900 group-hover:text-blue-600"}`}>
                    Premium Hoodie
                  </span>
                  <span className="text-[9px] text-neutral-400 font-mono block mt-0.5">Heavy fleece</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
