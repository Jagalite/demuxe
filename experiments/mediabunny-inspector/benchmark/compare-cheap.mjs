// Focused cheapMP4Probe versus MediaBunny benchmark on an MP4 both accept.
import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const fixture = path.join(root, 'fixtures/example.mp4');
const server = http.createServer(async (req, res) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'no-store');
  const target = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!target.startsWith(root + path.sep)) {res.writeHead(403).end(); return;}
  try {
    const info = await stat(target); if (!info.isFile()) throw Error('not file');
    res.setHeader('Content-Type', target.endsWith('.js') || target.endsWith('.mjs') ? 'text/javascript' : target.endsWith('.html') ? 'text/html' : 'application/octet-stream');
    res.setHeader('Content-Length', info.size);
    res.writeHead(200); createReadStream(target).pipe(res);
  } catch {res.writeHead(404).end();}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const output = {schema: 1, date: new Date().toISOString(), fixture: 'fixtures/example.mp4', browser: browser.version(), rows: []};
try {
  for (let pair = 0; pair < 10; pair++) for (const method of pair % 2 ? ['mediabunny', 'cheap'] : ['cheap', 'mediabunny']) {
    const context = await browser.newContext(); const page = await context.newPage();
    try {
      await page.goto(`http://127.0.0.1:${server.address().port}/experiments/mediabunny-inspector/benchmark/page.html`);
      await page.locator('#media').setInputFiles(fixture);
      const cold = await page.evaluate(method => globalThis.benchInspector(method), method);
      const warm = await page.evaluate(method => globalThis.benchInspector(method), method);
      output.rows.push({pair, method, coldMs: cold.wallMs, warmMs: warm.wallMs,
        accepted: !!cold.probe, mediaBytes: method === 'cheap' ? cold.details.bytesRead : cold.details.bytesRead,
        resources: cold.resources.filter(x => x.name.includes('cheap-mp4-probe') || x.name.includes('mediabunny-1.60.0'))});
    } catch (error) {output.rows.push({pair, method, error: String(error)});}
    finally {await context.close();}
  }
} finally {await browser.close(); await new Promise(resolve => server.close(resolve));}
await writeFile(path.join(here, '../notes/cheap-vs-mediabunny.json'), JSON.stringify(output, null, 2) + '\n');
