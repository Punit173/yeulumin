import { NextResponse } from "next/server";

export interface DriveProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  badge?: "Bestseller" | "New Drop" | "AI Generated";
  image: string;
  category: string;
  tags: string[];
  defaultColor?: string;
  defaultView?: "front" | "back";
  printPosition?: "front" | "back";
  version?: string;
  fileId: string;
}

const ROOT_FOLDER_ID = "19lQ1ZWiZtkW-KD9AH8dRDKT_AEwHK3dF";

// In-memory cache to prevent hitting Google Drive on every HTTP request
let cachedData: { categories: string[]; products: DriveProduct[] } | null = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    next: { revalidate: 300 }, // Next.js fetch cache 5 minutes
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return res.text();
}

function parseEmbeddedHtml(html: string) {
  const items: {
    id: string;
    title: string;
    url: string;
    isFolder: boolean;
    thumb: string | null;
    directUrl: string | null;
  }[] = [];

  const entryRegex =
    /<div class="flip-entry"[^>]*id="entry-([^"]+)"[\s\S]*?<a href="([^"]+)"[\s\S]*?<div class="flip-entry-title">([^<]+)<\/div>/g;

  let match;
  while ((match = entryRegex.exec(html)) !== null) {
    const id = match[1];
    const url = match[2];
    const rawTitle = match[3].trim();
    const isFolder = url.includes("/drive/folders/");

    const chunk = match[0];
    const imgMatch = chunk.match(/<img src="([^"]+)"/);
    const thumb = imgMatch ? imgMatch[1] : null;

    items.push({
      id,
      title: rawTitle,
      url,
      isFolder,
      thumb,
      directUrl: isFolder ? null : `/api/gdrive/image?id=${id}`,
    });
  }

  return items;
}

function cleanTitleToName(title: string, index: number): string {
  const nameWithoutExt = title.replace(/\.(png|jpg|jpeg|webp)$/i, "").trim();
  return nameWithoutExt || title.trim();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";
    const now = Date.now();

    if (!forceRefresh && cachedData && now - lastFetchTime < CACHE_DURATION_MS) {
      return NextResponse.json(cachedData, {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60",
        },
      });
    }

    // 1. Fetch root folder HTML
    const rootHtml = await fetchHtml(
      `https://drive.google.com/embeddedfolderview?id=${ROOT_FOLDER_ID}#grid`
    );
    const rootItems = parseEmbeddedHtml(rootHtml);

    const categoriesSet = new Set<string>();
    const products: DriveProduct[] = [];

    // 2. Fetch each subfolder (Category) concurrently
    const folderPromises = rootItems
      .filter((item) => item.isFolder)
      .map(async (folder) => {
        const catName = folder.title.trim();
        categoriesSet.add(catName);

        try {
          const subHtml = await fetchHtml(
            `https://drive.google.com/embeddedfolderview?id=${folder.id}#grid`
          );
          const subFiles = parseEmbeddedHtml(subHtml).filter((f) => !f.isFolder);

          return {
            category: catName,
            files: subFiles,
          };
        } catch (err) {
          console.error(`Failed to fetch subfolder ${catName}:`, err);
          return { category: catName, files: [] };
        }
      });

    const folderResults = await Promise.all(folderPromises);

    let productIndex = 0;
    for (const folderResult of folderResults) {
      for (const file of folderResult.files) {
        productIndex++;
        const name = cleanTitleToName(file.title, productIndex);

        const price =
          folderResult.category.toLowerCase().includes("hoodie") ||
          name.toLowerCase().includes("hoodie")
            ? 2999
            : 1499 + (productIndex % 5) * 100;

        const badges: ("Bestseller" | "New Drop" | "AI Generated")[] = [
          "AI Generated",
          "Bestseller",
          "New Drop",
        ];
        const badge = badges[productIndex % 3];

        products.push({
          id: `gdrive-${file.id}`,
          fileId: file.id,
          name,
          description: `Bespoke 3D customized streetwear design from the ${folderResult.category} collection.`,
          price,
          badge,
          image: `/api/gdrive/image?id=${file.id}`,
          category: folderResult.category,
          tags: [folderResult.category.toLowerCase(), "custom", "streetwear"],
          defaultColor: productIndex % 2 === 0 ? "#1a1a1a" : "#ffffff",
          defaultView: "front",
          printPosition: "front",
          version: `Version ${productIndex}`,
        });
      }
    }

    const categoriesList = ["All", ...Array.from(categoriesSet)];

    cachedData = {
      categories: categoriesList,
      products,
    };
    lastFetchTime = now;

    return NextResponse.json(cachedData, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (error: any) {
    console.error("GDrive API Route Error:", error);

    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    return NextResponse.json(
      { error: "Failed to fetch live collection from Google Drive", details: error.message },
      { status: 500 }
    );
  }
}
