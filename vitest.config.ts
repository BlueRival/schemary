import os from 'os';
import { defineConfig, configDefaults } from 'vitest/config';

// Define test patterns
const patterns: Record<string, string[]> = {
  unit: ['src/**/*.spec.ts'],
  build: ['test/e2e/*.e2e-spec.ts'],
};

// Get pattern from environment or default to all
const targetTests = process.env.TARGET_TESTS || 'all';

if (!(targetTests in patterns)) {
  throw new Error(`Invalid target tests: ${targetTests}`);
}

const include: string[] = patterns[targetTests];
// Coverage exclude patterns
let coverageExclude = [
  ...(configDefaults.coverage.exclude ?? []),
  'test/**',
  'rollup/**',
  'node_modules/**',
  'scripts/**',
  'src/mapping/parser/ast/types.ts',
];
const coverageInclude: string[] = [];

// for build, we only want to tests the distribution dir
if (process.env.TARGET_TESTS === 'build') {
  coverageExclude.push('src/**');
  coverageExclude = coverageExclude.filter((pattern) => pattern !== 'dist/**');
  coverageInclude.push('dist/index.js');
}

export default defineConfig({
  test: {
    minWorkers: 1,
    maxWorkers: Math.min(os.cpus().length, 20),
    include,
    exclude: [...configDefaults.exclude, 'dist', 'node_modules'],
    environment: 'node',
    globals: true,
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      exclude: [...coverageExclude],
      include: coverageInclude.length > 0 ? [...coverageInclude] : undefined,
    },
  },
});
