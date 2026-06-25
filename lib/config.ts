export const SITE_NAME = "WP Crew";
export const SITE_TAGLINE = "Web design & development, demystified.";
export const SITE_DESCRIPTION =
  "WP Crew publishes plain-language guides, tutorials and reviews on web design, front-end development, UX, no-code tools and freelancing — practical know-how to design, build and ship better websites.";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://wpcrew.co"
).replace(/\/+$/, "");

export interface CategoryDef {
  slug: string;
  name: string;
  blurb: string;
}

export const CATEGORIES: CategoryDef[] = [
  {
    slug: "web-design",
    name: "Web Design",
    blurb:
      "Layout, color, typography and visual craft — the design principles and trends that make sites look great and work well.",
  },
  {
    slug: "development",
    name: "Web Development",
    blurb:
      "HTML, CSS, JavaScript and the modern front-end — practical coding guides for building fast, responsive websites.",
  },
  {
    slug: "ux-ui",
    name: "UX & UI",
    blurb:
      "Usability, accessibility, design systems and user flows — make products that are easy and pleasant to use.",
  },
  {
    slug: "no-code",
    name: "No-Code & CMS",
    blurb:
      "Webflow, Framer, WordPress and page builders — get a real site online without writing code.",
  },
  {
    slug: "freelancing",
    name: "Freelance & Studio",
    blurb:
      "Clients, pricing, portfolios and running a web studio — the business side of design and development.",
  },
];

export function getCategory(slug: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function categoryIndex(slug: string): string {
  const i = CATEGORIES.findIndex((c) => c.slug === slug);
  return String(i + 1).padStart(2, "0");
}
