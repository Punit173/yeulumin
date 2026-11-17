import { NextRequest, NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Browsers keep images for a day and may show a cached copy for a week while revalidating
const CACHE_HEADER = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800";

// Small in-memory LRU so repeat requests (other visitors, reloads that skip the browser cache)
// don't go back to Google Drive every time.
const MAX_ENTRIES = 150;
const MAX_TOTAL_BYTES = 80 * 1024 * 1024; // ~80MB
const memCache = new Map<string, { body: ArrayBuffer; type: string }>();
let totalBytes = 0;
const inflight = new Map<string, Promise<{ body: ArrayBuffer; type: string } | null>>();

function remember(id: string, entry: { body: ArrayBuffer; type: string }) {
  if (entry.body.byteLength > MAX_TOTAL_BYTES / 4) return; // don't let one huge file evict everything
  memCache.set(id, entry);
  totalBytes += entry.body.byteLength;
  while (memCache.size > MAX_ENTRIES || totalBytes > MAX_TOTAL_BYTES) {
    const oldestKey = memCache.keys().next().value as string;
    totalBytes -= memCache.get(oldestKey)!.body.byteLength;
    memCache.delete(oldestKey);
  }
}

function recall(id: string) {
  const hit = memCache.get(id);
  if (hit) {
    // refresh LRU position
    memCache.delete(id);
    memCache.set(id, hit);
  }
  return hit;
}

// Optional resized variants for thumbnails (?w=256|512|1024). Without `w` the original is served.
const ALLOWED_WIDTHS = new Set([256, 512, 1024]);

async function fetchFromDrive(fileId: string, width: number | null): Promise<{ body: ArrayBuffer; type: string } | null> {
  const urls = [
    width ? `https://lh3.googleusercontent.com/d/${fileId}=w${width}` : `https://lh3.googleusercontent.com/d/${fileId}`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width ?? 1000}`, // fallback
  ];
  for (const url of urls) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) {
      return { body: await res.arrayBuffer(), type: res.headers.get("content-type") || "image/png" };
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const fileId = params.get("id");

  if (!fileId || !/^[\w-]+$/.test(fileId)) {
    return new NextResponse("Missing or invalid file ID", { status: 400 });
  }
  const requestedWidth = Number(params.get("w"));
  const width = ALLOWED_WIDTHS.has(requestedWidth) ? requestedWidth : null;
  const cacheKey = width ? `${fileId}:w${width}` : fileId;

  // Drive file ids are stable, so the id itself works as a validator: a browser revalidating
  // a cached copy gets a cheap 304 instead of the full image again.
  const etag = `"gd-${cacheKey}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag, "Cache-Control": CACHE_HEADER } });
  }

  try {
    let entry = recall(cacheKey);
    if (!entry) {
      let pending = inflight.get(cacheKey);
      if (!pending) {
        pending = fetchFromDrive(fileId, width).finally(() => inflight.delete(cacheKey));
        inflight.set(cacheKey, pending);
      }
      const fetched = await pending;
      if (!fetched) {
        return new NextResponse("Failed to fetch image from Google Drive", { status: 502 });
      }
      remember(cacheKey, fetched);
      entry = fetched;
    }

    return new NextResponse(entry.body, {
      headers: {
        "Content-Type": entry.type,
        "Cache-Control": CACHE_HEADER,
        ETag: etag,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Error proxying image", { status: 500 });
  }
}
