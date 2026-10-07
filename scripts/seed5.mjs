/**
 * Seeds the WP Crew post5 / category5 / author5 collections in the shared
 * (nice-advice family) MongoDB from scripts/articles.json (written by gen5.mjs).
 * Cover images are CC0 photos from the Openverse API, uploaded to S3.
 *
 * Run:  node --env-file=.env.local scripts/seed5.mjs [articles-file.json] [--dry-run]
 * Needs MONGODB_URI (+ MONGODB_DB), MEDIA_BASE_URL, S3_BUCKET, AWS_REGION and
 * AWS credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) allowed to
 * PutObject into the bucket. --dry-run only reads: it prints what would be
 * created and uploads / writes nothing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createUploader } from "./lib/media.mjs";
import { coll, getClient, newDoc } from "./lib/mongo.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const ARTICLES_FILE = args.find((a) => !a.startsWith("--")) ?? "articles.json";
const USED_IMAGES_PATH = resolve(import.meta.dirname, "used-images.json");

function loadUsedImages() {
  try {
    return new Set(JSON.parse(readFileSync(USED_IMAGES_PATH, "utf8")));
  } catch {
    return new Set();
  }
}
const usedImages = loadUsedImages();

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}
if (!DRY && (!process.env.S3_BUCKET || !process.env.MEDIA_BASE_URL)) {
  console.error("S3_BUCKET / MEDIA_BASE_URL are not set.");
  process.exit(1);
}
const uploader = createUploader({ dryRun: DRY });

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

/** Find-or-create by slug; returns the `{ id, documentId }` relation ref. */
async function ensureEntry(collection, slug, payload) {
  const c = await coll(collection);
  const found = await c.findOne({ slug }, { projection: { id: 1, documentId: 1 } });
  if (found) {
    console.log(`  = ${collection}/${slug} already exists`);
    return { id: found.id, documentId: found.documentId };
  }
  if (DRY) {
    console.log(`  + would create ${collection}/${slug}`);
    return { id: 0, documentId: `dry-run-${slug}` };
  }
  const doc = await newDoc(collection, { ...payload, posts: [] }, { publish: true });
  await c.insertOne(doc);
  console.log(`  + created ${collection}/${slug}`);
  return { id: doc.id, documentId: doc.documentId };
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

async function createArticle(entry, categoryRefs, authorRefs, idx) {
  const { article, category } = entry;
  const posts = await coll("post5s");
  const existing = await posts.findOne({ slug: article.slug }, { projection: { _id: 1 } });
  if (existing) {
    console.log(`  = article "${article.slug}" already exists, skipping`);
    return "skipped";
  }
  const query = entry.imageQuery ?? (article.tags ?? []).slice(0, 3).join(" ") ?? "web design desk";
  let featuredImage = null;
  if (DRY) {
    console.log(`  ~ would find a CC0 cover for "${article.slug}" (query: ${query}) and upload it to S3`);
  } else {
    try {
      const candidates = await findCc0Image(query);
      const image = await downloadImage(candidates);
      if (image) {
        const ext = image.contentType.includes("png") ? "png" : "jpg";
        featuredImage = await uploader.upload(image.buf, {
          filename: `${article.slug}-cover.${ext}`,
          contentType: image.contentType,
        });
        console.log(`  ↑ image uploaded for "${article.slug}" (${featuredImage.s3Key}, files id ${featuredImage.id})`);
      } else {
        console.warn(`  ! no usable CC0 image for "${article.slug}" (query: ${query})`);
      }
    } catch (err) {
      console.warn(`  ! image step failed for "${article.slug}": ${err.message}`);
    }
  }

  const categoryRef = categoryRefs[category];
  const authorRef = authorRefs[AUTHORS[idx % AUTHORS.length].slug];
  const data = {
    title: article.title,
    slug: article.slug,
    description: article.description,
    content: sectionsToBlocks(article.sections),
    featuredImage,
    contentImage1: null,
    contentImage2: null,
    category: categoryRef,
    author: authorRef,
    tags: article.tags ?? [],
    views: Math.floor(Math.random() * 160) + 25,
    isPopular: idx < 4,
  };
  if (DRY) {
    console.log(`  ✓ would publish "${article.title}" (${category}, author ${authorRef.documentId})`);
    return "published";
  }
  const doc = await newDoc("post5s", data, { publish: true });
  await posts.insertOne(doc);
  // Keep the inverse (oneToMany) sides in step, as Strapi did.
  const ref = { id: doc.id, documentId: doc.documentId };
  await (await coll("category5s")).updateOne({ documentId: categoryRef.documentId }, { $addToSet: { posts: ref } });
  await (await coll("author5s")).updateOne({ documentId: authorRef.documentId }, { $addToSet: { posts: ref } });
  console.log(`  ✓ published "${article.title}"`);
  return "published";
}

async function main() {
  const articles = JSON.parse(readFileSync(resolve(import.meta.dirname, ARTICLES_FILE), "utf8"));
  console.log(`Seeding ${articles.length} articles from ${ARTICLES_FILE} into ${process.env.MONGODB_DB || "gc"}${DRY ? " (dry run)" : ""}\n`);

  console.log("Categories:");
  const categoryRefs = {};
  for (const c of CATEGORIES) categoryRefs[c.slug] = await ensureEntry("category5s", c.slug, c);

  console.log("Authors:");
  const authorRefs = {};
  for (const a of AUTHORS) authorRefs[a.slug] = await ensureEntry("author5s", a.slug, { ...a, avatar: null });

  console.log("Articles:");
  let published = 0, skipped = 0;
  const failed = [];
  for (let i = 0; i < articles.length; i++) {
    try {
      const r = await createArticle(articles[i], categoryRefs, authorRefs, i);
      if (r === "published") published++; else skipped++;
    } catch (err) {
      console.error(`  ✗ "${articles[i].article?.slug}": ${err.message}`);
      failed.push(articles[i].article?.slug);
    }
  }
  console.log(`\nDone: ${published} ${DRY ? "would be " : ""}published, ${skipped} skipped, ${failed.length} failed`);
  if (failed.length) console.log(`Failed: ${failed.join(", ")}`);
  await (await getClient()).close();
}

main().catch((err) => { console.error(err); process.exit(1); });
