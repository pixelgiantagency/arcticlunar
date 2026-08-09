import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default [
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      eqeqeq: "warn",
      "prefer-const": "warn",
    },
  },
  eslintConfigPrettier,
];
