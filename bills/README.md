# /bills — the curated library

Every file here becomes a bill page on the site. There is no CMS, no database
and no admin login: add a JSON file, push to GitHub, and the site picks it up
on the next build.

## How to add a bill

1. Run the text of the bill through **Translate a bill** on the site (or a
   script that calls the same Gemini prompt).
2. Copy an existing file here as a template and fill it in.
3. Name the file `<slug>.json`, where `<slug>` matches the `slug` field —
   that becomes the URL, e.g. `/bills/finance-bill-2025`.
4. Commit and push. Done.

## File format

```jsonc
{
  "slug": "finance-bill-2025",        // URL segment, must match the filename
  "title": "The Finance Bill, 2025",
  "date": "2025-05-08",               // ISO date, used for sorting
  "status": "Before Parliament",      // free text, shown in the accent colour
  "tags": ["Tax", "Economy"],         // used by the filter chips on the home page
  "summary": { "en": "...", "sw": "..." },   // one line, shown in the library list
  "overview": { "en": "...", "sw": "..." },  // 3-6 plain-language sentences
  "clauses": [
    {
      "ref": "Clause 4",
      "heading": { "en": "...", "sw": "..." },
      "text": { "en": "...", "sw": "..." }
    }
  ]
}
```

Both `en` (English) and `sw` (Kiswahili) are required on every bilingual
field — the language toggle on the bill page switches between them.
