/**
 * Seeds the WP Crew post5 / category5 / author5 collections in the shared
 * (nice-advice family) Strapi from scripts/articles.json (written by gen5.mjs).
 * Cover images are CC0 photos from the Openverse API.
 *
 * Run:  node --env-file=.env.local scripts/seed5.mjs [articles-file.json]
 * Needs STRAPI_API_URL + STRAPI_TOKEN with create perms on post5/category5/
 * author5 and the Upload plugin.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ARTICLES_FILE = process.argv[2] ?? "articles.json";
const USED_IMAGES_PATH = resolve(import.meta.dirname, "used-images.json");

function loadUsedImages() {
  try {
    return new Set(JSON.parse(readFileSync(USED_IMAGES_PATH, "utf8")));
  } catch {
    return new Set();
  }
}
const usedImages = loadUsedImages();

const STRAPI_URL = (process.env.STRAPI_API_URL ?? "").replace(/\/+$/, "");
const STRAPI_TOKEN = process.env.STRAPI_TOKEN ?? "";
if (!STRAPI_URL || !STRAPI_TOKEN) {
  console.error("STRAPI_API_URL / STRAPI_TOKEN are not set.");
  process.exit(1);
}
const AUTH = { Authorization: `Bearer ${STRAPI_TOKEN}` };

const CATEGORIES = [
  { name: "Web Design", slug: "web-design", description: "Layout, color, typography and visual craft — the design principles and trends that make sites look great and work well." },
  { name: "Web Development", slug: "development", description: "HTML, CSS, JavaScript and the modern front-end — practical coding guides for building fast, responsive websites." },
  { name: "UX & UI", slug: "ux-ui", description: "Usability, accessibility, design systems and user flows — make products that are easy and pleasant to use." },
  { name: "No-Code & CMS", slug: "no-code", description: "Webflow, Framer, WordPress and page builders — get a real site online without writing code." },
  { name: "Freelance & Studio", slug: "freelancing", description: "Clients, pricing, portfolios and running a web studio — the business side of design and development." },
];

const p = (text) => ({ type: "paragraph", children: [{ type: "text", text }] });

const AUTHORS = [
  { name: "Maya Lindqvist", slug: "maya-lindqvist", role: "Design Editor",
    bio: [p("Maya writes about layout, color and typography for people who want their sites to look intentional. She has art-directed everything from one-page portfolios to sprawling marketing sites.")] },
  { name: "Theo Nakamura", slug: "theo-nakamura", role: "Front-End Writer",
    bio: [p("Theo covers HTML, CSS and JavaScript with a bias toward the practical. He is happiest explaining why a layout broke and how a few lines of CSS quietly fixed it.")] },
  { name: "Priya Anand", slug: "priya-anand", role: "UX & No-Code Writer",
    bio: [p("Priya writes about usability, design systems and the no-code tools that let anyone ship a real website. She believes the best interface is the one nobody has to think about.")] },
];

async function api(path, init = {}) {
  const res = await fetch(`${STRAPI_URL}/api/${path}`, {
    ...init,
    headers: { ...AUTH, ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body?.error ? JSON.stringify(body.error) : res.statusText;
    throw new Error(`${init.method ?? "GET"} /${path} -> ${res.status}: ${detail}`);
  }
  return body;
}

async function ensureEntry(collection, slug, payload) {
  const found = await api(`${collection}?filters[slug][$eq]=${encodeURIComponent(slug)}`);
  if (Array.isArray(found.data) && found.data.length > 0) {
    console.log(`  = ${collection}/${slug} already exists`);
    return found.data[0].documentId;
  }
  const created = await api(collection, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: payload }),
  });
  console.log(`  + created ${collection}/${slug}`);
  return created.data.documentId;
}

async function findCc0Image(query) {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license=cc0&page_size=20`;
  const res = await fetch(url, { headers: { "User-Agent": "WpCrewSeeder/1.0" } });
  if (!res.ok) throw new Error(`Openverse search failed: ${res.status}`);
  const body = await res.json();
  const results = Array.isArray(body.results) ? body.results : [];
  return [
    ...results.filter((r) => (r.width ?? 0) >= 1200),
    ...results.filter((r) => (r.width ?? 0) >= 900 && (r.width ?? 0) < 1200),
    ...results.filter((r) => (r.width ?? 0) < 900),
  ];
}

async function downloadImage(candidates) {
  const fresh = candidates.filter((c) => !usedImages.has(c.url));
  for (const candidate of fresh.slice(0, 8)) {
    try {
      const res = await fetch(candidate.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; WpCrewSeeder/1.0)" },
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") ?? "image/jpeg";
      if (!contentType.startsWith("image/")) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 30_000) continue;
      usedImages.add(candidate.url);
      writeFileSync(USED_IMAGES_PATH, JSON.stringify([...usedImages], null, 2));
      return { buf, contentType: contentType.split(";")[0] };
    } catch {
      // next candidate
    }
  }
  return null;
}

async function uploadImage(buf, contentType, filename) {
  const form = new FormData();
  form.append("files", new Blob([buf], { type: contentType }), filename);
  const res = await fetch(`${STRAPI_URL}/api/upload`, { method: "POST", headers: AUTH, body: form });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body?.error ? JSON.stringify(body.error) : res.statusText;
    throw new Error(`upload -> ${res.status}: ${detail}`);
  }
  return body[0].id;
}

function sectionsToBlocks(sections) {
  const blocks = [];
  for (const section of sections) {
    if (section.type === "h2" && section.text) {
      blocks.push({ type: "heading", level: 2, children: [{ type: "text", text: section.text }] });
    } else if (section.type === "h3" && section.text) {
      blocks.push({ type: "heading", level: 3, children: [{ type: "text", text: section.text }] });
    } else if (section.type === "p" && section.text) {
      blocks.push(p(section.text));
    } else if (section.type === "ul" && Array.isArray(section.items)) {
      blocks.push({
        type: "list",
        format: "unordered",
        children: section.items.map((item) => ({ type: "list-item", children: [{ type: "text", text: item }] })),
      });
    }
  }
  return blocks;
}

async function createArticle(entry, categoryIds, authorIds, idx) {
  const { article, category } = entry;
  const existing = await api(`post5s?filters[slug][$eq]=${encodeURIComponent(article.slug)}`);
  if (Array.isArray(existing.data) && existing.data.length > 0) {
    console.log(`  = article "${article.slug}" already exists, skipping`);
    return "skipped";
  }
  const query = entry.imageQuery ?? (article.tags ?? []).slice(0, 3).join(" ") ?? "web design desk";
  let imageId = null;
  try {
    const candidates = await findCc0Image(query);
    const image = await downloadImage(candidates);
    if (image) {
      const ext = image.contentType.includes("png") ? "png" : "jpg";
      imageId = await uploadImage(image.buf, image.contentType, `${article.slug}-cover.${ext}`);
      console.log(`  ↑ image uploaded for "${article.slug}" (id ${imageId})`);
    } else {
      console.warn(`  ! no usable CC0 image for "${article.slug}" (query: ${query})`);
    }
  } catch (err) {
    console.warn(`  ! image step failed for "${article.slug}": ${err.message}`);
  }

  const payload = {
    data: {
      title: article.title,
      slug: article.slug,
      description: article.description,
      content: sectionsToBlocks(article.sections),
      ...(imageId ? { featuredImage: imageId } : {}),
      views: Math.floor(Math.random() * 160) + 25,
      tags: article.tags ?? [],
      isPopular: idx < 4,
      category: categoryIds[category],
      author: authorIds[AUTHORS[idx % AUTHORS.length].slug],
    },
  };
  try {
    await api("post5s?status=published", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log(`  ✓ published "${article.title}"`);
    return "published";
  } catch (err) {
    console.warn(`  ! publish-on-create failed (${err.message}); two-step...`);
    const created = await api("post5s", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await api(`post5s/${created.data.documentId}?status=published`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log(`  ✓ published "${article.title}" (two-step)`);
    return "published";
  }
}

async function main() {
  const articles = JSON.parse(readFileSync(resolve(import.meta.dirname, ARTICLES_FILE), "utf8"));
  console.log(`Seeding ${articles.length} articles from ${ARTICLES_FILE} to ${STRAPI_URL}\n`);

  console.log("Categories:");
  const categoryIds = {};
  for (const c of CATEGORIES) categoryIds[c.slug] = await ensureEntry("category5s", c.slug, c);

  console.log("Authors:");
  const authorIds = {};
  for (const a of AUTHORS) authorIds[a.slug] = await ensureEntry("author5s", a.slug, a);

  console.log("Articles:");
  let published = 0, skipped = 0;
  const failed = [];
  for (let i = 0; i < articles.length; i++) {
    try {
      const r = await createArticle(articles[i], categoryIds, authorIds, i);
      if (r === "published") published++; else skipped++;
    } catch (err) {
      console.error(`  ✗ "${articles[i].article?.slug}": ${err.message}`);
      failed.push(articles[i].article?.slug);
    }
  }
  console.log(`\nDone: ${published} published, ${skipped} skipped, ${failed.length} failed`);
  if (failed.length) console.log(`Failed: ${failed.join(", ")}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
