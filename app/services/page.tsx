import Link from "next/link";
import { CATEGORIES, SITE_NAME } from "@/lib/config";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "What We Cover",
  description: `The editorial focus of ${SITE_NAME} — web design, web development, UX & UI, no-code & CMS, and the business of freelance and studio work.`,
  path: "/services",
});

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="reveal rule-double pb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          What <span className="u-marker">{SITE_NAME}</span> covers
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-moss">
          We&apos;re a content publication, not an agency — we don&apos;t take on
          client projects. What we do is cover, in depth, the craft of designing
          and building for the web. Here are the five areas every guide,
          tutorial and review falls under.
        </p>
      </header>

      <section
        aria-labelledby="focus-heading"
        className="reveal reveal-2 mt-10"
      >
        <h2
          id="focus-heading"
          className="rule-double pb-3 font-display text-2xl font-semibold"
        >
          Our focus areas
        </h2>
        <ul className="mt-6 space-y-4">
          {CATEGORIES.map((c, i) => (
            <li key={c.slug} className="flex gap-4">
              <span className="font-display text-lg font-semibold text-pine">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p>
                <Link
                  href={`/category/${c.slug}`}
                  className="font-semibold text-pine hover:underline"
                >
                  {c.name}
                </Link>{" "}
                <span className="text-moss">— {c.blurb}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="how-heading"
        className="reveal reveal-3 mt-12 space-y-5 leading-relaxed"
      >
        <h2
          id="how-heading"
          className="rule-double pb-3 font-display text-2xl font-semibold"
        >
          How to use the site
        </h2>
        <p>
          Each focus area has its own section. If you&apos;re polishing the look
          of a site, start with{" "}
          <Link href="/category/web-design" className="text-pine underline">
            Web Design
          </Link>
          . If you&apos;re writing the markup and styles, head to{" "}
          <Link href="/category/development" className="text-pine underline">
            Web Development
          </Link>
          . For usability, accessibility and design systems, see{" "}
          <Link href="/category/ux-ui" className="text-pine underline">
            UX &amp; UI
          </Link>
          . Want a site online without code? Browse{" "}
          <Link href="/category/no-code" className="text-pine underline">
            No-Code &amp; CMS
          </Link>
          . And for the business side — clients, pricing and portfolios — read{" "}
          <Link href="/category/freelancing" className="text-pine underline">
            Freelance &amp; Studio
          </Link>
          .
        </p>
        <p>
          Everything is free to read. We keep guides current, link out to the
          original sources, and flag any partner links on the pages where they
          appear.
        </p>
      </section>

      <p className="rule-dotted mt-12 pt-6 text-sm leading-relaxed text-moss">
        Curious who&apos;s behind it? Read more{" "}
        <Link href="/about" className="text-pine underline">
          about {SITE_NAME}
        </Link>
        , or{" "}
        <Link href="/contact" className="text-pine underline">
          get in touch
        </Link>
        .
      </p>
    </div>
  );
}
