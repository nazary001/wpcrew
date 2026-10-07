# DEPLOY-MONGO — wpcrew.co (`wpcrew-content`): Strapi Cloud → MongoDB Atlas + S3

Branch `mongo-migration` (git worktree `C:\Users\nazar\OneDrive\Desktop\GC-coding\wpcrew-content-mongo`,
based on `origin/main` a03614e). Remote `https://github.com/nazary001/wpcrew.git`, Vercel prod = `main`.
The sibling checkout `wpcrew-next` points at the **same** GitHub repo and is a stale static rebuild with no
CMS usage — do not migrate it (see `wpcrew-next/DEPLOY-MONGO.md`, untracked).

Ported mechanically from the already-migrated `pixelhost-content` (recipe
`docs/strapi-to-mongo/reports/pixelhost-migration-recipe.md`); only the collection names (`post5s`/`category5s`/
`author5s`/`contact5s`) and the site constants/texts differ. The data layer, mongo/media helpers and tests were
verified byte-identical to pixelhost's `mongo-migration` branch after mapping `4→5`.

## What changed (code)

| Area | Before | After |
|---|---|---|
| `lib/strapi.ts` → `lib/content.ts` | REST calls to `post5s` / `author5s` / `contact5s` with `STRAPI_TOKEN` | Same exported functions and return shapes, MongoDB driver via `lib/mongo.ts` (template copy, unchanged). Published-only filter `publishedAt: {$ne: null}`, sort `publishedAt:-1, id:-1`, relations (`{id, documentId}` refs) populated with a second query on `documentId` (published targets only), pagination = `countDocuments` + `skip/limit`, `pageCount = ceil(total/pageSize)`, search = escaped case-insensitive regex on title/description, every query capped at 8 s (`maxTimeMS`). Any DB error → empty result + `console.error("[content] …")` (the old "null on CMS failure" contract). |
| `app/api/contact/route.ts` | `submitContact` → Strapi REST into `contact5s` | `insertOne` into `contact5s` with the Strapi envelope (`id` from `counters`, 24-char `documentId`, `createdAt/updatedAt/publishedAt`). Validation/honeypot/import path unchanged (now `@/lib/content`). |
| `next.config.ts` | `remotePatterns` for `*.strapiapp.com` + `STRAPI_API_URL` host | host of `MEDIA_BASE_URL` only (warns at build time if unset). Site `redirects()`/`headers()` untouched. |
| 9 importers of `@/lib/strapi` | — | repointed to `@/lib/content` (`app/page.tsx`, `app/article/[slug]/page.tsx`, `app/category/[slug]/page.tsx`, `app/experts/page.tsx`, `app/experts/[slug]/page.tsx`, `app/search/page.tsx`, `app/rss.xml/route.ts`, `app/sitemap.ts`, `app/api/contact/route.ts`). Nothing else in those files changed. |
| `scripts/seed5.mjs`, `scripts/backfill-images5.mjs` | REST + `POST /api/upload` | driver writes (`newDoc` → `nextId`/`newDocumentId`/`publishedAt`), inverse `posts` arrays kept in step, covers uploaded to S3 by `scripts/lib/media.mjs` (original + Strapi-style `large/medium/small/thumbnail` via sharp, `files` record with the Strapi field set, `source: "vivid"`), `--dry-run` flag. The `isRaster`/SVG guard from the main working tree is folded in. |
| `scripts/lib/mongo.mjs`, `scripts/lib/media.mjs` | — | new (ESM transpile of the template + the S3 uploader). |
| `scripts/gen5.mjs` | Gemini generator (writes `scripts/articles.json`) | unchanged (no Strapi usage). |
| deps | — | `mongodb ^6.21` (runtime); `@aws-sdk/client-s3 ^3`, `sharp ^0.35` (dev, scripts only) |
| tests | none | `npm test` → node:test, 12 tests (`tests/content.test.mts` against `gc_test`, `tests/media.test.mts` with mocked S3) |
| docs | README / SEO-CHECKLIST mention Strapi | updated |

