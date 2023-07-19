import { describe, it, assert } from "vitest";
import { parseWatToBase64 } from "../src/parseWat.ts";

describe("parseWatToBase64", () => {
  it("converts wat to base64", async () => {
    const base64Wasm = await parseWatToBase64(`(module 
      (func $add (param $a i32) (param $b i32) (result i32)
        (return (i32.add (local.get $a) (local.get $b)))
      )
      (export "add" (func $add))
    )`);

    const binary = new Uint8Array([...atob(base64Wasm)].map(c => c.charCodeAt(0)))

    const { instance } = await WebAssembly.instantiate(binary);
    // @ts-ignore
    const result: number = instance.exports.add(5, 5)
    assert.equal(10, result);
  })
})