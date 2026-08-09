export type Lang = "en" | "sw";

export type Bilingual = { en: string; sw: string };

export type BillClause = {
  ref: string;
  heading: Bilingual;
  text: Bilingual;
};

export type Bill = {
  slug: string;
  title: string;
  date: string;
  status: string;
  tags: string[];
  summary: Bilingual;
  overview: Bilingual;
  clauses: BillClause[];
};

/**
 * Curated bills live as plain JSON files in the /bills folder at the repo root.
 * They are bundled at build time — adding a bill means adding a file there and
 * pushing to GitHub. No CMS, no database, no admin login.
 */
const modules = import.meta.glob("../../bills/*.json", { eager: true }) as Record<
  string,
  { default: Bill }
>;

export const bills: Bill[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => (a.date < b.date ? 1 : -1));

export function getBill(slug: string): Bill | undefined {
  return bills.find((b) => b.slug === slug);
}

export const allTags: string[] = Array.from(new Set(bills.flatMap((b) => b.tags))).sort();
