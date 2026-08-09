import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: [".next", "dist", "node_modules", "donotcommit", "verification", ".verification"] },
  js.configs.recommended,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      // "latest", not 2022: lib/crypto-structures.js carries an import
      // attribute (`with { type: "json" }`), which Node has REQUIRED on JSON
      // modules since 22 and which espree only parses past ES2022. Pinned at
      // 2022 the file did not lint with an error, it failed to PARSE — eslint
      // saw none of it. Raising the ceiling only admits newer syntax; no rule
      // is relaxed by it.
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
    },
  },
  {
    files: ["app/api/**/*.js", "lib/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
