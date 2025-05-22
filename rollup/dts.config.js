// rollup.dts.config.js
import dts from 'rollup-plugin-dts';

export default {
  input: './dist/temp-dts/index.d.ts',
  output: {
    file: './dist/index.d.ts',
    format: 'es',
  },
  plugins: [dts()],
};
