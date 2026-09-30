// SPDX-License-Identifier: MIT
// Emscripten's linker must know these names, but their Wasm imports live in
// explicit namespaces and are bound by engine.mjs. Any fallback is terminal.
for (const name of ['self','panic','wait','wake','waiters','create','join','detach','name','yield']) {
  addToLibrary({['demuxe_coop_'+name]:function(){throw new Error('Unbound cooperative import');}});
}
for (const name of ['open','size','valid','read','cancel','close','cancel_all']) {
  addToLibrary({['demuxe_source_'+name]:function(){throw new Error('Unbound source import');}});
}
