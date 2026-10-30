// SPDX-License-Identifier: Apache-2.0
// Characterize two decoded source frames; this does not qualify a provider.
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {firefox} from 'playwright';
const [fixturePath, receiptPath] = process.argv.slice(2);
if (!fixturePath || !receiptPath) throw Error('Pass fixture and receipt paths');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fixture = await readFile(fixturePath), browser = await firefox.launch({headless: true});
try {
  const page = await browser.newPage(); await page.goto('about:blank');
  const frames = await page.evaluate(async bytes => {
    const video = document.createElement('video'); video.muted = true; const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], {type: 'video/webm'})); video.src = url; document.body.append(video);
    try {
      await new Promise((resolve, reject) => {video.onloadeddata = resolve; video.onerror = () => reject(Error('load failed'));});
      const frames = [];
      for (const target of [.2, 1.3]) {
        video.currentTime = target; await new Promise(resolve => {video.onseeked = resolve;});
        const fresh = new Promise((resolve, reject) => {const timer = setTimeout(() => reject(Error('frame timeout')), 5000); video.requestVideoFrameCallback((_now, frame) => {clearTimeout(timer); resolve(frame.mediaTime);});});
        await video.play(); const frameTime = await fresh; video.pause();
        const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 48; const context = canvas.getContext('2d'); context.drawImage(video, 0, 0, 64, 48);
        frames.push({target, frameTime, rgba: Array.from(context.getImageData(0, 0, 64, 48).data)});
      }
      return frames;
    } finally {video.removeAttribute('src'); video.load(); video.remove(); URL.revokeObjectURL(url);}
  }, Array.from(fixture));
  const summaries = frames.map(frame => {const pixels = new Set(); for (let i = 0; i < frame.rgba.length; i += 4) pixels.add(frame.rgba.slice(i, i + 4).join(',')); return {target: frame.target, frameTime: frame.frameTime, rgbaSHA256: sha(Uint8Array.from(frame.rgba)), distinctColors: pixels.size};});
  if (summaries.some(frame => Math.abs(frame.target - frame.frameTime) > .001 || frame.distinctColors < 4) || summaries[0].rgbaSHA256 === summaries[1].rgbaSHA256) throw Error('Fixture did not expose diverse changing frames');
  await writeFile(receiptPath, JSON.stringify({status: 'fixture-characterization-not-qualification', browser: browser.version(), fixtureSHA256: sha(fixture), harnessSHA256: sha(await readFile(fileURLToPath(import.meta.url))), frames: summaries, limitations: ['Two frames in one Firefox version; hashes are decoded output observations, not universal fixture truth.']}, null, 2) + '\n');
} finally {await browser.close();}
