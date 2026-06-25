import type { NextConfig } from "next";

const strapiHost = (() => {
  try {
    return new URL(process.env.STRAPI_API_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Pin the workspace root to THIS project (sibling projects in GC-coding have
  // their own lockfiles, which Turbopack would otherwise infer as the root).
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    // Only the Strapi media hosts — a wildcard would turn /_next/image
    // into an open proxy for arbitrary third-party images.
    remotePatterns: [
      ...(strapiHost ? [{ protocol: "https" as const, hostname: strapiHost }] : []),
      { protocol: "https", hostname: "*.strapiapp.com" },
      { protocol: "https", hostname: "*.media.strapiapp.com" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000,
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // Reclaim wpcrew.co legacy backlinks: collapse the old WordPress blog
      // structure (no link value) onto the new content routes.
      { source: "/home", destination: "/", permanent: true },
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/about-us", destination: "/about", permanent: true },
      { source: "/contact-us", destination: "/contact", permanent: true },
      { source: "/blog", destination: "/", permanent: true },
      { source: "/tag/:path*", destination: "/", permanent: true },
      { source: "/author/:path*", destination: "/experts", permanent: true },
    ];
  },
};

export default nextConfig;
