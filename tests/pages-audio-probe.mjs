// SPDX-License-Identifier: Apache-2.0
// Temporary hosted-runner probe for Firefox's media-element audio observation.
import {firefox} from 'playwright';
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';

const fixture = 'fixtures/example.mp4';
const size = (await stat(fixture)).size;
const server = createServer((request, response) => {
  if (request.url === '/example.mp4') {
    response.writeHead(200, {'Content-Type': 'video/mp4', 'Content-Length': size});
    createReadStream(fixture).pipe(response);
  } else {
    response.writeHead(200, {'Content-Type': 'text/html'});
    response.end('<button>Play</button><main></main>');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;

try {
  for (const [name, preferences, connectMeter] of [
    ['default', undefined, false],
    ['autoplay-unblocked', {'media.autoplay.default': 0, 'media.autoplay.block-webaudio': false}, false],
    ['meter-connected', {'media.autoplay.default': 0, 'media.autoplay.block-webaudio': false}, true],
  ]) {
    const browser = await firefox.launch({headless: true, ...(preferences ? {firefoxUserPrefs: preferences} : {})});
    try {
      const page = await browser.newPage();
      await page.addInitScript(connect => {
        const originalConnect = AudioNode.prototype.connect;
        const originalCreate = document.createElement;
        const media = new Set();
        const analysers = [];
        window.probe = {count: 0, peakRms: 0, context: null, resume: null, error: null};
        document.createElement = function(tag, ...args) {
          const element = originalCreate.call(this, tag, ...args);
          if (String(tag).toLowerCase() === 'video') media.add(element);
          return element;
        };
        AudioNode.prototype.connect = function(destination, ...args) {
          if (destination instanceof AudioDestinationNode) {
            const analyser = this.context.createAnalyser();
            analyser.fftSize = 2048;
            originalConnect.call(this, analyser);
            if (connect) {
              const silent = this.context.createGain();
              silent.gain.value = 0;
              originalConnect.call(analyser, silent);
              originalConnect.call(silent, this.context.destination);
            }
            analysers.push(analyser);
            window.probe.count = analysers.length;
          }
          return originalConnect.call(this, destination, ...args);
        };
        setInterval(() => {
          for (const element of media) {
            if (!element.isConnected || !element.src || element.dataset.observed) continue;
            element.dataset.observed = 'true';
            try {
              const context = new AudioContext();
              const source = context.createMediaElementSource(element);
              source.connect(context.destination);
              window.probe.context = context;
              void context.resume().then(() => { window.probe.resume = 'resolved'; }, error => { window.probe.resume = String(error); });
            } catch (error) { window.probe.error = String(error); }
          }
          for (const analyser of analysers) {
            const samples = new Float32Array(analyser.fftSize);
            analyser.getFloatTimeDomainData(samples);
            const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
            window.probe.peakRms = Math.max(window.probe.peakRms, rms);
          }
        }, 10);
      }, connectMeter);
      await page.goto(url);
      await page.evaluate(() => {
        document.querySelector('button').onclick = async () => {
          const bytes = await (await fetch('/example.mp4')).blob();
          const video = document.createElement('video');
          video.src = URL.createObjectURL(new File([bytes], 'example.mp4', {type: 'video/mp4'}));
          document.querySelector('main').append(video);
          await video.play();
        };
      });
      await page.locator('button').click();
      await page.waitForTimeout(3500);
      console.log(JSON.stringify({name, browser: browser.version(), ...await page.evaluate(() => ({
        time: document.querySelector('video')?.currentTime,
        readyState: document.querySelector('video')?.readyState,
        peakRms: probe.peakRms,
        analyserCount: probe.count,
        contextState: probe.context?.state,
        resume: probe.resume,
        error: probe.error,
      }))}));
    } finally { await browser.close(); }
  }
} finally { server.close(); }
