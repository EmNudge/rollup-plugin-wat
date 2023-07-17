import Wabt from "wabt";
import fs from "fs";
import { parse } from "@webassemblyjs/wast-parser";

/** @type {Awaited<ReturnType<typeof Wabt>> | undefined} */
let wabt;

/** @param {string} src */
function getDeclarationFileContents(src) {
  /**
   * @typedef {{ params: { id?: string, valtype: string }[], results: string[] }} Signature
   *
   * @typedef {{
   *  type: 'ModuleImport',
   *  module: string,
   *  name: string,
   *  descr: { signature: Signature }
   * }} ModuleImport
   *
   * @typedef {{
   *  type: 'ModuleExport',
   *  name: string,
   *  descr: { id: { value: string } }
   * }} ModuleExport
   *
   * @typedef {{
   *  type: 'Func',
   *  name: { value: string },
   *  signature: Signature
   * }} Func
   * */

  /**
   * @typedef {(Func | ModuleImport | ModuleExport)[]} FieldsAst
   */
  const fields = /** @type {FieldsAst} */ (parse(src).body[0].fields);

  /** @param {Signature} signature */
  const getFunctionSignature = (signature) => {
    const params = signature.params.map(
      ({ id, valtype }, i) => `${id ?? `param_${i}`}: ${valtype}`
    );

    const { results } = signature;
    let returnType = "void";
    if (results.length) {
      returnType =
        results.length === 1 ? results[0] : `[${results.join(", ")}]`;
    }
    return `(${params.join(", ")}) => ${returnType}`;
  };

  const importsArr = fields
    .filter(({ type }) => type === "ModuleImport")
    .map((moduleImport) => {
      const { module, name, descr } = /** @type {ModuleImport} */ (
        moduleImport
      );
      return `${module}: { ${name}: ${getFunctionSignature(descr.signature)} }`;
    });

  const functionHeaders = new Map(
    fields
      .filter(({ type }) => type === "Func")
      .map((funcDeclaration) => {
        const { name, signature } = /** @type {Func} */ (funcDeclaration);
        return [name.value, getFunctionSignature(signature)];
      })
  );
  const exportsArr = fields
    .filter(({ type }) => type === "ModuleExport")
    .map((moduleExport) => {
      const { name, descr } = /** @type {ModuleExport} */ (moduleExport);
      return `${name}: ${functionHeaders.get(descr.id.value)}`;
    });

  return [
    ["i32", "i64", "f32", "f64"]
      .map((type) => `type ${type} = number;`)
      .join("\n"),
    `type Imports = ${
      !importsArr.length ? undefined : `{ ${importsArr.join(", ")} }`
    }`,
    `type Exports = { exports: { ${exportsArr.join(", ")} } }`,
    `declare export function instantiate(imports${importsArr.length ? '' : '?'}: Imports): Promise<WebAssembly.Instance & Exports>;`,
  ].join("\n\n");
}

/** @type {() => import("vite").PluginOption} */
export function wat() {
  return {
    name: "rollup-plugin-wat",

    async transform(src, id) {
      if (/\.(was?t)$/.test(id)) {
        if (!wabt) {
          wabt = await Wabt();
        }
        const wasmFile = wabt.parseWat("inline", src, {
          mutable_globals: true,
          sat_float_to_int: true,
          sign_extension: true,
          bulk_memory: true,
        });

        const binary = wasmFile.toBinary({ write_debug_names: true }).buffer;
        const wasmBase64 = btoa(
          [...binary].map((c) => String.fromCharCode(c)).join("")
        );

        fs.writeFileSync(`${id}.d.ts`, getDeclarationFileContents(src));

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