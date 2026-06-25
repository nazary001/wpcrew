import type { Metadata } from "next";
import Link from "next/link";
import { FeatureCard, HeroCard, RowCard } from "@/components/ArticleCard";
import EmptyState from "@/components/EmptyState";
import SectionHeading from "@/components/SectionHeading";
import { CATEGORIES, SITE_TAGLINE } from "@/lib/config";
import { fetchArticles, fetchLatestByCategory } from "@/lib/strapi";
import type { Article } from "@/lib/types";

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

function CategoryBlock({
  name,
  slug,
  articles,
}: {
  name: string;
  slug: string;
  articles: Article[];
}) {
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby={`section-${slug}`} className="mt-14">
      <SectionHeading title={name} href={`/category/${slug}`} />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {articles.map((article) => (
          <FeatureCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [latest, ...byCategory] = await Promise.all([
    fetchArticles(24),
    ...CATEGORIES.map((c) => fetchLatestByCategory(c.slug, 4)),
  ]);

  // Lead with an article that actually has a cover, so the big hero card is
  // never a placeholder; fall back to the newest if none have one yet.
  const hero = latest.find((a) => a.featuredImage) ?? latest[0];
  const rest = latest.filter((a) => a.slug !== hero?.slug);
  const gridArticles = rest.slice(0, 6);
  const readMore = rest.slice(6, 9);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <section aria-label="Featured stories" className="reveal min-w-0">
          {hero ? (
            <>
              <HeroCard article={hero} />
              {gridArticles.length > 0 && (
                <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {gridArticles.map((article) => (
                    <FeatureCard key={article.slug} article={article} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="card-lift border-2 border-ink bg-card p-8 text-center sm:p-12">
              <p className="tag-cap">{SITE_TAGLINE}</p>
              <h1 className="mx-auto mt-3 max-w-xl font-display text-4xl font-bold uppercase leading-tight tracking-tight sm:text-5xl">
                The web design &amp; <span className="u-marker">dev</span> crew.
              </h1>
              <p className="mx-auto mt-4 max-w-lg font-display text-lg font-semibold uppercase tracking-wide text-ink">
                Design it. Build it. Ship it.
              </p>
              <p className="mx-auto mt-4 max-w-lg leading-relaxed text-moss">
                Layout, color, typography, HTML, CSS and the modern front-end —
                practical know-how to design, build and ship better websites.
              </p>
              <div className="mt-8">
                <EmptyState
                  title="The first guides are in progress"
                  note="Our editors are preparing the first batch of articles. Check the sections below to see what's coming."
                />
              </div>
            </div>
          )}
        </section>

        <aside
          aria-label="Browse topics and more reading"
          className="reveal reveal-2 min-w-0 space-y-6"
        >
          <div className="card-lift border-2 border-ink bg-card p-5">
            <h2 className="rule-double pb-3 text-lg font-bold">Topics</h2>
            <ul className="divide-y divide-line">
              {CATEGORIES.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/category/${category.slug}`}
                    className="group flex items-center justify-between gap-3 py-3"
                  >
                    <span className="font-semibold">
                      <span className="u-marker-hover">{category.name}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-pine transition-transform group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {readMore.length > 0 && (
            <div className="card-lift border-2 border-ink bg-card p-5">
              <h2 className="rule-double pb-3 text-lg font-bold">Read more</h2>
              <div className="divide-y divide-line">
                {readMore.map((article) => (
                  <RowCard key={article.slug} article={article} />
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {CATEGORIES.map((category, i) => (
        <CategoryBlock
          key={category.slug}
          name={category.name}
          slug={category.slug}
          articles={byCategory[i] ?? []}
        />
      ))}

      {!hero && (
        <section
          aria-label="Sections"
          className="reveal reveal-3 mt-14 grid gap-6 sm:grid-cols-2"
        >
          {CATEGORIES.map((category) => (
            <a
              key={category.slug}
              href={`/category/${category.slug}`}
              className="card-lift group border-2 border-ink bg-card p-6"
            >
              <h2 className="text-xl font-bold">
                <span className="u-marker-hover">{category.name}</span>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-moss">
                {category.blurb}
              </p>
              <span className="mt-3 inline-block text-sm font-semibold text-pine">
                Browse section{" "}
                <span
                  aria-hidden="true"
                  className="inline-block transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </span>
            </a>
          ))}
        </section>
      )}
    </div>
  );
}
