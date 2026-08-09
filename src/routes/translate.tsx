import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { translateBill, type TranslationResult } from "@/lib/translate.functions";
import type { Lang } from "@/lib/bills";

export const Route = createFileRoute("/translate")({
  head: () => ({
    meta: [
      { title: "Translate a bill — Mswada Wazi" },
      {
        name: "description",
        content:
          "Paste or upload any Kenyan bill and get a plain-language overview and clause-by-clause breakdown in English or Kiswahili.",
      },
      { property: "og:title", content: "Translate a bill — Mswada Wazi" },
      {
        property: "og:description",
        content: "Paste or upload a bill and get a plain-language translation. Nothing is stored.",
      },
    ],
  }),
  component: TranslatePage,
});

function TranslatePage() {
  const run = useServerFn(translateBill);
  const [text, setText] = useState("");
  const [lang, setLang] = useState<Lang>("en");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setError("");
    setFileName(file.name);
    try {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const pdfjs = await import("pdfjs-dist");
        const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
        const buf = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: buf }).promise;
        let out = "";
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          out += content.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n\n";
        }
        setText(out.trim());
      } else {
        setText(await file.text());
      }
    } catch {
      setError("Could not read that file. Try pasting the text instead.");
    }
  }

  async function onTranslate() {
    if (text.trim().length < 20) {
      setStatus("error");
      setError("Paste at least a paragraph of the bill text.");
      return;
    }
    setStatus("loading");
    setError("");
    setResult(null);
    try {
      const res = await run({ data: { text: text.slice(0, 60000), lang } });
      setResult(res);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "The translation request failed. Try again.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="text-4xl leading-tight">Translate a bill</h1>
      <p className="mt-3 prose-reading text-muted-foreground">
        Paste or upload a bill and get a plain-language translation — a short overview, then a
        clause-by-clause breakdown. Nothing you paste here is saved or stored anywhere.
      </p>

      <div className="mt-8 border-t border-border pt-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder="Paste the raw bill text here…"
          className="w-full resize-y border border-input bg-card p-4 font-serif text-[15px] leading-relaxed outline-none focus:border-primary"
        />

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.md,text/plain,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="border border-input px-3 py-2 uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary"
          >
            Upload PDF or text
          </button>
          {fileName && <span className="text-muted-foreground">{fileName}</span>}

          <div className="ml-auto flex items-center gap-2">
            <span className="uppercase tracking-widest text-muted-foreground">Output</span>
            <div className="flex items-center border border-input">
              {(["en", "sw"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1.5 uppercase tracking-wide ${
                    lang === l ? "bg-foreground text-background" : "text-muted-foreground"
                  }`}
                >
                  {l === "en" ? "English" : "Kiswahili"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => void onTranslate()}
          disabled={status === "loading"}
          className="mt-6 w-full bg-primary px-4 py-3 text-sm uppercase tracking-widest text-primary-foreground disabled:opacity-60"
        >
          {status === "loading" ? "Translating…" : "Translate"}
        </button>

        {status === "loading" && (
          <p className="mt-4 text-sm text-muted-foreground">
            Reading the text and rewriting it in plain {lang === "en" ? "English" : "Kiswahili"}.
            Long bills can take a minute.
          </p>
        )}

        {status === "error" && error && (
          <p className="mt-4 border-l-2 border-destructive pl-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      {result && (
        <div className="mt-12 border-t border-border pt-8">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
            {lang === "en" ? "In short" : "Kwa ufupi"}
          </h2>
          <p className="mt-3 prose-reading">{result.overview}</p>

          {result.clauses.length > 0 && (
            <>
              <h2 className="mt-12 text-xs uppercase tracking-widest text-muted-foreground">
                {lang === "en" ? "Clause by clause" : "Kifungu kwa kifungu"}
              </h2>
              <ol className="mt-4 divide-y divide-border border-t border-border">
                {result.clauses.map((c, i) => (
                  <li key={`${c.ref}-${i}`} className="py-6">
                    <div className="text-xs uppercase tracking-widest text-primary">{c.ref}</div>
                    <h3 className="mt-1 text-lg">{c.heading}</h3>
                    <p className="mt-2 prose-reading text-muted-foreground">{c.text}</p>
                  </li>
                ))}
              </ol>
            </>
          )}

          <p className="mt-10 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
            {lang === "en"
              ? "Machine-generated summary. Not legal advice — check the official text before acting on it."
              : "Muhtasari uliotengenezwa na mashine. Si ushauri wa kisheria — angalia maandishi rasmi kabla ya kuchukua hatua."}
          </p>
        </div>
      )}
    </div>
  );
}
