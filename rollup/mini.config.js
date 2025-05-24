import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'es',
    sourcemap: false,
    exports: 'named',
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      module: 'NodeNext',
      tsconfig: './tsconfig.build-mini.json',
      declaration: false, // Explicitly disable declaration files, we will roll these up manually
      noEmitOnError: true, // Don't emit JS files if there are errors
    }),
    terser({
      module: true,
      mangle: false,
      compress: {
        defaults: false,
        drop_console: true,
        keep_fargs: true,
        keep_classnames: true,
        keep_fnames: true,
      },
    }),
  ],
  treeshake: true,
};
