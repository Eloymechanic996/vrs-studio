import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const isProd = process.env.NODE_ENV === "production";

const baseConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  disable: !isProd,
});

// Only wrap with Serwist for the production build. In dev, returning the raw
// config keeps Turbopack happy (Serwist still ships a webpack plugin even when
// disabled, which conflicts with Next 16's Turbopack default).
const nextConfig: NextConfig = isProd ? withSerwist(baseConfig) : baseConfig;

export default nextConfig;
