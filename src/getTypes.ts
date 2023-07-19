import { parse } from "@webassemblyjs/wast-parser";
import type { Signature, ModuleExport, ModuleImport, Func } from "./wast-types.ts";

export const getFunctionSignature = (signature: Signature) => {
  const params = signature.params.map(
    ({ id, valtype }, i) => `${id ?? `param_${i}`}: ${valtype}`
  );

  const { results } = signature;
  let returnType = "void";
  if (results.length) {
    returnType = results.length === 1 ? results[0] : `[${results.join(", ")}]`;
  }
  return `(${params.join(", ")}) => ${returnType}`;
};

export const getDeclarationFileContents = (src: string) => {
  const fields = parse(src).body[0].fields as (Func | ModuleImport | ModuleExport)[];

  // Only include the necessary type aliases
  const types = new Set();

  const importsArr = fields
    .filter(({ type }) => type === "ModuleImport")
    .map((moduleImport) => {
      const { module, name, descr } = moduleImport as ModuleImport;
      for (const { valtype } of descr.signature.params) types.add(valtype);
      for (const valtype of descr.signature.results) types.add(valtype);

      return `${module}: { ${name}: ${getFunctionSignature(descr.signature)} }`;
    });

  const functionHeaders = new Map(
    fields
      .filter(({ type }) => type === "Func")
      .map((funcDeclaration) => {
        const { name, signature } = funcDeclaration as Func;
        for (const { valtype } of signature.params) types.add(valtype);
        for (const valtype of signature.results) types.add(valtype);

        return [name.value, getFunctionSignature(signature)];
      })
  );
  const exportsArr = fields
    .filter(({ type }) => type === "ModuleExport")
    .map((moduleExport) => {
      const { name, descr } = moduleExport as ModuleExport;
      return `${name}: ${functionHeaders.get(descr.id.value)}`;
    });

  return [
    ["i32", "i64", "f32", "f64"]
      .filter(type => types.has(type))
      .map((type) => `type ${type} = number;`)
      .join("\n"),
    `type Imports = ${!importsArr.length ? undefined : `{ ${importsArr.join(", ")} }`
    }`,
    `type Exports = { exports: { ${exportsArr.join(", ")} } }`,
    `declare export function instantiate(imports${importsArr.length ? "" : "?"
    }: Imports): Promise<WebAssembly.Instance & Exports>;`,
  ].join("\n\n");
}
