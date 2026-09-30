// SPDX-License-Identifier: Apache-2.0
// Serialized into the bundle and each worker realm. No application globals are
// replaced: compiled runtime code calls this instance explicitly.
export function embeddedRuntime(pack, base, key, moduleURL) {
  const registered = globalThis[Symbol.for(key)];
  if (registered) return registered;
  const NativeWorker = globalThis.Worker ?? class {constructor() {throw Error('Workers are unavailable in this realm');}}, nativeFetch = globalThis.fetch?.bind(globalThis);
  const urls = new Map(), workers = new Set(), disposal = new Set();
  let disposed = false;
  const active = () => { if (disposed) throw Error('Embedded Demuxe runtime has been disposed'); };
  const identify = value => {
    const url = new URL(value instanceof Request ? value.url : String(value), base);
    if (!url.href.startsWith(base)) return undefined;
    return {url, path: decodeURIComponent(url.pathname.slice(new URL(base).pathname.length))};
  };
  const bytes = item => Uint8Array.from(atob(item.data), c => c.charCodeAt(0));
  const get = name => { active(); const item = pack[name]; if (!item) throw Error('Embedded runtime asset is absent: ' + name); return item; };
  const blob = (id, content, type) => {
    let result = urls.get(id);
    if (!result) { result = URL.createObjectURL(new Blob([content], {type})); urls.set(id, result); }
    return result;
  };
  // Wasm/font bytes live in shared Blob backing stores. Worker realms receive
  // their URLs instead of parsing a fresh copy of every engine's base64 data.
  const peerModule = () => {
    if (Object.values(pack).every(item => item.dataURL)) return moduleURL;
    if (urls.has('peer-module')) return urls.get('peer-module');
    const thin = Object.fromEntries(Object.entries(pack).map(([name,item]) => [name, {mime:item.mime, code:item.code, dataURL:blob('data:' + name, bytes(item), item.mime)}]));
    return blob('peer-module', `const pack=${JSON.stringify(thin)};const create=${embeddedRuntime.toString()};export function start(url){return create(pack,${JSON.stringify(base)},${JSON.stringify(key)},url);}`, 'text/javascript');
  };
  const runtime = {
    assetBase: base,
    createElementPlayer(element, fallback, container, options) {
      const owner = element[Symbol.for(base + 'element-owner')];
      if (!owner || owner.diagnostics().disposed) throw Error('Register this player element with a live embedded Demuxe runtime before connecting it');
      return new owner.api.Player(container, {...options, assetBase: options.assetBase ?? owner.assetBase});
    },
    url(value) {
      active(); const found = identify(value); if (!found) return String(value);
      const item = get(found.path);
      if (item.code !== undefined) {
        // import.meta.url retains the original deployment path and query,
        // including the retained worker's audioOnly parameter.
        const code = item.code.split(JSON.stringify(base + found.path)).join(JSON.stringify(found.url.href));
        const peer = peerModule();
        return blob('code:' + found.url.href, `import {start as __startDemuxe} from ${JSON.stringify(peer)};\nconst __demuxe = __startDemuxe(${JSON.stringify(peer)});\n` + code, 'text/javascript');
      }
      return item.dataURL ?? blob('data:' + found.path, bytes(item), item.mime);
    },
    import(value, from = base) { return import(runtime.url(new URL(String(value), from).href)); },
    async fetch(value, options) {
      active(); const found = identify(value); if (!found) return nativeFetch(value, options);
      const request = new Request(value instanceof Request ? value : found.url, options);
      request.signal.throwIfAborted();
      const item = pack[found.path];
      if (!item) return new Response(null, {status: 404});
      if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, {status: 405});
      const data = item.dataURL ? new Uint8Array(await (await nativeFetch(item.dataURL, {signal:request.signal})).arrayBuffer()) : bytes(item);
      // Return original verified bytes, not transformed executable code. This
      // preserves provider acquisition's SHA256 and implementation identities.
      return new Response(request.method === 'HEAD' ? null : data, {headers: {'Content-Type': item.mime, 'Content-Length': String(data.length)}});
    },
    Worker: class extends NativeWorker {
      constructor(value, options = {}) {
        active(); const found = identify(value);
        if (!found) { super(value, options); workers.add(this); return; }
        get(found.path);
        const peer = peerModule();
        const bootstrap = `
          const pending = [];
          const hold = event => { event.stopImmediatePropagation(); pending.push(event); };
          addEventListener('message', hold);
          const {start} = await import(${JSON.stringify(peer)});
          const runtime = start(${JSON.stringify(peer)});
          await runtime.import(${JSON.stringify(found.url.href)});
          removeEventListener('message', hold);
          for (const event of pending) dispatchEvent(new MessageEvent('message', {data:event.data, ports:event.ports, origin:event.origin}));
        `;
        const url = blob('worker:' + found.url.href, bootstrap, 'text/javascript');
        super(url, {...options, type: 'module'}); workers.add(this);
      }
      terminate() { workers.delete(this); super.terminate(); }
    },
    XMLHttpRequest: class extends (globalThis.XMLHttpRequest ?? class {}) {
      open(method, url, ...rest) { return super.open(method, runtime.url(url), ...rest); }
    },
    onDispose(callback) { active(); disposal.add(callback); },
    diagnostics() { return {disposed, objectURLs: urls.size, workers: workers.size, assets: Object.keys(pack).length}; },
    dispose() {
      if (disposed) return;
      for (const worker of [...workers]) worker.terminate();
      for (const url of urls.values()) URL.revokeObjectURL(url);
      urls.clear(); disposed = true;
      for (const callback of disposal) callback();
      disposal.clear();
      delete globalThis[Symbol.for(key)];
    },
  };
  globalThis[Symbol.for(key)] = runtime;
  return runtime;
}

// Registration survives runtime disposal. The most recently registered live
// runtime owns future connections; players already connected retain their owner.
export function embeddedElements(runtime, player, key) {
  const symbol = Symbol.for(key + '.elements');
  const registry = globalThis[symbol] ??= new Map();
  return function definePlayerElement(name = 'demuxe-player') {
    if (runtime.diagnostics().disposed) throw Error('Embedded Demuxe runtime has been disposed');
    const existing = customElements.get(name);
    let record = registry.get(name);
    if (existing && existing !== record?.constructor) throw Error('Custom element ' + name + ' is already registered with another implementation');
    if (!record) {
      record = {owners: [], constructor: class extends player.DemuxePlayerElement {}};
      Object.defineProperty(record.constructor.prototype, Symbol.for(runtime.assetBase + 'element-owner'), {get() {
        return [...record.owners].reverse().find(owner => !owner.diagnostics().disposed);
      }});
      registry.set(name, record);
      customElements.define(name, record.constructor);
    }
    record.owners = record.owners.filter(owner => owner !== runtime && !owner.diagnostics().disposed);
    record.owners.push(runtime);
    runtime.onDispose(() => { record.owners = record.owners.filter(owner => owner !== runtime); });
    return record.constructor;
  };
}
