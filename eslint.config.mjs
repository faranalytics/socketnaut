// @ts-check

import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";

export default defineConfig([
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  { ignores: ["**/dist"] },
  {
    languageOptions: {
      parserOptions: { project: ["./tsconfig.json", "./tsconfig.eslint.json"] },
      globals: { ...globals.node },
    },
  },
  {
    plugins: {
      "@stylistic": stylistic,
    },
  },
  {
    files: ["**/*.ts"],
    rules: {
      quotes: ["error", "double", { avoidEscape: true, allowTemplateLiterals: true }],
      "@stylistic/semi": ["error", "always"],
      "@typescript-eslint/no-require-imports": ["off"],
    },
  },
  {
    files: ["**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": ["off"] },
  },
]);
