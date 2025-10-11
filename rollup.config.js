import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';

export default [
  // Main library bundle
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/rx-tiny-flux.esm.js',
        format: 'es',
        sourcemap: false,
      },
      {
        file: 'dist/rx-tiny-flux.esm.min.js',
        format: 'es',
        sourcemap: false,
        plugins: [terser()],
      },
    ],
    plugins: [json(), nodeResolve(), commonjs()],
  },
  // Type Definitions bundle
  {
    input: 'src/rx-tiny-flux.d.ts',
    output: [{ file: 'dist/rx-tiny-flux.d.ts', format: 'es' }],
    plugins: [dts()],
  },
];