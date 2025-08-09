// eslint.config.js
import globals from "globals";
import tseslint from "typescript-eslint";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default [
  // 1. Global ignores
  {
    ignores: ["node_modules/", "dist/", "coverage/"],
  },
  
  // 2. TypeScript specific configuration
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true, // Automatically find tsconfig.json
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
      },
    },
    // This is the crucial part: Defining the plugin that provides the rules.
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    // Then, you can specify the rules from that plugin.
    rules: {
      ...tseslint.configs.recommended.rules,
      // Your custom rule overrides
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { "argsIgnorePattern": "^_" },
      ],
    },
  },
  
  // 3. Prettier configuration. This should be last to override other formatting rules.
  {
    plugins: {
      "prettier": prettierPlugin,
    },
    rules: {
      ...prettierConfig.rules, // Disables rules that conflict with Prettier.
      "prettier/prettier": "error", // Enables the Prettier rule.
    },
  },
]; 