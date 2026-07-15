# AGENTS.md

## Cursor Cloud specific instructions

### Product
Single Next.js 14 (App Router) web app: **"Can I Live There"** — a city-to-city budget & take-home-pay comparison tool for US/Canadian cities. There is no database (state persists in browser `localStorage`) and no other backend service; the Next.js server also hosts the `/api/*` routes.

### Services & commands
Only one service to run. Scripts live in `package.json` (`dev`, `build`, `start`, `lint`):
- Dev server: `npm run dev` → http://localhost:3000 (default Next.js dev port).
- Lint: `npm run lint`. Build: `npm run build`. Prod: `npm run start`.

### Non-obvious notes
- **Runs with zero API keys.** Every external integration (Google Places, OpenAI insights, PayrollTaxAPI, ExchangeRate-API, Canada `canatax`) has a deterministic/static fallback, so the full comparison flow works out of the box. To enable live integrations, copy `.env.example` → `.env.local` and fill keys.
- **UI gotcha:** the baseline city field alone does not create an editable income/housing card. Enter cities into the "Comparison" slots (use "+ Add city") to get input cards, then click **Calculate**.
- **Node:** `netlify.toml` pins Node 20 for deploys, but the app builds/runs fine on the VM's system Node (v22). No nvm switch is required for dev.
- **Canada tax (`canatax`) currently falls back to the built-in estimator.** `requirements.txt` pins `canatax>=0.1.0`, which resolves to `canatax` 2.x. That version prints extra lines to stdout before the JSON, and `lib/canadaCanataxServer.ts` does `JSON.parse(stdout.trim())` over the *entire* stdout, so parsing fails and the server silently uses the rough built-in Canada estimator (`lib/canadaTax.ts`). This does not break the app; US comparisons are unaffected. Do not treat missing precise Canadian tax numbers as a bug from your changes.
