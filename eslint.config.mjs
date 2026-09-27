import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Build output and the compiled plugin bundle.
  { ignores: ["main.js", "dist/**"] },

  // Match the previous .eslintrc.js scope: TypeScript sources only.
  {
    files: ["**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        2,
        { args: "all", argsIgnorePattern: "^_" },
      ],
    },
  }
);
