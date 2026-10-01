// SPDX-License-Identifier: Apache-2.0
// Compiled code is shared; every engine still owns fresh memory and state.
export function preparedEngine(module){
 return module?{instantiateWasm(imports,receive){const instance=new WebAssembly.Instance(module,imports);receive(instance,module);return instance.exports;}}:{};
}
