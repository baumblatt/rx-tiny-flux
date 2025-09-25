import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';

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
  // Third entry point for ZeppOS plugin
  {
    input: 'src/zeppos.js',
    output: [
      {
        file: 'dist/zeppos.esm.js',
        format: 'es',
        sourcemap: false,
      },
      {
        file: 'dist/zeppos.esm.min.js',
        format: 'es',
        sourcemap: false,
        plugins: [terser()],
      },
    ],
    plugins: [json(), nodeResolve(), commonjs()],
  },
];