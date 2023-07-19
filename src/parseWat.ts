import Wabt from "wabt";

let wabt: Awaited<ReturnType<typeof Wabt>> | undefined;

export const parseWatToBase64 = async (src: string) => {
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

  return wasmBase64;
};
