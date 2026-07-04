import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const hasKey = !!process.env.STABILITY_API_KEY;
  return NextResponse.json({ hasKey });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { prompt, apiKey: clientApiKey } = body;
    
    const apiKey = clientApiKey || process.env.STABILITY_API_KEY;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: "Prompt is required." },
        { status: 400 }
      );
    }

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Stability AI API key is missing. Please set STABILITY_API_KEY in your environment variables or provide your key in the customizer settings." 
        },
        { status: 400 }
      );
    }

    // Set up form data for the multipart request required by Stability AI
    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("output_format", "webp");
    formData.append("aspect_ratio", "1:1"); // Best for T-shirt decal mapping

    const response = await fetch(
      "https://api.stability.ai/v2beta/stable-image/generate/ultra",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          Accept: "image/*",
        },
        body: formData,
      }
    );

    if (!response.ok) {
      let errorMessage = "Stability AI generation failed.";
      try {
        const errorJson = await response.json();
        if (errorJson && errorJson.message) {
          errorMessage = errorJson.message;
        } else if (errorJson && errorJson.errors) {
          errorMessage = Array.isArray(errorJson.errors)
            ? errorJson.errors.join(", ")
            : JSON.stringify(errorJson.errors);
        }
      } catch (e) {
        // Response was not JSON, read as text
        const text = await response.text();
        if (text) {
          errorMessage = text.substring(0, 200); // Truncate if too long
        }
      }
      
      return NextResponse.json(
        { success: false, error: `Stability API Error (${response.status}): ${errorMessage}` },
        { status: response.status }
      );
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:image/webp;base64,${base64}`;

    return NextResponse.json({ success: true, image: dataUrl });
  } catch (error: any) {
    console.error("Stability API Route Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
