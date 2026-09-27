// SPDX-License-Identifier: Apache-2.0
import {chromium, firefox} from 'playwright';
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const prefix = '/custom/runtime-v1/';
// Exercise a minified application bundle; the worker installer is deliberately
// not exported, and application code must never execute inside a worker.
const bundle = await build({
  stdin: {contents: `
    export {Player} from './web/generated/index.js';
    export {runtimeBase} from './web/generated/internal/assets.js';
    export {runtimeWorker} from './web/generated/internal/runtime-worker.js';
    if (typeof document === 'undefined') throw Error('Application bundle executed in a worker');
  `, resolveDir:process.cwd()},
  bundle:true, minify:true, format:'esm', write:false,
});
const scripts = {
  'bundled-app.js': bundle.outputFiles[0].text,
  'web/outer.js': `const child = new Worker(new URL('./inner.js', import.meta.url), {type:'module'}); onmessage = e => child.postMessage(e.data); child.onmessage = e => postMessage(e.data);`,
  'web/inner.js': `onmessage = e => postMessage({value:e.data, query:new URL(import.meta.url).search});`,
  'web/engine.js': `import create from './engine-remux/remux.mjs'; const engine = await create(); postMessage({heap:engine.HEAPU8.length});`,
};
async function serve() {
  const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<div id="surface"></div>'); return; }
    const name = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname.slice(1);
    if (name.includes('..')) { res.writeHead(400).end(); return; }
    try {
      const bytes = scripts[name] ?? await readFile(path.resolve(name));
      res.setHeader('Content-Type', name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
      res.end(bytes);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {server, origin:`http://127.0.0.1:${server.address().port}`};
}
const pageServer = await serve(), cdn = await serve();
let browser;
try {
  browser = await (process.env.BROWSER === 'firefox' ? firefox : chromium).launch({headless:true, ...(process.env.BROWSER === 'firefox' ? {} : {channel:'chrome', args:['--autoplay-policy=no-user-gesture-required']})});
  for (const bundled of [false, true]) {
  const page = await browser.newPage();
  await page.goto(pageServer.origin);
  const result = await page.evaluate(async ({cdn, prefix, bundled}) => {
    const app = bundled ? await import('/bundled-app.js') : null;
    const {runtimeBase} = app ?? await import('/web/generated/internal/assets.js');
    const {runtimeWorker} = app ?? await import('/web/generated/internal/runtime-worker.js');
    const base = runtimeBase(cdn + prefix.slice(0, -1));
    if (runtimeBase('./my-runtime').href !== new URL('./my-runtime/', document.baseURI).href) throw Error('Relative root mismatch');
    for (const value of ['data:text/javascript,void 0', cdn + '/runtime?token=secret', cdn + '/runtime#fragment', 'https://user:password@example.com/runtime']) {
      let rejected = false;
      try { runtimeBase(value); } catch { rejected = true; }
      if (!rejected) throw Error('Accepted invalid root');
    }
    const request = (file, message) => new Promise((resolve, reject) => {
      const worker = runtimeWorker(new URL(file, base), {type:'module'});
      const timer = setTimeout(() => {worker.terminate(); reject(Error('Worker timed out: '+file));}, 20000);
      worker.onmessage = e => { clearTimeout(timer); worker.terminate(); resolve(e.data); };
      worker.onerror = e => { clearTimeout(timer); worker.terminate(); reject(Error(e.message)); };
      if (message) worker.postMessage(message);
    });
    const nested = await request('web/outer.js', 'queued during bootstrap');
    const query = await request('web/inner.js?audioOnly=1', 'query');
    const engine = await request('web/engine.js');
    const {Player} = app ?? await import('/web/generated/index.js');
    const player = new Player(document.querySelector('#surface'), {assetBase:base.href});
    await player.destroy();
    const bytes = await (await fetch('/fixtures/example.mp4')).arrayBuffer();
    const modes = [];
    for (const mode of ['hybrid', 'software']) {
      const current = new Player(document.querySelector('#surface'), {assetBase:base.href, mode});
      try {
        await current.open(new File([bytes], 'example.mp4', {type:'video/mp4'}));
        await current.play();
        const deadline = performance.now() + 15000;
        while ((current.properties.get('time-pos') ?? 0) < 0.2 && performance.now() < deadline) await new Promise(r => setTimeout(r, 50));
        if ((current.properties.get('time-pos') ?? 0) < 0.2) throw Error(mode + ' did not advance');
        modes.push(mode);
      } finally { await current.destroy(); }
    }
    return {base:base.href, nested, query, engine, modes, isolated:crossOriginIsolated};
  }, {cdn:cdn.origin, prefix, bundled});
  assert.equal(result.base, cdn.origin + prefix);
  assert.equal(result.isolated, true);
  assert.equal(result.nested.value, 'queued during bootstrap');
  assert.equal(result.query.query, '?audioOnly=1');
  assert.ok(result.engine.heap > 0);
  assert.deepEqual(result.modes, ['hybrid', 'software']);
  console.log(`${bundled ? 'Bundled' : 'Unbundled'} CDN assetBase, queued messages, nested workers, query parameters, remux Wasm initialization, and Hybrid/Software playback passed.`);
  await page.close();
  }
} finally {
  await browser?.close();
  await Promise.all([pageServer, cdn].map(({server}) => new Promise(resolve => server.close(resolve))));
}
