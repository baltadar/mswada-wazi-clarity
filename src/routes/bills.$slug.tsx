import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { getBill } from "@/lib/bills";
import type { Lang } from "@/lib/bills";

export const Route = createFileRoute("/bills/$slug")({
  loader: ({ params }) => {
    const bill = getBill(params.slug);
    if (!bill) throw notFound();
    return { bill };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Bill not found — Mswada Wazi" }, { name: "robots", content: "noindex" }] };
    }
    const { bill } = loaderData;
    return {
      meta: [
        { title: `${bill.title} — Mswada Wazi` },
        { name: "description", content: bill.summary.en },
        { property: "og:title", content: `${bill.title} — Mswada Wazi` },
        { property: "og:description", content: bill.summary.en },
      ],
    };
  },
  component: BillPage,
});

function BillPage() {
  const { bill } = Route.useLoaderData();
  const [lang, setLang] = useState<Lang>("en");

  return (
    <article className="mx-auto max-w-2xl px-5 py-12">
      <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">
        ← Library
      </Link>

      <div className="mt-8 flex flex-wrap items-baseline gap-x-3 text-xs uppercase tracking-widest text-muted-foreground">
        <time>
          {new Date(bill.date).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </time>
        <span className="text-primary">{bill.status}</span>
      </div>
      <h1 className="mt-2 text-4xl leading-tight">{bill.title}</h1>

      <div className="mt-6 flex items-center gap-3 border-y border-border py-3 text-xs">
        <span className="uppercase tracking-widest text-muted-foreground">Language</span>
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

      <section className="mt-10">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
          {lang === "en" ? "In short" : "Kwa ufupi"}
        </h2>
        <p className="mt-3 prose-reading">{bill.overview[lang]}</p>
      </section>

      <section className="mt-12">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
          {lang === "en" ? "Clause by clause" : "Kifungu kwa kifungu"}
        </h2>
        <ol className="mt-4 divide-y divide-border border-t border-border">
          {bill.clauses.map((c) => (
            <li key={c.ref} className="py-6">
              <div className="text-xs uppercase tracking-widest text-primary">{c.ref}</div>
              <h3 className="mt-1 text-lg">{c.heading[lang]}</h3>
              <p className="mt-2 prose-reading text-muted-foreground">{c.text[lang]}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-12 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
        {lang === "en"
          ? "This is a plain-language summary, not legal advice. Always check the official text published by Parliament."
          : "Huu ni muhtasari wa lugha rahisi, si ushauri wa kisheria. Angalia daima maandishi rasmi yaliyochapishwa na Bunge."}
      </footer>
    </article>
  );
}
