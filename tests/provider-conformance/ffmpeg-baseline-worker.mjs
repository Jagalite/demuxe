// SPDX-License-Identifier: Apache-2.0
import {createBaseline} from './ffmpeg-baseline-browser.mjs';
self.onmessage = async ({data}) => {
  let baseline;
  try {
    if (data.urls.runtime === 'jspi' && typeof WebAssembly.Suspending !== 'function') {
      self.postMessage({error: 'Packaged JSPI baseline unsupported by this browser', blocked: true}); return;
    }
    const response = await fetch(data.fixtureURL); if (!response.ok) throw Error('Baseline fixture HTTP ' + response.status);
    const blob = await response.blob();
    baseline = await createBaseline(data.urls, {timeoutMs: Math.min(data.timeout, 60000), maxInputBytes: data.maxInputBytes, maxOutputBytes: data.maxOutputBytes});
    const result = await baseline.prepareFile(blob, {profile: data.profile, container: data.container, target: 0});
    await baseline.dispose(); baseline = undefined;
    self.postMessage({output: result.output.buffer, stats: result.stats, tracks: result.tracks}, [result.output.buffer]);
  } catch (error) {self.postMessage({error: String(error.stack ?? error)});}
  finally {await baseline?.dispose().catch(() => {});}
};
