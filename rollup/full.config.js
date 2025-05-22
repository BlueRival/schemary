import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

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
    typescript({
      module: 'NodeNext',
      tsconfig: './tsconfig.build.json',
      declaration: false, // Explicitly disable declaration files, we will roll these up manually
      noEmitOnError: true, // Don't emit JS files if there are errors
    }),
  ],
  treeshake: true,
};
