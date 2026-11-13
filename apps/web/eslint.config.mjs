import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

/** فحص الكود: قواعد Next.js الأساسية (أداء الويب) + TypeScript */
const config = [
  { ignores: [".next/**", "public/**", "next-env.d.ts", "node_modules/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // الصور الخارجية (أغلفة المقالات وصور الوسائط) تُعرض بـ <img> عن قصد
      "@next/next/no-img-element": "off",
    },
  },
];

export default config;
