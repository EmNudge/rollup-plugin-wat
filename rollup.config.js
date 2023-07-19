import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: [
    {
      format: 'esm',
      file: 'dist/esm.js',
      exports: 'named',
      sourcemap: false,
    },
    {
      format: 'cjs',
      file: 'dist/cjs.js',
      exports: 'named',
      sourcemap: false,
    },
  ],
  plugins: [
    typescript(),
  ]
}