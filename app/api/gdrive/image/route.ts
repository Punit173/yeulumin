import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");

  if (!fileId) {
    return new NextResponse("Missing file ID", { status: 400 });
  }

  try {
    // Fetch directly from Google Drive thumbnail CDN server-side
    const response = await fetch(`https://lh3.googleusercontent.com/d/${fileId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      // Fallback to thumbnail URL if direct d/ endpoint fails
      const fallbackResponse = await fetch(
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        }
      );
      if (!fallbackResponse.ok) {
        return new NextResponse("Failed to fetch image from Google Drive", {
          status: fallbackResponse.status,
        });
      }
      const imageBuffer = await fallbackResponse.arrayBuffer();
      const contentType = fallbackResponse.headers.get("content-type") || "image/png";

      return new NextResponse(imageBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/png";

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error("Image proxy error:", error);
    return new NextResponse("Error proxying image", { status: 500 });
  }
}
