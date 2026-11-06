import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import json from '@eslint/json';
import markdown from '@eslint/markdown';
import deslint from '@deslint/eslint-plugin';
import sonarjs from 'eslint-plugin-sonarjs';
import deMorgan from 'eslint-plugin-de-morgan';
import unicorn from 'eslint-plugin-unicorn';
import typescriptEslintParser from '@typescript-eslint/parser';
import depend from 'eslint-plugin-depend';
import deprecate from 'eslint-plugin-deprecate';
import node from 'eslint-plugin-n';
import { jsdoc } from 'eslint-plugin-jsdoc';
import security from 'eslint-plugin-security';
import vitest from '@vitest/eslint-plugin';
import regexp from "eslint-plugin-regexp"
import promise from 'eslint-plugin-promise'
import perfectionist from 'eslint-plugin-perfectionist'
import stylistic from '@stylistic/eslint-plugin'
import prettier from "eslint-config-prettier/flat";
import { defineConfig, globalIgnores } from 'eslint/config';

const JS_FILES = '**/*.{ts,mts,cts}';
const TS_FILES = '**/*.{ts,mts,cts}';

export default defineConfig([
  globalIgnores(['node_modules', 'dist', 'package-lock.json', 'test/results/**']),
  {
    files: [JS_FILES, TS_FILES],
    plugins: { js, unicorn, depend, deprecate, n: node, '@stylistic': stylistic },
    extends: [
      'js/recommended',
      "n/recommended-module",
      deslint.configs.recommended,
      deMorgan.configs.recommended,
      sonarjs.configs.recommended,
      security.configs.recommended,
      regexp.configs.recommended,
      promise.configs['flat/recommended'],
      perfectionist.configs["recommended-natural"]
    ],
    languageOptions: {
      globals: { ...globals.node, ...globals.builtin },
      parser: typescriptEslintParser,
    },
  },
  {
    files: [JS_FILES],
    extends: [jsdoc({ config: 'flat/recommended' })],
  },
  {
    files: [TS_FILES],
    extends: [
      tseslint.configs.recommended,
      jsdoc({ config: 'flat/recommended-tsdoc' })
    ],
  },
  {
    files: ['{test,src}/**/*.*{test,spec}.{ts,js}'],
    plugins: { vitest },
  },
  {
    files: ['**/*.json'],
    plugins: { json },
    language: 'json/json',
    extends: ['json/recommended'],
  },
  {
    files: ['**/*.jsonc'],
    plugins: { json },
    language: 'json/jsonc',
    extends: ['json/recommended'],
  },
  {
    files: ['**/*.json5'],
    plugins: { json },
    language: 'json/json5',
    extends: ['json/recommended'],
  },
  {
    files: ['**/*.md'],
    plugins: { markdown },
    language: 'markdown/gfm',
    extends: ['markdown/recommended'],
  },
  prettier
]);
