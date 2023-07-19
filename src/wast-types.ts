export interface Signature {
  params: { id?: string, valtype: string }[];
  results: string[];
}

export interface ModuleImport {
  type: 'ModuleImport',
  module: string,
  name: string,
  descr: { signature: Signature }
}

export interface ModuleExport {
  type: 'ModuleExport',
  name: string,
  descr: { id: { value: string } }
}

export interface Func {
  type: 'Func',
  name: { value: string },
  signature: Signature
}