No `STRAPI_*`, `strapiapp.com` or `/api/upload` left in code (the only remaining word "Strapi" is in descriptive
comments and the "Strapi-compatible envelope" wording). Routes, HTML, JSON shapes, ISR `revalidate` values and
public URLs (by `slug`) are unchanged.

## Environment variables

**Vercel → project *wpcrew* → Settings → Environment Variables** (Production **and** Preview):

| Variable | Value | Notes |
|---|---|---|
| `MONGODB_URI` | the SRV string (`MONGODB_URI_SRV` in `C:\gc-migration\atlas.env`, user `gcapp`) | mark **Sensitive** |
| `MONGODB_DB` | `gc` | |
| `MEDIA_BASE_URL` | `https://globecoders-media-prod.s3.eu-central-1.amazonaws.com` | no trailing slash; read at **build time** by `next.config.ts` → changing it needs a redeploy |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_ADSENSE_CLIENT`, `NEXT_PUBLIC_*_VERIFICATION` | unchanged | |
| `STRAPI_API_URL`, `STRAPI_TOKEN` | **remove after the rollback window** | unused by the new code; the previous deployment still needs them for an Instant Rollback |

Optional: `MONGODB_POOL` (default 10), `MONGODB_APP_NAME`.

**Atlas → Network Access**: Vercel functions have dynamic egress IPs → the cluster must allow `0.0.0.0/0` (or a Vercel Secure Compute range). Not verified from here.

**Local** (`.env.local`, gitignored; `.env.example` lists the keys): `MONGODB_URI` in the **host-list** form
(this Windows box cannot resolve SRV — note in `atlas.env`), `MONGODB_DB`, `MEDIA_BASE_URL`; for the scripts
additionally `S3_BUCKET=globecoders-media-prod`, `AWS_REGION=eu-central-1`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY` (IAM user with `s3:PutObject` on `uploads/*`).

## Build / deploy / rollback

- Deploy = merge (or fast-forward) `mongo-migration` into `main` and push; Vercel auto-builds with the stock `next build` (no build-command or `vercel.json` changes, Node ≥ 20). Set the env vars **before** pushing.
- Local: `npm ci && npm run build && npm start` (port 3000); `npm test`; `npm run lint`.
- Rollback: Vercel → Deployments → previous (Strapi) deployment → **Instant Rollback**. Strapi Cloud keeps running until the whole migration is closed, so the old build keeps working as long as `STRAPI_*` are still set.
- Contact submissions made on the Mongo build during a rollback window stay in Atlas only (Strapi never sees them).

## Hot collections (delta-sync right before the switch)

| Collection | Why | At dump (gc, 2026-10-07) |
|---|---|---|
| `contact5s` | written by the live site on every contact-form submit | 0 rows |
| `post5s`, `category5s`, `author5s` | change only when the owner runs `scripts/seed5.mjs` / `backfill-images5.mjs` or edits in the Strapi admin | 228 / 5 / 3 (all published) |
| `files` (source `vivid`) | only via the same uploads | shared library (11 550 rows both instances) |

Nothing else is read or written by this site. After the switch, `counters.post5s` (574), `category5s` (10),
`author5s` (6), `contact5s` (0) are already seeded; `counters.files` is created lazily by the uploader (`$max` of
existing `files.id` where `source = "vivid"`). Indexes present on `post5s`: `id`/`documentId` (unique),
`createdAt`/`updatedAt`/`publishedAt`, `slug`, `category.documentId+publishedAt`, `author.documentId`.

## Known drift to reconcile

- `wpcrew-content` main working tree has **uncommitted** edits that are **not** on this branch:
  - `scripts/backfill-images5.mjs` — the isRaster/SVG guard (+11/−2). **Already folded** into the migrated script here.
  - `scripts/used-images.json` — committed value is `[]` (0 URLs); the working tree has **31 URLs**. Copy that file
    over into this branch before the next `seed5`/`backfill-images5` run so no cover image repeats.
  - `scripts/articles.json` — untracked in the main tree (the gen5 output). Copied here locally for the dry-run; it
    stays gitignored/untracked (not committed).
