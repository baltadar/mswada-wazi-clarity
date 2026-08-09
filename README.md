# Open Bill Guide

Build a web app called Mswada Wazi ("Open Bill" in Swahili) — a tool that 

translates Kenyan legislation into plain language ordinary citizens can 

understand and act on.

ARCHITECTURE — NO BACKEND

- Fully static frontend. No database, no server, no user auth system.

- All content (bills, translations, tags) lives as JSON or Markdown files 

  inside a /bills folder in the project's own GitHub repo.

- The app reads those files directly (bundled at build time, or fetched at 

  runtime from the repo's raw GitHub URLs) and renders them.

- Adding a new "official" bill to the site means adding a file to that 

  /bills folder and pushing to GitHub — no admin login, no CMS, no server.

DESIGN DIRECTION

- Minimalist, text-first, newspaper/document feel — not a typical "AI app"

- No gradients, no purple/blue AI-cliché colors, no chat bubbles, no bot 

  avatars or sparkle icons

- Neutral palette: off-white background, dark charcoal/black text, one 

  accent color used sparingly

- Clean, readable typography, generous line spacing — this is a reading 

  tool first

- Fast, plain, functional over decorative

PAGE 1 — HOME / LIBRARY

- List of curated bills pulled from the /bills folder (title, one-line 

  description, date, status)

- Simple search and filter

- Clicking a bill opens its plain-language summary + clause breakdown, 

  read from that bill's JSON/Markdown file

- Each bill file should support both an English and a Kiswahili version, 

  with a simple toggle on the page to switch between them

PAGE 2 — "TRANSLATE A BILL" TOOL

- A prominent upload/paste box on its own page (or top of the home page):

  "Paste or upload a bill and get a plain-language translation"

- Text area for pasting raw text, plus a file upload option (PDF/text)

- A language selector: English or Kiswahili

- A "Translate" button that calls the Gemini API directly from the browser 

  (client-side fetch to the Gemini API using a Google AI Studio key) and 

  displays: (1) a short plain-language overview, (2) a clause-by-clause 

  breakdown in the selected language

- Show a loading state while the request runs, and a clear error message 

  if the API call fails or hits a rate limit

- This is a one-off, in-browser tool — nothing the user uploads here gets 

  saved or stored anywhere

CURATION WORKFLOW (for me, the admin — no login needed)

- I will translate important bills separately (using the same translate 

  tool, or a script) and manually add the resulting file to the /bills 

  folder in GitHub. The site should just pick up and display whatever is 

  in that folder — no admin panel needed inside the app itself.

AI INTEGRATION

- Use the Gemini API (Google AI Studio free tier) for all translation 

  calls — both the on-demand tool and (offline) for curated bills.

- Store the Gemini API key as an environment variable at build time, not 

  hardcoded in a visible file. Flag clearly in the code/comments that this 

  key will still be readable in the shipped frontend bundle, since there's 

  no backend to hide it behind — this is a known trade-off for a no-backend 

  app, not a bug.

WHAT TO LEAVE OUT

- No user accounts or logins

- No database of any kind

- No comments, likes, or social features

- No analytics dashboards

The tone throughout should feel like a trustworthy public utility — clear, 

calm, and legible — not a flashy tech product. gemini api key: @secret:GOOGLE_API_KEY

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mswada-wazi-clarity.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e0392084-70e3-4379-a85d-2d5c0c1efbc7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
