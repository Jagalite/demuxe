// SPDX-License-Identifier: Apache-2.0
// Generate a finite synthetic VP8 fixture; its retained bytes are the test input.
import {writeFile, readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright';
const [output, receipt] = process.argv.slice(2);
if (!output || !receipt) throw Error('Pass fixture and receipt paths');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sdk = await build({entryPoints: ['node_modules/mediabunny/dist/modules/src/index.js'], bundle: true, format: 'esm', platform: 'browser', write: false});
const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const page = await browser.newPage();
  await page.route('https://pattern.test/**', route => route.fulfill(route.request().url().endsWith('/sdk.js') ? {contentType: 'text/javascript', body: Buffer.from(sdk.outputFiles[0].contents)} : {contentType: 'text/html', body: '<body></body>'}));
  await page.goto('https://pattern.test/');
  const bytes = Buffer.from(await page.evaluate(async () => {
    const r = await import('/sdk.js');
    const target = new r.BufferTarget(), output = new r.Output({format: new r.WebMOutputFormat(), target});
    const source = new r.VideoSampleSource({codec: 'vp8', bitrate: 400000}); output.addVideoTrack(source, {frameRate: 10}); await output.start();
    const canvas = new OffscreenCanvas(64, 48), ctx = canvas.getContext('2d');
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = '#e02040'; ctx.fillRect(0, 0, 64, 48);
      ctx.fillStyle = i % 2 ? '#1ccfe0' : '#20c050'; ctx.fillRect(0, 0, 24, 20);
      ctx.fillStyle = i % 3 ? '#e0d020' : '#2040e0'; ctx.fillRect(40, 0, 24, 20);
      ctx.fillStyle = '#4010d0'; ctx.fillRect((i * 3) % 56, 36, 8, 8);
      const sample = new r.VideoSample(canvas, {timestamp: i / 10, duration: .1});
      try {await source.add(sample, {keyFrame: i % 5 === 0});} finally {sample.close();}
    }
    source.close(); await output.finalize(); return Array.from(new Uint8Array(target.buffer));
  }));
  await writeFile(output, bytes, {flag: 'wx'});
  await writeFile(receipt, JSON.stringify({status: 'synthetic-fixture-created-not-qualification', browser: browser.version(), fixture: {bytes: bytes.length, sha256: sha(bytes)}, generatorSHA256: sha(await readFile(fileURLToPath(import.meta.url))), sdkBundleSHA256: sha(sdk.outputFiles[0].contents), description: '64x48 VP8, 30 frames at 10 fps, colored regions change over time'}, null, 2) + '\n', {flag: 'wx'});
} finally {await browser.close();}
