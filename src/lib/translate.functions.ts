import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * NOTE ON THE API KEY — read this before changing it.
 *
 * This app has no database, no accounts and no CMS. The only server-side piece
 * is this thin passthrough to the Gemini API, which exists purely so the
 * GOOGLE_API_KEY is not shipped inside the browser bundle.
 *
 * If you would rather call Gemini directly from the browser (the original
 * no-backend design), expose the key as a build-time variable named
 * VITE_GOOGLE_API_KEY and fetch generativelanguage.googleapis.com from the
 * client. Known trade-off: any key exposed that way is readable by anyone who
 * opens devtools. That is a property of a keyless-backend app, not a bug —
 * restrict the key by referrer and quota in Google AI Studio if you do it.
 */

const Input = z.object({
  text: z.string().min(20).max(60000),
  lang: z.enum(["en", "sw"]),
});

export type TranslationResult = {
  overview: string;
  clauses: { ref: string; heading: string; text: string }[];
};

function buildPrompt(text: string, lang: "en" | "sw") {
  const language = lang === "sw" ? "Kiswahili" : "English";
  return `You are a Kenyan civic-education editor. Rewrite the legislative text below in plain ${language} that an ordinary citizen with no legal training can understand and act on.

Rules:
- Use short sentences and everyday words. No legalese, no marketing tone.
- Say plainly how each clause affects ordinary people, money, or rights.
- Do not invent content that is not in the text.
- Respond ONLY with JSON matching: {"overview": string, "clauses": [{"ref": string, "heading": string, "text": string}]}
- "overview" is 3-6 sentences. Provide one clause entry per meaningful clause or section (max 25).

LEGISLATIVE TEXT:
"""
${text}
"""`;
}

function normalize(raw: string): TranslationResult {
  const parsed = JSON.parse(raw) as TranslationResult;
  return {
    overview: parsed.overview ?? "",
    clauses: Array.isArray(parsed.clauses) ? parsed.clauses : [],
  };
}

async function viaGemini(prompt: string): Promise<TranslationResult> {
  const apiKey =
    process.env["GOOGLE_API_KEY"] ||
    process.env["GEMINI_API_KEY"] ||
    process.env["VITE_GOOGLE_API_KEY"];
  if (!apiKey) throw new Error("Gemini key missing");
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: "low" },
        },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini request failed [${res.status}]: ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const raw = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!raw) throw new Error("Gemini returned an empty response.");
  return normalize(raw);
}

/** Second fallback: Groq (free tier), used when Gemini fails. */
async function viaGroq(prompt: string): Promise<TranslationResult> {
  const key = process.env["GROQ_API_KEY"];
  if (!key) throw new Error("Groq key missing");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Groq request failed [${res.status}]: ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content ?? "";
  if (!raw) throw new Error("Groq returned an empty response.");
  return normalize(raw);
}

/** Backup: built-in AI service, used automatically when Gemini fails. */
async function viaBackup(prompt: string): Promise<TranslationResult> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Backup translation service is not configured.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${key}`,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      input: [{ role: "user", content: prompt }],
      reasoning: { effort: "low" },
      store: false,
      stream: true,
      text: {
        format: {
          type: "json_schema",
          name: "translation",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["overview", "clauses"],
            properties: {
              overview: { type: "string" },
              clauses: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["ref", "heading", "text"],
                  properties: {
                    ref: { type: "string" },
                    heading: { type: "string" },
                    text: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.text();
    if (res.status === 429) throw new Error("The translation service is busy. Wait a minute and try again.");
    if (res.status === 402 || res.status === 403)
      throw new Error("The backup translation service has used up its free allowance for now.");
    throw new Error(`Backup translation failed [${res.status}]: ${body.slice(0, 300)}`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const ev = JSON.parse(payload) as { type?: string; delta?: string; response?: { error?: { message?: string } } };
        if (ev.type === "response.output_text.delta" && ev.delta) out += ev.delta;
        if (ev.type === "response.failed") throw new Error(ev.response?.error?.message ?? "Backup translation failed.");
        if (ev.type === "response.refusal.delta") throw new Error("The backup service declined to translate this text.");
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
  if (!out) throw new Error("The backup service returned an empty response. Try again.");
  return normalize(out);
}

export const translateBill = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<TranslationResult> => {
    const prompt = buildPrompt(data.text, data.lang);
    try {
      return await viaGemini(prompt);
    } catch (e) {
      console.warn("Gemini failed, trying Groq:", e instanceof Error ? e.message : e);
    }
    try {
      return await viaGroq(prompt);
    } catch (e) {
      console.warn("Groq failed, using built-in backup:", e instanceof Error ? e.message : e);
    }
    return await viaBackup(prompt);
  });
