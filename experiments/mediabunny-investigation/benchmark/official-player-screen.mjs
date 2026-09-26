// SPDX-License-Identifier: Apache-2.0
// Screen Demuxe fixtures with MediaBunny's published media-player example.
// The example uses CanvasSink and AudioBufferSink for timed playback.
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../..');
const cases = [
  ['H.264 + AAC / MP4', 'build/head-to-head/assets-expanded-03/fixtures/aac.mp4'],
  ['H.264 + AAC / MKV', 'build/head-to-head/assets-expanded-03/fixtures/aac.mkv'],
  ['Dual-audio H.264 + AAC + AC-3 stereo / MKV', 'build/head-to-head/assets-release-auto-fix-20260925-03/fixtures/h264-dual-audio/index.mkv'],
  ['H.264 + PCM24 / MKV', 'build/head-to-head/assets-expanded-03/fixtures/pcm.mkv'],
];
const output = path.resolve(process.argv.find(x => x.startsWith('--out='))?.slice(6) ?? path.join(import.meta.dirname, '../notes/official-player-first-four.json'));
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const browserVersion = browser.version();
let playerAsset = null;
const results = [];
try {
  for (const [label, relative] of cases) {
    const file = path.join(root, relative);
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      window.__screen = { draws: 0, audioStarts: 0, nonzeroAudioBuffers: 0 };
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (...args) {
        if (this.canvas.id === 'canvas' || this.canvas.closest?.('#player')) window.__screen.draws++;
        return draw.apply(this, args);
      };
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...args) {
        window.__screen.audioStarts++;
        if (this.buffer) {
          const data = this.buffer.getChannelData(0);
          for (let i = 0; i < data.length; i += Math.max(1, Math.floor(data.length / 128))) {
            if (Math.abs(data[i]) > 0.001) { window.__screen.nonzeroAudioBuffers++; break; }
          }
        }
        return start.apply(this, args);
      };
    });
    const row = { label, fixture: relative, error: null, consoleErrors: errors };
    try {
      row.sha256 = createHash('sha256').update(await (await import('node:fs/promises')).readFile(file)).digest('hex');
      await page.goto('https://mediabunny.dev/examples/media-player/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!playerAsset) {
        const assetPath = await page.locator('script[src*="media-player"]').getAttribute('src');
        if (assetPath) {
          const url = new URL(assetPath, page.url()).href;
          const response = await page.request.get(url);
          if (response.ok()) playerAsset = { url, sha256: createHash('sha256').update(await response.body()).digest('hex') };
        }
      }
      const chooser = page.waitForEvent('filechooser');
      await page.locator('#select-file').click();
      await (await chooser).setFiles(file);
      await Promise.race([
        page.locator('#player').waitFor({ state: 'visible', timeout: 30000 }),
        page.locator('#error-element:not(:empty)').waitFor({ state: 'visible', timeout: 30000 }),
      ]);
      const snapshot = () => page.evaluate(() => ({
        error: document.querySelector('#error-element')?.textContent,
        warning: document.querySelector('#warning-element')?.textContent,
        time: document.querySelector('#current-time')?.textContent,
        duration: document.querySelector('#duration')?.textContent,
        playerVisible: getComputedStyle(document.querySelector('#player')).display !== 'none',
        screen: { ...window.__screen },
        canvas: (() => {
          const c = document.querySelector('#player canvas');
          if (!c) return null;
          const bytes = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
          let digest = 2166136261;
          for (let i = 0; i < bytes.length; i += 16) digest = Math.imul(digest ^ bytes[i], 16777619) >>> 0;
          return { width: c.width, height: c.height, sampledDigest: digest.toString(16) };
        })(),
      }));
      row.loaded = await snapshot();
      if (row.loaded.playerVisible) {
        await page.locator('#play-button').evaluate(el => el.click());
        await page.waitForTimeout(5000);
        row.playing = await snapshot();
        const progress = await page.locator('#progress-bar-container').boundingBox();
        if (!progress || progress.width === 0) throw new Error('Progress bar has no hit area');
        await page.mouse.move(progress.x + progress.width * 0.6, progress.y + progress.height / 2);
        await page.mouse.down();
        await page.mouse.up();
        await page.waitForTimeout(2000);
        row.afterSeek = await snapshot();
      }
    } catch (error) { row.error = String(error); }
    results.push(row);
    console.log(JSON.stringify(row));
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(output, JSON.stringify({ date: new Date().toISOString(), player: 'https://mediabunny.dev/examples/media-player/ (live deployment, version not verified)', playerAsset, browser: `Google Chrome ${browserVersion}`, results }, null, 2) + '\n');
console.log(`wrote ${output}`);
