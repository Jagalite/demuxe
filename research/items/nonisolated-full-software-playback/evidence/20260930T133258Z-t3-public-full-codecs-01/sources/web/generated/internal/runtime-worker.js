// SPDX-License-Identifier: Apache-2.0
/** Cross-origin module workers need a same-origin Blob entry point. */
export function runtimeWorker(url, options = { type: 'module' }, WorkerClass = Worker, helperURL = new URL('./generated/internal/runtime-worker.js', url)) {
    if (url.origin === globalThis.location.origin || url.protocol === 'blob:')
        return new WorkerClass(url, options);
    if (options.type !== 'module')
        throw new Error('Cross-origin runtime workers must be modules');
    // Public runtime entry workers live in web/. Resolve the installer from that
    // deployed tree, never from a consumer bundle's import.meta.url. Nested
    // workers pass the installer's URL explicitly, including engine pthreads.
    const bootstrap = `
    import {installRuntimeWorkers} from ${JSON.stringify(helperURL.href)};
    installRuntimeWorkers();
    const pending = [];
    const hold = event => { event.stopImmediatePropagation(); pending.push(event); };
    addEventListener('message', hold);
    await import(${JSON.stringify(url.href)});
    removeEventListener('message', hold);
    for (const event of pending) dispatchEvent(new MessageEvent('message', {data:event.data, ports:event.ports, origin:event.origin}));
  `;
    const blob = URL.createObjectURL(new Blob([bootstrap], { type: 'text/javascript' }));
    let worker;
    try {
        worker = new WorkerClass(blob, options);
    }
    catch (error) {
        URL.revokeObjectURL(blob);
        throw error;
    }
    const release = () => URL.revokeObjectURL(blob);
    worker.addEventListener('message', release, { once: true });
    worker.addEventListener('error', release, { once: true });
    const terminate = worker.terminate.bind(worker);
    worker.terminate = () => { release(); terminate(); };
    return worker;
}
/** Install only inside a CDN worker, covering nested workers and Emscripten pthreads. */
export function installRuntimeWorkers() {
    const NativeWorker = globalThis.Worker;
    const CDNWorker = function (url, options) {
        return runtimeWorker(new URL(url, globalThis.location.href), options, NativeWorker, new URL(import.meta.url));
    };
    CDNWorker.prototype = NativeWorker.prototype;
    Object.setPrototypeOf(CDNWorker, NativeWorker);
    globalThis.Worker = CDNWorker;
}
