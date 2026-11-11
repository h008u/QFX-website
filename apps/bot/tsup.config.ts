import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  clean: true,
  sourcemap: true,
  // الحزمة المشتركة مكتوبة بـ TypeScript، لذا ندمجها في الملف الناتج
  noExternal: ["@qfx/shared"],
});
