/**
 * Attaches CC0 cover images to post5 articles that are missing featuredImage.
 * Run: node --env-file=.env.local scripts/backfill-images5.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STRAPI_URL = (process.env.STRAPI_API_URL ?? "").replace(/\/+$/, "");
const STRAPI_TOKEN = process.env.STRAPI_TOKEN ?? "";
const AUTH = { Authorization: `Bearer ${STRAPI_TOKEN}` };
const USED = resolve(import.meta.dirname, "used-images.json");
const used = (() => { try { return new Set(JSON.parse(readFileSync(USED, "utf8"))); } catch { return new Set(); } })();

const QUERY_BY_CAT = {
  "web-design": ["web design desk", "ui design screen", "designer workspace", "color palette swatches"],
  "development": ["code editor screen", "programming laptop", "developer desk", "html css code"],
  "ux-ui": ["wireframe sketch", "user interface mockup", "ux design board", "app prototype"],
  "no-code": ["website builder screen", "drag and drop interface", "laptop building website", "cms dashboard"],
  "freelancing": ["freelancer laptop cafe", "designer portfolio", "home office desk", "client meeting laptop"],
};

async function api(path, init = {}) {
  const res = await fetch(`${STRAPI_URL}/api/${path}`, { ...init, headers: { ...AUTH, ...(init.headers ?? {}) } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} -> ${res.status}: ${JSON.stringify(body?.error ?? "")}`);
  return body;
}
async function cc0(query) {
  const res = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license=cc0&page_size=20`, { headers: { "User-Agent": "WpCrewSeeder/1.0" } });
  if (!res.ok) return [];
  const b = await res.json();
  const r = Array.isArray(b.results) ? b.results : [];
  return [...r.filter((x) => (x.width ?? 0) >= 1000), ...r.filter((x) => (x.width ?? 0) < 1000)];
}
async function download(cands) {
  for (const c of cands.filter((x) => !used.has(x.url)).slice(0, 8)) {
    try {
      const res = await fetch(c.url, { headers: { "User-Agent": "Mozilla/5.0 (WpCrewSeeder/1.0)" }, redirect: "follow", signal: AbortSignal.timeout(30000) });
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") ?? "image/jpeg";
      if (!ct.startsWith("image/")) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 30000) continue;
      used.add(c.url); writeFileSync(USED, JSON.stringify([...used], null, 2));
      return { buf, ct: ct.split(";")[0] };
    } catch { /* next */ }
  }
  return null;
}
async function upload(buf, ct, name) {
  const form = new FormData();
  form.append("files", new Blob([buf], { type: ct }), name);
  const res = await fetch(`${STRAPI_URL}/api/upload`, { method: "POST", headers: AUTH, body: form });
  const b = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`upload -> ${res.status}`);
  return b[0].id;
}

const all = await api("post5s?populate[category][fields][0]=slug&populate[featuredImage][fields][0]=url&pagination[pageSize]=100");
const missing = all.data.filter((a) => !a.featuredImage);
console.log(`${all.data.length} articles, ${missing.length} missing covers`);
for (const a of missing) {
  const cat = a.category?.slug ?? "web-design";
  const queries = QUERY_BY_CAT[cat] ?? ["web design laptop"];
  let imageId = null;
  for (const q of queries) {
    const img = await download(await cc0(q));
    if (img) { imageId = await upload(img.buf, img.ct, `${a.slug}-cover.${img.ct.includes("png") ? "png" : "jpg"}`); break; }
  }
  if (!imageId) { console.warn(`  ! still no image for ${a.slug}`); continue; }
  await api(`post5s/${a.documentId}?status=published`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: { featuredImage: imageId } }),
  });
  console.log(`  ✓ ${a.slug} -> image ${imageId}`);
}
console.log("done");
