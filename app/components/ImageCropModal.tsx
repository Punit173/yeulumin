"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Crop, RotateCcw, X, Check } from "lucide-react";
import type { DesignSource } from "@/components/viewer/useViewerStore";

type Rect = { x: number; y: number; w: number; h: number };
type DragMode = "move" | "nw" | "ne" | "sw" | "se";

const ASPECTS: { id: string; label: string; ratio: number | null }[] = [
  { id: "free", label: "Free", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
];

const MAX_OUTPUT = 1024;

function ratioOf(aspect: string) {
  return ASPECTS.find((a) => a.id === aspect)?.ratio ?? null;
}

// Largest rect with the given ratio, centered on `around`, that fits inside the image
function fitAspect(around: Rect, ratio: number, imgW: number, imgH: number): Rect {
  const cx = around.x + around.w / 2;
  const cy = around.y + around.h / 2;
  let w = Math.min(around.w, imgW);
  let h = w / ratio;
  if (h > Math.min(around.h, imgH)) {
    h = Math.min(around.h, imgH);
    w = h * ratio;
  }
  const x = Math.min(Math.max(0, cx - w / 2), imgW - w);
  const y = Math.min(Math.max(0, cy - h / 2), imgH - h);
  return { x, y, w, h };
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

interface ImageCropModalProps {
  source: DesignSource;
  onCancel: () => void;
  /** squareDataUrl: cropped + rounded image padded onto a transparent square (ready for the garment) */
  onApply: (squareDataUrl: string, source: DesignSource) => void;
}

export default function ImageCropModal({ source, onCancel, onApply }: ImageCropModalProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [crop, setCrop] = useState<Rect | null>(null);
  const [aspect, setAspect] = useState(source.aspect || "free");
  const [radius, setRadius] = useState(source.radius || 0);
  const [displayScale, setDisplayScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ mode: DragMode; startX: number; startY: number; start: Rect } | null>(null);

  // Load the source image
  useEffect(() => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => {
      setImg(el);
      const full = { x: 0, y: 0, w: el.naturalWidth, h: el.naturalHeight };
      const saved = source.crop;
      const valid =
        saved && saved.w > 0 && saved.h > 0 && saved.x + saved.w <= el.naturalWidth + 1 && saved.y + saved.h <= el.naturalHeight + 1;
      setCrop(valid ? saved : full);
    };
    el.onerror = () => setLoadError(true);
    el.src = source.src;
  }, [source]);

  // Fit the image into the available space
  useEffect(() => {
    if (!img) return;
    const fit = () => {
      const maxW = Math.min(460, window.innerWidth - 56);
      const maxH = Math.min(420, window.innerHeight * 0.5);
      setDisplayScale(Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [img]);

  // Pointer drag (move / resize corners)
  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const d = drag.current;
      if (!d || !img) return;
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      const dx = (e.clientX - d.startX) / displayScale;
      const dy = (e.clientY - d.startY) / displayScale;
      const s = d.start;
      const minSize = Math.max(16, Math.min(imgW, imgH) * 0.05);

      if (d.mode === "move") {
        setCrop({
          ...s,
          x: Math.min(Math.max(0, s.x + dx), imgW - s.w),
          y: Math.min(Math.max(0, s.y + dy), imgH - s.h),
        });
        return;
      }

      const west = d.mode === "nw" || d.mode === "sw";
      const north = d.mode === "nw" || d.mode === "ne";
      // Opposite (anchored) corner
      const ax = west ? s.x + s.w : s.x;
      const ay = north ? s.y + s.h : s.y;
      // Space available from the anchor toward the dragged corner
      const roomW = west ? ax : imgW - ax;
      const roomH = north ? ay : imgH - ay;

      let w = Math.min(roomW, Math.max(minSize, s.w + (west ? -dx : dx)));
      let h = Math.min(roomH, Math.max(minSize, s.h + (north ? -dy : dy)));

      const ratio = ratioOf(aspect);
      if (ratio) {
        h = w / ratio;
        if (h > roomH) {
          h = roomH;
          w = h * ratio;
        }
      }

      setCrop({ x: west ? ax - w : ax, y: north ? ay - h : ay, w, h });
    },
    [img, displayScale, aspect]
  );

  const endDrag = useCallback(() => {
    drag.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [onPointerMove, endDrag]);

  const startDrag = (mode: DragMode, e: React.PointerEvent) => {
    if (!crop) return;
    e.preventDefault();
    e.stopPropagation();
    drag.current = { mode, startX: e.clientX, startY: e.clientY, start: crop };
  };

  const changeAspect = (id: string) => {
    setAspect(id);
    const ratio = ratioOf(id);
    if (ratio && crop && img) setCrop(fitAspect(crop, ratio, img.naturalWidth, img.naturalHeight));
  };

  const resetAll = () => {
    if (!img) return;
    setAspect("free");
    setRadius(0);
    setCrop({ x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight });
  };

  const handleApply = () => {
    if (!img || !crop) return;
    setBusy(true);
    try {
      const scale = Math.min(1, MAX_OUTPUT / Math.max(crop.w, crop.h));
      const outW = Math.max(1, Math.round(crop.w * scale));
      const outH = Math.max(1, Math.round(crop.h * scale));
      const side = Math.max(outW, outH);

      // Draw the cropped region, clipped to a rounded rect, centered on a transparent square
      const canvas = document.createElement("canvas");
      canvas.width = side;
      canvas.height = side;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      const ox = (side - outW) / 2;
      const oy = (side - outH) / 2;
      const r = (radius / 100) * Math.min(outW, outH);
      ctx.save();
      roundedRectPath(ctx, ox, oy, outW, outH, r);
      ctx.clip();
      ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, ox, oy, outW, outH);
      ctx.restore();

      onApply(canvas.toDataURL("image/png"), {
        src: source.src,
        crop: { x: Math.round(crop.x), y: Math.round(crop.y), w: Math.round(crop.w), h: Math.round(crop.h) },
        radius,
        aspect,
      });
    } catch (err) {
      console.error("Crop failed:", err);
      alert("Could not process this image. Please try another one.");
    } finally {
      setBusy(false);
    }
  };

  const dispW = img ? img.naturalWidth * displayScale : 0;
  const dispH = img ? img.naturalHeight * displayScale : 0;
  const box = crop
    ? { left: crop.x * displayScale, top: crop.y * displayScale, width: crop.w * displayScale, height: crop.h * displayScale }
    : null;
  const boxRadius = box ? (radius / 100) * Math.min(box.width, box.height) : 0;

  const handle = (mode: DragMode, pos: string) => (
    // 40px invisible hit area (easy to grab with a finger) around a small visible dot
    <div
      onPointerDown={(e) => startDrag(mode, e)}
      className={`absolute h-10 w-10 -m-5 flex items-center justify-center touch-none ${pos}`}
      style={{ cursor: mode === "nw" || mode === "se" ? "nwse-resize" : "nesw-resize" }}
    >
      <div className="h-5 w-5 rounded-full bg-white border-2 border-blue-600 shadow pointer-events-none" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm px-3 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-4 sm:p-5 flex flex-col gap-4 max-h-[95svh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crop className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-black uppercase tracking-wider text-neutral-900">Edit image</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="h-8 w-8 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-500 cursor-pointer"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Crop stage */}
        <div
          className="mx-auto rounded-xl flex items-center justify-center select-none"
          style={{
            backgroundImage:
              "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)",
            backgroundSize: "16px 16px",
            backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
          }}
        >
          {loadError ? (
            <div className="p-10 text-xs text-red-600">Could not load this image.</div>
          ) : !img || !box ? (
            <div className="p-10 text-xs text-neutral-500">Loading image…</div>
          ) : (
            <div className="relative overflow-hidden touch-none" style={{ width: dispW, height: dispH }}>
              <img src={source.src} alt="" draggable={false} className="block w-full h-full pointer-events-none" />
              {/* Crop box: the huge shadow dims everything outside it, the radius previews rounding */}
              <div
                onPointerDown={(e) => startDrag("move", e)}
                className="absolute border-2 border-white cursor-move touch-none"
                style={{
                  ...box,
                  borderRadius: boxRadius,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                }}
              >
                {/* Rule-of-thirds guides */}
                <div className="absolute inset-0 pointer-events-none opacity-40">
                  <div className="absolute left-1/3 top-0 bottom-0 border-l border-white" />
                  <div className="absolute left-2/3 top-0 bottom-0 border-l border-white" />
                  <div className="absolute top-1/3 left-0 right-0 border-t border-white" />
                  <div className="absolute top-2/3 left-0 right-0 border-t border-white" />
                </div>
              </div>
              {/* Corner handles (outside the rounded box so they stay grabbable) */}
              <div className="absolute pointer-events-none" style={box}>
                <div className="relative w-full h-full pointer-events-none [&>*]:pointer-events-auto">
                  {handle("nw", "left-0 top-0")}
                  {handle("ne", "right-0 top-0")}
                  {handle("sw", "left-0 bottom-0")}
                  {handle("se", "right-0 bottom-0")}
                </div>
              </div>
            </div>
          )}
        </div>
        <p className="text-[10px] text-neutral-400 text-center -mt-2">Drag the box to move it · drag the corners to resize</p>

        {/* Aspect ratio */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest font-bold">Crop shape</span>
          <div className="flex flex-wrap gap-1.5">
            {ASPECTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => changeAspect(a.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors ${
                  aspect === a.id
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Corner rounding */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] font-mono text-neutral-400 uppercase tracking-widest font-bold">
            <span>Corner rounding</span>
            <span className="text-neutral-700">{radius === 50 ? "Circle / pill" : `${radius}%`}</span>
          </div>
          <input
            type="range"
            min={0}
            max={50}
            step={1}
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value, 10))}
            className="w-full accent-blue-600 h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex gap-1.5">
            {[
              { v: 0, label: "Square" },
              { v: 12, label: "Soft" },
              { v: 25, label: "Round" },
              { v: 50, label: "Circle" },
            ].map((p) => (
              <button
                key={p.v}
                type="button"
                onClick={() => setRadius(p.v)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border cursor-pointer transition-colors ${
                  radius === p.v ? "border-blue-600 text-blue-600 bg-blue-50" : "border-neutral-200 text-neutral-500 hover:border-neutral-400"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={resetAll}
            className="px-3 py-2.5 rounded-xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-600 border border-neutral-200 hover:bg-neutral-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!img || !crop || busy}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="h-3.5 w-3.5" />
            <span className="sm:hidden">Apply</span>
            <span className="hidden sm:inline">Apply to garment</span>
          </button>
        </div>
      </div>
    </div>
  );
}
