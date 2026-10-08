import nextPlugin from "@next/eslint-plugin-next";

export default [
  {
    ignores: [".next/**", ".next-dev/**", "node_modules/**", "build/**", "dist/**"],
  },
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
];
