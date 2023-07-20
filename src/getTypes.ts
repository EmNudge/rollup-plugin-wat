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

/**
 * Collapse imports which share a module into a serialized TS type
 * */
export const getImportsTypeString = (fields: (Func | ModuleImport | ModuleExport)[]) => {
  const types = new Set<string>();

  const importsObj: { [moduleName: string]: { [name: string]: string } } = {};
  for (const field of fields) {
    if (field.type !== 'ModuleImport') continue;
    const { module: moduleName, name, descr } = field;

    if (!importsObj[moduleName]) {
      importsObj[moduleName] = { [name]: '' };
    }

    if (descr.type === 'Memory') {
      importsObj[moduleName][name] = 'WebAssembly.Memory';
      continue;
    }
    if (descr.type === 'Table') {
      importsObj[moduleName][name] = 'WebAssembly.Table';
      continue;
    }
    if (descr.type === 'FuncImportDescr') {
      const { params, results } = descr.signature;
      for (const { valtype } of params) types.add(valtype);
      for (const valtype of results) types.add(valtype);
      
      importsObj[moduleName][name] = getFunctionSignature(descr.signature);
      continue;
    }

    throw new Error('unsupported input type from module' + JSON.stringify(field));
  }

  // Serialize JS object into a TS type by removing quotes. Add spaces for clarity.
  const imports = JSON.stringify(importsObj)
    .replace(/"/g, '')
    .replace(/(\{|:|,)/g, '$1 ')
    .replace(/(\})/g, ' $1');
  
  return { usedTypes: [...types], imports: imports === '{  }' ? undefined : imports };
}

export const getExportsTypeString = (fields: (Func | ModuleImport | ModuleExport)[]) => {
  const types = new Set<string>();

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

  return { usedTypes: [...types], exports: `{ ${exportsArr.join(', ')} }` }
}

export const getDeclarationFileContents = (src: string) => {
  const fields = parse(src).body[0].fields as (Func | ModuleImport | ModuleExport)[];

  const { usedTypes, imports } = getImportsTypeString(fields);

  const { usedTypes: usedTypes2, exports } = getExportsTypeString(fields);

  const types = new Set([...usedTypes, ...usedTypes2]);

  return [
    ["i32", "i64", "f32", "f64"]
      .filter(type => types.has(type))
      .map((type) => `type ${type} = number;`)
      .join("\n"),
    `type Imports = ${imports ?? 'undefined'}`,
    `type Exports = { exports: ${exports} }`,
    `declare export function instantiate(imports${!imports ? "?" : ""}: Imports): Promise<WebAssembly.Instance & Exports>;`,
  ].join("\n\n");
}
