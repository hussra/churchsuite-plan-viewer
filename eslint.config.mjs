import js from "@eslint/js";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";
import { glob } from "original-fs";

const webpackEntryGlobals = {
  ABOUT_PRELOAD_WEBPACK_ENTRY: 'readonly',
  ABOUT_WEBPACK_ENTRY: 'readonly',
  EDITOR_PRELOAD_WEBPACK_ENTRY: 'readonly',
  EDITOR_WEBPACK_ENTRY: 'readonly',
  LEFT_PANE_PRELOAD_WEBPACK_ENTRY: 'readonly',
  LEFT_PANE_WEBPACK_ENTRY: 'readonly',
  RIGHT_PANE_PRELOAD_WEBPACK_ENTRY: 'readonly',
  RIGHT_PANE_WEBPACK_ENTRY: 'readonly',
}

const defaultConfig = {
  plugins: { js },
  rules: {
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_(.+)',
        caughtErrorsIgnorePattern: '^_'
      }
    ],
    'semi': [ 'error', 'never' ],
  },
  extends: ["js/recommended"],
  languageOptions: { globals: globals.nodeBuiltin }  
}

export default defineConfig([
  { ...defaultConfig, files: ["src/main/**/*.{js,mjs,cjs}"], languageOptions: { globals: { ...globals.nodeBuiltin, ...webpackEntryGlobals } } },
  { ...defaultConfig, files: ["src/renderer/**/*.{js,mjs,cjs}"], languageOptions: { globals: globals.browser } },
  globalIgnores([
    "dist/**/*",
    "node_modules/**/*",
    "out/**/*",
    ".webpack/**/*",
    ".yarn/**/*",
  ]),
]);