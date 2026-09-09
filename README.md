# QuantumWoof - Hosky digital garden

Personal dog-garden site for **Hosky** - bento cards, live-feeling widgets, notes.
Not a course hub. Built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**.

## Run locally

```bash
cd /workspace/quantumwoof
npm install
npm run dev
```

Then open http://localhost:3000

Other scripts:

```bash
npm run build
npm run start
npm run lint
```

Bun also works if you prefer (`bun install`, `bun run dev`).

## Where to swap socials and contact

Edit `src/content/site.ts`:

- `socials.x`, `socials.github`, `socials.bluesky`, `socials.handle`
- `contact.email` (placeholder: `hello@quantumwoof.io`)
- `domainNote` when you point a real domain later

Sample blog posts live in `src/content/notes.ts`.

## Brand mark

- Source copy: `public/hosky-mark.png` (also `hosky-mark.jpeg`)
- Original refs: `/workspace/quantumwoof-ref/`

## Key pages

| Path | What |
|------|------|
| `/` | Garden home - about, status, sky, facts, mini lesson, notes teaser, socials, playful widget |
| `/notes` | Notes index |
| `/notes/[slug]` | Individual note |

## Domain later

1. Update socials/email in `src/content/site.ts`
2. Deploy with standard Next.js hosting
3. Attach your domain (e.g. `quantumwoof.io`) in DNS

## Aesthetic

Navy + white + slate + electric blue / soft lavender; rounded bento cards; clean sans (Geist).
