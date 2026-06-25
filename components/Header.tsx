"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CATEGORIES, SITE_NAME } from "@/lib/config";

const NAV_LINKS = [
  ...CATEGORIES.map((c) => ({ href: `/category/${c.slug}`, label: c.name })),
  { href: "/experts", label: "Experts" },
];

function SearchForm({ autoFocus = false }: { autoFocus?: boolean }) {
  return (
    <form action="/search" role="search" className="flex w-full items-center gap-2">
      <input
        type="search"
        name="q"
        required
        autoFocus={autoFocus}
        placeholder="Search..."
        aria-label="Search articles"
        className="field"
      />
      <button type="submit" className="btn-pine shrink-0">
        Search
      </button>
    </form>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Close the menus on navigation ("adjust state during render" pattern —
  // https://react.dev/learn/you-might-not-need-an-effect).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="bg-ink text-white">
      {/* Masthead: logo + search/menu controls */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 font-display text-2xl font-bold tracking-tight"
          aria-label={`${SITE_NAME} — home`}
        >
          WP <span className="text-marker">Crew</span>
        </Link>

        <div className="flex items-center gap-2">
          <form
            action="/search"
            role="search"
            className="hidden items-center gap-2 md:flex"
          >
            <input
              type="search"
              name="q"
              required
              placeholder="Search..."
              aria-label="Search articles"
              className="w-40 rounded-none border-2 border-white/25 bg-white px-3 py-1.5 text-sm text-ink placeholder:text-moss focus:border-marker focus:outline-none lg:w-56"
            />
            <button type="submit" className="btn-pine !py-1.5 text-sm">
              Search
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setSearchOpen((v) => !v);
              setMenuOpen(false);
            }}
            aria-expanded={searchOpen}
            aria-controls="header-search-panel"
            aria-label={searchOpen ? "Close search" : "Open search"}
            className="flex h-10 w-10 items-center justify-center rounded-none transition-colors hover:bg-white/10 md:hidden"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen((v) => !v);
              setSearchOpen(false);
            }}
            aria-expanded={menuOpen}
            aria-controls="header-menu-panel"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-none transition-colors hover:bg-white/10 lg:hidden"
          >
            <span
              className={`h-[2px] w-5 bg-white transition-transform ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`}
            />
            <span className={`h-[2px] w-5 bg-white ${menuOpen ? "opacity-0" : ""}`} />
            <span
              className={`h-[2px] w-5 bg-white transition-transform ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Category bar: its own full-width row so the sections never crowd
          the masthead. Coral rule echoes the editorial accent. */}
      <nav
        aria-label="Sections"
        className="hidden border-t-2 border-pine bg-ink lg:block"
      >
        <ul className="mx-auto flex max-w-6xl items-stretch justify-between px-4 sm:px-6">
          {NAV_LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`block border-b-2 px-1 py-3.5 font-display text-[13px] font-semibold uppercase tracking-wider transition-colors ${
                    active
                      ? "border-pine text-marker"
                      : "border-transparent text-white/80 hover:border-pine/60 hover:text-marker"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {searchOpen && (
        <div id="header-search-panel" className="border-t border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
            <SearchForm autoFocus />
          </div>
        </div>
      )}

      {menuOpen && (
        <nav
          id="header-menu-panel"
          aria-label="Mobile"
          className="border-t border-white/10 lg:hidden"
        >
          <ul className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
            {NAV_LINKS.map((link) => (
              <li key={link.href} className="border-b border-white/10 last:border-b-0">
                <Link
                  href={link.href}
                  className="block py-3 text-[15px] font-medium text-white/90 hover:text-marker"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
