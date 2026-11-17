import { captureGarmentViews } from "@/components/viewer/snapshotRegistry";

export async function renderGarment2DView(
  shirtColor: string,
  garmentType: "tshirt" | "hoodie" | "oversized" = "tshirt",
  view: "front" | "back" = "front",
  decalUrl: string | null = null,
  decalTarget: "front" | "back" = "front",
  decalScale: number = 0.35,
  decalPosX: number = 0,
  decalPosY: number = 0.05,
  designId: string = "ai"
): Promise<string> {
  if (typeof window === "undefined") return "/tshirt-blank.png";

  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 300;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "/tshirt-blank.png";

  // Clean background
  ctx.fillStyle = "#F5F6F8";
  ctx.fillRect(0, 0, 300, 300);

  const cx = 150;
  const cy = 150;

  ctx.save();

  // Draw Garment Base Fill
  ctx.fillStyle = shirtColor || "#ffffff";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  if (garmentType === "hoodie") {
    ctx.moveTo(cx - 35, cy - 90);
    ctx.quadraticCurveTo(cx, cy - 110, cx + 35, cy - 90);
    ctx.lineTo(cx + 95, cy - 50);
    ctx.lineTo(cx + 85, cy + 20);
    ctx.lineTo(cx + 65, cy + 10);
    ctx.lineTo(cx + 65, cy + 100);
    ctx.lineTo(cx - 65, cy + 100);
    ctx.lineTo(cx - 65, cy + 10);
    ctx.lineTo(cx - 85, cy + 20);
    ctx.lineTo(cx - 95, cy - 50);
    ctx.closePath();
  } else {
    const sleeveW = garmentType === "oversized" ? 105 : 90;
    const sleeveH = garmentType === "oversized" ? 30 : 15;
    const bodyW = garmentType === "oversized" ? 70 : 62;

    ctx.moveTo(cx - 30, cy - 70);
    if (view === "front") {
      ctx.quadraticCurveTo(cx, cy - 40, cx + 30, cy - 70);
    } else {
      ctx.quadraticCurveTo(cx, cy - 60, cx + 30, cy - 70);
    }
    ctx.lineTo(cx + sleeveW, cy - 45);
    ctx.lineTo(cx + sleeveW - 10, cy + sleeveH);
    ctx.lineTo(cx + bodyW, cy + 5);
    ctx.lineTo(cx + bodyW, cy + 95);
    ctx.lineTo(cx - bodyW, cy + 95);
    ctx.lineTo(cx - bodyW, cy + 5);
    ctx.lineTo(cx - (sleeveW - 10), cy + sleeveH);
    ctx.lineTo(cx - sleeveW, cy - 45);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();

  // Interior seams
  ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
  ctx.lineWidth = 1.5;

  if (view === "front") {
    ctx.beginPath();
    ctx.arc(cx, cy - 65, 24, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    if (garmentType === "hoodie") {
      ctx.beginPath();
      ctx.rect(cx - 45, cy + 40, 90, 50);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy - 68, 24, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("YEULUMIN AI", cx, cy - 48);
  }

  // Draw Decal/Design on matching target side
  const isTargetView = (view === decalTarget);
  if (isTargetView) {
    const effectiveUrl = decalUrl || (designId === "logo" ? "/logos/trimmed_yeulumin ai-05.png" : null);

    if (effectiveUrl) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const dWidth = 130 * decalScale;
          const dHeight = (img.naturalHeight / img.naturalWidth) * dWidth;
          const dx = cx + (decalPosX * 150) - dWidth / 2;
          const dy = cy + (decalPosY * 150) - dHeight / 2;

          ctx.save();
          ctx.drawImage(img, dx, dy, dWidth, dHeight);
          ctx.restore();
          resolve();
        };
        img.onerror = () => resolve();
        img.src = effectiveUrl;
      });
    } else if (designId === "stripe" || designId === "circuit" || designId === "abstract") {
      // Procedural decal overlay
      ctx.save();
      const dSize = 130 * decalScale;
      const dx = cx + (decalPosX * 150) - dSize / 2;
      const dy = cy + (decalPosY * 150) - dSize / 2;

      ctx.translate(dx, dy);

      if (designId === "stripe") {
        ctx.fillStyle = "rgba(0, 163, 255, 0.7)";
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(0, i * (dSize / 5), dSize, dSize / 10);
        }
      } else if (designId === "circuit") {
        ctx.strokeStyle = "#00FFB2";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(10, 10);
        ctx.lineTo(dSize / 2, 10);
        ctx.lineTo(dSize / 2, dSize - 10);
        ctx.lineTo(dSize - 10, dSize - 10);
        ctx.stroke();
      } else if (designId === "abstract") {
        const grad = ctx.createRadialGradient(dSize / 2, dSize / 2, 0, dSize / 2, dSize / 2, dSize / 2);
        grad.addColorStop(0, "rgba(123, 47, 255, 0.8)");
        grad.addColorStop(1, "rgba(0, 255, 178, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, dSize, dSize);
      }
      ctx.restore();
    }
  }

  ctx.restore();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export async function getGarmentFrontAndBackSnapshots(
  color: string,
  garmentType: "tshirt" | "hoodie" | "oversized",
  customTextureUrl: string | null,
  decalTarget: "front" | "back",
  decalScale: number,
  decalPosX: number,
  decalPosY: number,
  currentView: "front" | "back" = "front",
  designId: string = "ai"
): Promise<{ front: string; back: string }> {
  // Preferred: real front & back renders of the 3D garment exactly as designed
  const live = captureGarmentViews(512);
  if (live) return live;

  // Fallback (no 3D viewer on screen): simplified 2D drawings
  let frontSnapshot = await renderGarment2DView(
    color,
    garmentType,
    "front",
    customTextureUrl,
    decalTarget,
    decalScale,
    decalPosX,
    decalPosY,
    designId
  );

  let backSnapshot = await renderGarment2DView(
    color,
    garmentType,
    "back",
    customTextureUrl,
    decalTarget,
    decalScale,
    decalPosX,
    decalPosY,
    designId
  );

  // If live 3D WebGL canvas is available on screen, capture active frame
  if (typeof document !== "undefined") {
    try {
      const webglCanvas = document.querySelector("#tshirt-canvas canvas") as HTMLCanvasElement | null;
      if (webglCanvas) {
        const offscreen = document.createElement("canvas");
        offscreen.width = 300;
        offscreen.height = 300;
        const ctx = offscreen.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#F5F6F8";
          ctx.fillRect(0, 0, 300, 300);
          ctx.drawImage(webglCanvas, 0, 0, 300, 300);
          const dataUrl = offscreen.toDataURL("image/jpeg", 0.85);
          if (dataUrl && dataUrl.length > 200) {
            if (currentView === "back") {
              backSnapshot = dataUrl;
            } else {
              frontSnapshot = dataUrl;
            }
          }
        }
      }
    } catch (err) {
      console.error("Error capturing 3D canvas snapshot:", err);
    }
  }

  return { front: frontSnapshot, back: backSnapshot };
}