- Nothing runs on a server: Vercel builds from GitHub `main`. `wpcrew-next` is a separate stale checkout of the
  **same** repo — do not deploy it.
- **S3 is still empty** (media copy is a separate task): every article image fails to load until `uploads/*` are
  copied. Pages render; `<img>`/OG URLs already point at the bucket. (In the smoke, `/_next/image` of a bucket URL
  returned **403** — S3 AccessDenied for the missing object — not 404; both just mean "object not there yet".)
- `lib/mongo.ts` is the shared template verbatim → eslint prints one *warning* (unused `eslint-disable no-var`). Leave it.
- Strapi stamped `publishedAt` on the non-Draft&Publish `contact5s` too; the migrated rows have it, so new
  submissions set it as well (`CONVENTIONS.md` §2 lists `publishedAt` only for D&P types).

## Smoke checklist

Done locally on 2026-10-07 against Atlas (`gc` read-only; writes only to `gc_test`, cleaned up afterwards):

1. `npx tsc --noEmit` → clean; `npx eslint .` → 0 errors (1 template warning).
2. `node --env-file=.env.local --test --import ./tests/register.mjs "tests/**/*.test.mts"` → **12/12 pass**
   (8 content + 4 media; collections created/cleaned in `gc_test`).
3. `npx next build` → OK, 23 routes (`/` 5m · `/experts` 10m · `/rss.xml` & `/sitemap.xml` 1h revalidate, as before).
4. `npx next start -p 3519` (`MONGODB_DB=gc`): `/` 200 · `/article/generative-ai-shaping-modern-web-design-visual-trends`
   200 (OG image = bucket URL `…/uploads/wpcrew_…_cover_b00534df43.png`) · `/article/does-not-exist` 404 ·
   `/category/web-design` 200, `?page=2` 200, `?page=99` 404 · `/experts` 200 · `/experts/maya-lindqvist` 200 ·
   `/experts/nobody` 404 · `/search?q=design` 200 · `/search?q=c%2B%2B` 200 · `GET /api/contact` 405 ·
   `/sitemap.xml` 200 (**243** `<loc>` = 7 static + 5 categories + 228 posts + 3 authors) · `/rss.xml` 200 (**50** items) ·
   **zero** `strapiapp` in home/article HTML · `/_next/image` of a foreign host → **400**, of the bucket host → 403 (empty bucket).
5. `MONGODB_DB=gc_test npx next start -p 3521`: `POST /api/contact` valid ×2 → `{ok:true}`, rows `id 1, 2`,
   24-char `documentId`, `createdAt = updatedAt = publishedAt`, no `strapiStatus`; invalid email → 400; honeypot →
   `{ok:true}` and **no** row; bad JSON → 400. The two rows and the `gc_test` counter were deleted and the empty
   `gc_test.contact5s` dropped afterwards.
6. `MONGODB_DB=gc node --env-file=.env.local scripts/seed5.mjs --dry-run` → 10/10 "already exists, skipping",
   0 writes; `scripts/backfill-images5.mjs --dry-run` → "228 articles, 0 missing covers".

Repeat on the Vercel **preview** deployment after setting the env vars, then after promoting: open `/`, an article,
a category page, `/experts`, submit the contact form (check `gc.contact5s` in Atlas), and watch the function logs
for `[content]` errors.

## Not verified here

- Live S3 upload (no AWS keys exercised in a real PutObject from this machine): covered by the mocked-S3 unit tests
  and `--dry-run` only. First real run: `node --env-file=.env.local scripts/backfill-images5.mjs` against one missing
  cover, then check the object and the `files` row.
- Vercel ↔ Atlas connectivity (IP allowlist, SRV resolution) — only local connections were tested.
- Production ISR timing (page-level `revalidate` values are unchanged).
