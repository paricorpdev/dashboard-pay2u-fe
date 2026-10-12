import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal, self-contained build under .next/standalone that bundles
  // only the production dependencies — ideal for a slim Docker image.
  output: "standalone",

  cacheComponents: true,
  partialPrefetching: true,

  // NOTE: API calls to /api/* are proxied to the Go backend at RUNTIME by the
  // route handler in src/app/api/[...path]/route.ts, which reads BACKEND_URL
  // from the environment. This keeps the backend address configurable on
  // Komodo without rebuilding the image (and avoids CORS entirely).

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
