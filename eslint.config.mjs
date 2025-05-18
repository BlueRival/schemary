// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      ecmaVersion: 5,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/require-await': 'off',
      'no-restricted-globals': [
        'error',
        {
          name: 'ReadableStream',
          message:
            'Import ReadableStream from "stream/web" instead of using the global.',
        },
        {
          name: 'WritableStream',
          message:
            'Import WritableStream from "stream/web" instead of using the global.',
        },
        {
          name: 'TransformStream',
          message:
            'Import TransformStream from "stream/web" instead of using the global.',
        },
        {
          name: 'ReadableStreamDefaultController',
          message:
            'Import ReadableStreamDefaultController from "stream/web" instead of using the global.',
        },
        {
          name: 'WritableStreamDefaultController',
          message:
            'Import WritableStreamDefaultController from "stream/web" instead of using the global.',
        },
        {
          name: 'TransformStreamDefaultController',
          message:
            'Import TransformStreamDefaultController from "stream/web" instead of using the global.',
        },
        {
          name: 'ReadableStreamDefaultReader',
          message:
            'Import ReadableStreamDefaultReader from "stream/web" instead of using the global.',
        },
        {
          name: 'WritableStreamDefaultWriter',
          message:
            'Import WritableStreamDefaultWriter from "stream/web" instead of using the global.',
        },
      ],
    },
  },
);