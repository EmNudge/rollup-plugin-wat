# rollup-plugin-wat

A Rollup plugin for directly importing "[WebAssembly Text Format](https://developer.mozilla.org/en-US/docs/WebAssembly/Understanding_the_text_format)" files.

Imports are dynamically typed via creation of a local `.d.ts` file next to the `.wat` source.

## Install

using npm
```sh
npm install --save-dev rollup-plugin-wat 
```

## Usage

Add the plugin to your `plugins` array in your `rollup.config.js` file.

```js
import { wat } from 'rollup-plugin-wat';

export default {
  // ...some other config
  plugins: [wat()]
}
```


## Credits

* General package setup copied from [@rollup/plugin-wasm](https://github.com/rollup/plugins/tree/master/packages/wasm).
* [wat2wasm](https://github.com/WebAssembly/wabt) npm package from [AssemblyScript](https://github.com/AssemblyScript/wabt.js) for creating wasm from wat files
* [webassembly.js](https://github.com/xtuc/webassemblyjs) for the AST used for extracting type information