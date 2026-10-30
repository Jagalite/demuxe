// SPDX-License-Identifier: Apache-2.0
// Diagnostic only: compare original and source-prepared WebM in the same browser.
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as runtime from 'mediabunny';
import {firefox} from 'playwright';
import {createWebMVideoPreparer} from '../file-preparation.js';

const [fixturePath, receiptPath] = process.argv.slice(2);
if (!fixturePath || !receiptPath) throw Error('Pass fixture and receipt paths');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const original = await readFile(fixturePath);
const result = await createWebMVideoPreparer({load: async () => runtime})(new Blob([original]), {
  sourceTracks: [{id: 'fixture-video', type: 'video', codec: 'vp8'}],
});
if (!result?.file) throw Error('Source preparer declined the fixture');
const prepared = new Uint8Array(await result.file.arrayBuffer());
const browser = await firefox.launch({headless: true});
try {
  const page = await browser.newPage();
  await page.goto('about:blank');
  const samples = await page.evaluate(async inputs => {
    const results = [];
    for (const [name, bytes] of inputs) {
      const video = document.createElement('video');
      video.muted = true;
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], {type: 'video/webm'}));
      video.src = url; document.body.append(video);
      try {
        await new Promise((resolve, reject) => {video.onloadeddata = resolve; video.onerror = () => reject(Error('load failed'));});
        for (const target of [.25, 1.25, 2.25]) {
          video.currentTime = target;
          await new Promise((resolve, reject) => {video.onseeked = resolve; video.onerror = () => reject(Error('seek failed'));});
          const fresh = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(Error('fresh frame timeout')), 5000);
            const observe = (_now, frame) => {
              if (frame.mediaTime >= target) {clearTimeout(timeout); resolve(frame.mediaTime);}
              else video.requestVideoFrameCallback(observe);
            };
            video.requestVideoFrameCallback(observe);
          });
          await video.play();
          const frameTime = await fresh; video.pause();
          const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 48;
          const context = canvas.getContext('2d'); context.drawImage(video, 0, 0, 64, 48);
          results.push({name, target, actualTime: video.currentTime, frameTime, rgba: Array.from(context.getImageData(32, 24, 1, 1).data)});
        }
      } finally {video.removeAttribute('src'); video.load(); video.remove(); URL.revokeObjectURL(url);}
    }
    return results;
  }, [['original', Array.from(original)], ['prepared', Array.from(prepared)]]);
  const receipt = {status: 'diagnostic-not-qualification', browser: browser.version(), fixture: {bytes: original.length, sha256: hash(original)}, prepared: {bytes: prepared.length, sha256: hash(prepared)}, harnessSHA256: hash(await readFile(fileURLToPath(import.meta.url))), samples, limitations: ['Source-level preparer, not the deployed worker or public Player.', 'Canvas center pixels at three seek times do not establish full-frame or packet equivalence.', 'The failed public Player color assertion remains a failure.']};
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt));
} finally {await browser.close();}
