import { writeFileSync } from 'fs';
import type { Plugin } from 'rollup';
import { getDeclarationFileContents } from './getTypes.ts';
import { parseWatToBase64 } from './parseWat.ts';

export function wat(): Plugin {
  return {
    name: "rollup-plugin-wat",

    async transform(src, id) {
      if (/\.(was?t)$/.test(id)) {
        const wasmBase64 = await parseWatToBase64(src);

        writeFileSync(`${id}.d.ts`, getDeclarationFileContents(src));
        
        return {
          map: null,
          code: `// compiled from wat
            export async function instantiate(imports = {}) {
              const binary = new Uint8Array([...atob("${wasmBase64}")].map(c => c.charCodeAt(0)))
              let { instance } = await WebAssembly.instantiate(binary, imports);
              return instance;
            }
          `,
        };
      }
    },
  };
}