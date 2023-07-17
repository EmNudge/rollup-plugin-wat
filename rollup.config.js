export default {
  input: 'main.js',
  output: [
    {
      format: 'cjs',
      file: 'cjs.js',
      exports: 'named',
      sourcemap: false,
    },
  ]
}