import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { bills, allTags } from "@/lib/bills";
import type { Lang } from "@/lib/bills";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Bill library — Mswada Wazi" },
      {
        name: "description",
        content:
          "Read curated Kenyan bills explained in plain English and Kiswahili, clause by clause.",
      },
      { property: "og:title", content: "Bill library — Mswada Wazi" },
      {
        property: "og:description",
        content:
          "Read curated Kenyan bills explained in plain English and Kiswahili, clause by clause.",
      },
    ],
  }),
  component: Library,
});

function Library() {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("en");

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return bills.filter((b) => {
      const matchesTag = !tag || b.tags.includes(tag);
      const matchesQ =
        !needle ||
        b.title.toLowerCase().includes(needle) ||
        b.summary.en.toLowerCase().includes(needle) ||
        b.summary.sw.toLowerCase().includes(needle);
      return matchesTag && matchesQ;
    });
  }, [q, tag]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <header className="border-b border-border pb-8">
        <h1 className="text-4xl">The library</h1>
        <p className="mt-3 max-w-xl prose-reading text-muted-foreground">
          Bills currently before Kenyan legislatures, rewritten so an ordinary reader can follow
          what changes and who it affects. Curated by hand.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search bills"
          className="h-10 min-w-56 flex-1 border border-input bg-card px-3 text-sm outline-none focus:border-primary"
        />
        <div className="flex items-center border border-input text-xs">
          {(["en", "sw"] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-2 uppercase tracking-wide ${
                lang === l ? "bg-foreground text-background" : "text-muted-foreground"
              }`}
            >
              {l === "en" ? "English" : "Kiswahili"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <button
          onClick={() => setTag(null)}
          className={`border px-2 py-1 ${!tag ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
        >
          All
        </button>
        {allTags.map((t) => (
          <button
            key={t}
            onClick={() => setTag(t === tag ? null : t)}
            className={`border px-2 py-1 ${t === tag ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <ul className="mt-10 divide-y divide-border border-t border-border">
        {results.map((b) => (
          <li key={b.slug}>
            <Link
              to="/bills/$slug"
              params={{ slug: b.slug }}
              className="group block py-7 transition-colors hover:bg-card"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 text-xs uppercase tracking-widest text-muted-foreground">
                <time>
                  {new Date(b.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
                <span className="text-primary">{b.status}</span>
              </div>
              <h2 className="mt-2 text-2xl group-hover:underline decoration-1 underline-offset-4">
                {b.title}
              </h2>
              <p className="mt-2 prose-reading text-muted-foreground">{b.summary[lang]}</p>
            </Link>
            {b.pdf && (
              <a
                href={b.pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="-mt-4 mb-6 inline-block text-xs uppercase tracking-widest text-muted-foreground hover:text-primary"
              >
                {lang === "en" ? "Original PDF ↓" : "PDF halisi ↓"}
              </a>
            )}
          </li>
        ))}
        {results.length === 0 && (
          <li className="py-10 text-sm text-muted-foreground">No bills match that search.</li>
        )}
      </ul>
    </div>
  );
}
