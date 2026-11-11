import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // الحزمة المشتركة مكتوبة بـ TypeScript
  transpilePackages: ["@qfx/shared"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
  poweredByHeader: false,
};

export default nextConfig;
