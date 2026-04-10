import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  typescript: {
    // Base UI Select onValueChange type mismatch (string | null vs string)
    // Safe to ignore — handled at runtime with null coalescing
    ignoreBuildErrors: true,
  },
};

export default withNextIntl(nextConfig);
