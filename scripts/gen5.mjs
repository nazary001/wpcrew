/**
 * Generates web-design / web-development articles for WP Crew via the Gemini API
 * and writes scripts/articles.json in the shape seed5.mjs consumes.
 *
 * Run:  GEMINI_API_KEY=... node scripts/gen5.mjs
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const KEY = process.env.GEMINI_API_KEY ?? "";
if (!KEY) { console.error("GEMINI_API_KEY not set"); process.exit(1); }
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;

const TOPICS = [
  { slug: "web-design-principles-for-beginners", category: "web-design", imageQuery: "web design desk", topic: "Web Design Principles Every Beginner Should Know" },
  { slug: "choosing-a-color-palette-for-your-website", category: "web-design", imageQuery: "color palette swatches", topic: "How to Choose a Color Palette for Your Website" },
  { slug: "css-flexbox-vs-grid", category: "development", imageQuery: "code editor screen", topic: "CSS Flexbox vs Grid: When to Use Which" },
  { slug: "build-a-responsive-website-with-html-css", category: "development", imageQuery: "html css code", topic: "How to Build a Responsive Website with HTML and CSS" },
  { slug: "web-accessibility-basics", category: "ux-ui", imageQuery: "user interface mockup", topic: "Web Accessibility Basics: Making Sites Usable for Everyone" },
  { slug: "what-is-a-design-system", category: "ux-ui", imageQuery: "ux design board", topic: "What Is a Design System and Why Your Site Needs One" },
  { slug: "webflow-vs-framer-vs-wordpress", category: "no-code", imageQuery: "website builder screen", topic: "Webflow vs Framer vs WordPress: Which No-Code Tool to Pick" },
  { slug: "launch-a-website-without-code", category: "no-code", imageQuery: "drag and drop interface", topic: "How to Launch a Real Website Without Writing Code" },
  { slug: "how-to-price-web-design-projects", category: "freelancing", imageQuery: "freelancer laptop cafe", topic: "How to Price Web Design Projects as a Freelancer" },
  { slug: "build-a-web-design-portfolio", category: "freelancing", imageQuery: "designer portfolio", topic: "How to Build a Web Design Portfolio That Wins Clients" },
];

const schema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["h2", "p", "ul"] },
          text: { type: "string" },
          items: { type: "array", items: { type: "string" } },
        },
        required: ["type"],
      },
    },
  },
  required: ["title", "description", "tags", "sections"],
};

function prompt(t) {
  return `You are writing for WP Crew, an independent web design & web development content site (topics: web design, front-end development, UX/UI, no-code & CMS, freelancing).
Write a thorough, accurate, plain-language article for the "${t.category}" category on the topic: "${t.topic}".
Audience: people who build and design websites — designers, front-end developers, freelancers and aspiring makers.

Requirements:
- 700-1000 words total.
- Begin with 1-2 intro paragraphs (type "p") BEFORE any heading.
- Then 4-6 "h2" sections, each followed by 1-3 "p" paragraphs.
- Include at least one "ul" bulleted list with 3-6 concrete items.
- Neutral, factual, evergreen. Do NOT invent specific prices, brand names presented as fact, or made-up statistics. Speak in ranges and general guidance.
- A "title" (you may refine the topic into a clean headline).
- A "description": a compelling meta description, ~150 characters, no clickbait.
- "tags": 4-6 short lowercase tags.
- "sections": ordered array. type "h2"=heading (use "text"), "p"=paragraph (use "text"), "ul"=bullet list (use "items").
Return ONLY JSON matching the schema.`;
}

async function generate(t) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt(t) }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.7 },
    }),
    signal: AbortSignal.timeout(120000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body?.error ?? body)?.slice(0, 200)}`);
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("empty response");
  const a = JSON.parse(text);
  // basic shape guard
  if (!a.title || !Array.isArray(a.sections) || a.sections.length < 3) throw new Error("malformed article");
  return a;
}

async function main() {
  const out = [];
  for (const t of TOPICS) {
    process.stdout.write(`Generating "${t.slug}" ... `);
    try {
      const a = await generate(t);
      out.push({
        article: { title: a.title, slug: t.slug, description: a.description, tags: a.tags ?? [], sections: a.sections },
        category: t.category,
        imageQuery: t.imageQuery,
      });
      const words = a.sections.filter((s) => s.text).reduce((n, s) => n + s.text.split(/\s+/).length, 0);
      console.log(`ok (${a.sections.length} sections, ~${words} words)`);
    } catch (err) {
      console.log(`FAIL: ${err.message}`);
    }
  }
  const path = resolve(import.meta.dirname, "articles.json");
  writeFileSync(path, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${out.length}/${TOPICS.length} articles to ${path}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
