import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages use native modules or Node-only APIs and must never be
  // bundled into the browser — they are only ever imported in the worker
  // process or in server components / route handlers.
  serverExternalPackages: [
    "pdf-parse",
    "jsdom",
    "@mozilla/readability",
    "ioredis",
    "bullmq",
  ],
};

export default nextConfig;
