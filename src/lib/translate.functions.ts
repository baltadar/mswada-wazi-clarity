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

export const translateBill = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<TranslationResult> => {
    const apiKey = process.env["GOOGLE_API_KEY"];
    if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");

    const language = data.lang === "sw" ? "Kiswahili" : "English";

    const prompt = `You are a Kenyan civic-education editor. Rewrite the legislative text below in plain ${language} that an ordinary citizen with no legal training can understand and act on.

Rules:
- Use short sentences and everyday words. No legalese, no marketing tone.
- Say plainly how each clause affects ordinary people, money, or rights.
- Do not invent content that is not in the text.
- Respond ONLY with JSON matching: {"overview": string, "clauses": [{"ref": string, "heading": string, "text": string}]}
- "overview" is 3-6 sentences. Provide one clause entry per meaningful clause or section (max 25).

LEGISLATIVE TEXT:
"""
${data.text}
"""`;

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) {
        throw new Error(
          "Gemini rate limit reached (free tier). Wait a minute and try again, or shorten the text.",
        );
      }
      throw new Error(`Gemini request failed [${res.status}]: ${body.slice(0, 500)}`);
    }

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const raw = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!raw) throw new Error("Gemini returned an empty response. Try again.");

    let parsed: TranslationResult;
    try {
      parsed = JSON.parse(raw) as TranslationResult;
    } catch {
      throw new Error("Could not read the translation returned by Gemini. Try again.");
    }
    return {
      overview: parsed.overview ?? "",
      clauses: Array.isArray(parsed.clauses) ? parsed.clauses : [],
    };
  });
