import { NextRequest, NextResponse } from "next/server";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Free-tier Gemini text models, tried in order (override the first with GEMINI_TEXT_MODEL)
const MODELS = [process.env.GEMINI_TEXT_MODEL, "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"].filter(
  (m, i, all): m is string => !!m && all.indexOf(m) === i
);

const MAX_PROMPT_CHARS = 1000;

const SYSTEM_INSTRUCTION = `You are a prompt engineer for an AI apparel-print generator.
The user gives a rough idea for a graphic that will be printed on a garment.
Rewrite it into a vivid, specific image-generation prompt and suggest alternative directions.

Rules:
- Keep the user's core subject and intent. Never replace it with something unrelated.
- Describe ONE centered graphic suitable for screen/DTG printing: subject, art style, composition, color palette, line/texture quality.
- Do not describe the garment, a model, a mockup, a photo of clothing, or a background scene. Assume an isolated graphic on a plain background.
- Do not add text/lettering/typography unless the user asked for words; if they did, keep their exact wording in quotes.
- No real brand logos, trademarked characters, or real people's likeness.
- "refined": 25–60 words, a single paragraph, no preamble.
- "suggestions": exactly 3 alternatives that keep the subject but vary the style or mood, each 15–40 words.
- "tips": up to 2 very short hints (max 12 words each) about what could make the idea stronger; may be empty.

Design for the actual garment you are given:
- Fabric colour: the print must read clearly on it. On dark fabric favour bright/light inks and luminous accents and avoid large black areas; on light fabric favour saturated or dark inks and avoid white or very pale elements. Never make the main colour the same as the fabric.
- Garment type: classic tee → balanced chest/back graphic; oversized tee → bolder, larger statement graphic suited to a big back or front print; hoodie → strong compact graphic that sits above the front pocket (front) or a large back piece (back), heavier streetwear feel.
- Print side: front prints are typically more compact; back prints can be larger and more detailed.
Mention the ink palette explicitly so it works on the fabric colour.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    refined: { type: "STRING" },
    suggestions: { type: "ARRAY", items: { type: "STRING" } },
    tips: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["refined", "suggestions"],
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ success: false, error: "Prompt refinement is not configured (GEMINI_API_KEY missing)." }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const style = typeof body.style === "string" ? body.style.trim().slice(0, 40) : "";
  const garment = typeof body.garment === "string" ? body.garment.trim().slice(0, 20) : "";
  const printSide = body.printSide === "back" ? "back" : body.printSide === "front" ? "front" : "";
  const fabric = body.fabric && typeof body.fabric === "object" ? body.fabric : null;
  const fabricHex = typeof fabric?.hex === "string" && /^#[0-9a-f]{6}$/i.test(fabric.hex) ? fabric.hex : "";
  const fabricName = typeof fabric?.name === "string" ? fabric.name.trim().slice(0, 30) : "";
  const fabricTone = fabric?.tone === "dark" || fabric?.tone === "light" ? fabric.tone : "";

  if (!prompt) {
    return NextResponse.json({ success: false, error: "Type an idea first, then refine it." }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json({ success: false, error: `Please keep the idea under ${MAX_PROMPT_CHARS} characters.` }, { status: 400 });
  }

  const garmentLabel = garment === "hoodie" ? "hoodie" : garment === "oversized" ? "oversized t-shirt" : garment ? "classic t-shirt" : "";
  const userText = [
    `User idea: """${prompt}"""`,
    style ? `Preferred style: ${style}` : "",
    garmentLabel ? `Garment type: ${garmentLabel}` : "",
    fabricHex ? `Fabric colour: ${fabricName ? `${fabricName} ` : ""}(${fabricHex})${fabricTone ? `, a ${fabricTone} fabric` : ""}` : "",
    printSide ? `Print side: ${printSide}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const errors: string[] = [];
  for (const model of MODELS) {
    try {
      const res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ role: "user", parts: [{ text: userText }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            // 2.5 models "think" by default and those tokens count against maxOutputTokens,
            // which truncated the JSON. This task doesn't need thinking.
            ...(model.startsWith("gemini-2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        errors.push(`${model} (${res.status}): ${err?.error?.message ?? res.statusText}`);
        // Rate-limited or model unavailable → try the next free model
        continue;
      }

      const data = await res.json();
      const text: string | undefined = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
      if (!text) {
        errors.push(`${model}: empty response (${data?.candidates?.[0]?.finishReason ?? "no candidates"})`);
        continue;
      }

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        errors.push(`${model}: unparseable JSON (${data?.candidates?.[0]?.finishReason ?? "?"})`);
        continue;
      }
      const refined = typeof parsed.refined === "string" ? parsed.refined.trim() : "";
      const suggestions: string[] = Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((s: unknown): s is string => typeof s === "string" && !!s.trim()).map((s: string) => s.trim()).slice(0, 3)
        : [];
      const tips: string[] = Array.isArray(parsed.tips)
        ? parsed.tips.filter((s: unknown): s is string => typeof s === "string" && !!s.trim()).map((s: string) => s.trim()).slice(0, 2)
        : [];

      if (!refined) {
        errors.push(`${model}: missing refined prompt`);
        continue;
      }

      return NextResponse.json({ success: true, refined, suggestions, tips, model });
    } catch (err) {
      errors.push(`${model}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.error("Prompt refinement failed:", errors);
  const rateLimited = errors.some((e) => e.includes("(429)"));
  return NextResponse.json(
    {
      success: false,
      error: rateLimited
        ? "The free AI quota is busy right now. Please try again in a minute."
        : "Couldn't refine the prompt right now. Please try again.",
      // Per-model errors help debugging locally; never exposed in production
      ...(process.env.NODE_ENV !== "production" ? { detail: errors } : {}),
    },
    { status: rateLimited ? 429 : 502 }
  );
}
