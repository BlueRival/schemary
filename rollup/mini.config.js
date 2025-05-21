import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'es',
    sourcemap: true,
    exports: 'named',
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript({ module: 'NodeNext', tsconfig: './tsconfig.build.json' }),
    terser({
      // ← add terser() at the end
      module: true, // enable top-level scope minification
      compress: {
        drop_console: true, // optional: strip console.* calls
      },
      mangle: true, // shorten variable and function names
      // see full list of options in the plugin README
    }),
  ],
  treeshake: true,
};
