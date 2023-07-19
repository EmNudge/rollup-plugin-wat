import { describe, it, assert } from "vitest";
import {
  getFunctionSignature,
  getDeclarationFileContents,
} from "../src/getTypes.ts";

describe("getFunctionSignature", () => {
  it("types voided functions", () => {
    const emptyFunctionType = getFunctionSignature({ params: [], results: [] });
    assert.equal(emptyFunctionType, "() => void");
  });

  it("types unnamed params", () => {
    const emptyFunctionType = getFunctionSignature({
      params: [{ valtype: "i32" }, { valtype: "i32" }],
      results: [],
    });
    assert.equal(emptyFunctionType, "(param_0: i32, param_1: i32) => void");
  });

  it("types named params", () => {
    const emptyFunctionType = getFunctionSignature({
      params: [{ valtype: "i32", id: "nodes" }, { valtype: "i32" }],
      results: [],
    });
    assert.equal(emptyFunctionType, "(nodes: i32, param_1: i32) => void");
  });
});

describe("getDeclarationFileContents", () => {
  it("types an empty module", () => {
    const types = getDeclarationFileContents(`(module)`);
    assert.equal(
      types,
      `

type Imports = undefined

type Exports = { exports: {  } }

declare export function instantiate(imports?: Imports): Promise<WebAssembly.Instance & Exports>;`
    );
  });

  it("types imports and exports", () => {
    const types = getDeclarationFileContents(`(module
      (import "console" "log" (func $log (param i32)))

      (func $main)
      (export "main" (func $main))
    )`);
    assert.include(
      types,
      `type Imports = { console: { log: (param_0: i32) => void } }`
    );
    assert.include(types, `type Exports = { exports: { main: () => void } }`);
  });

  it("only aliases the number types used", () => {
    const types = getDeclarationFileContents(`(module
      (import "math" "sin" (func $math (param f32) (result f64)))
    )`);
    assert.include(types, `type f32 = number`);
    assert.include(types, `type f64 = number`);
    assert.notInclude(types, `type i32 = number`);
    assert.notInclude(types, `type i64 = number`);
  });
});
