import {nativeRejection, remuxRejection} from '../../../web/generated/internal/selection.js';
import {nativeBrowserCapabilities} from '../../../web/generated/internal/browser-media-capability.js';

const file = () => document.querySelector('#media').files[0];
export async function run(method) {
  const started = performance.now();
  let probe, details = {};
  if (method === 'fast' || method === 'fast-no-cache') {
    const {inspectFile} = await import('./fast-inspector.mjs');
    details = await inspectFile(file(), {headerCache: method !== 'fast-no-cache'}); probe = details.evidence;
  } else if (method === 'cascade') {
    const {inspectFile} = await import('./fast-inspector.mjs');
    const fast = await inspectFile(file());
    if (fast.status === 'qualified') {details = {...fast, path: 'fast'}; probe = fast.evidence;}
    else {
      const {probeSource} = await import('./source-probe-instrumented.mjs');
      probe = await probeSource({file: file()}, new AbortController().signal);
      details = {path: 'ffmpeg-fallback', fast};
    }
  } else if (method === 'mediabunny') {
    const {inspectFile} = await import('./mediabunny-baseline.mjs');
    details = await inspectFile(file()); probe = details.probe;
  } else if (method === 'cheap') {
    const {cheapMP4Probe} = await import('../../../web/cheap-mp4-probe.js');
    details = await cheapMP4Probe(file(), new AbortController().signal, document.createElement('video'));
    probe = details.probe;
  } else {
    const {probeSource} = await import('./source-probe-instrumented.mjs');
    probe = await probeSource({file: file()}, new AbortController().signal);
  }
  const result = {method, wallMs: performance.now() - started, probe, details};
  if (probe) {
    const settings = {aid: 'auto', sid: 'auto', subtitles: true};
    const element = document.createElement('video');
    const capabilities = nativeBrowserCapabilities(probe, 'auto', {
      canPlayType: mime => element.canPlayType(mime),
      isTypeSupported: typeof MediaSource === 'undefined' ? undefined : mime => MediaSource.isTypeSupported(mime),
    });
    result.routeInputs = {nativeRejection: nativeRejection(probe, settings),
      remuxRejection: remuxRejection(probe, settings),
      direct: capabilities.direct, remux: capabilities.remux,
      hybridRejection: probe.hybridRejection};
  }
  result.resources = performance.getEntriesByType('resource').map(x => ({name: new URL(x.name).pathname,
    transferSize: x.transferSize, decodedBodySize: x.decodedBodySize, duration: x.duration}));
  return result;
}
globalThis.benchInspector = run;
globalThis.planFromProbe = async probe => {
  if (!probe) return null;
  const {Player} = await import('../../../web/generated/index.js');
  const holder = document.createElement('div'); document.body.append(holder);
  const player = new Player(holder, {assetBase: '/'});
  const source = {kind: 'local', file: file(), input: {}};
  player.sourceInspection = {source, probe, settings: {aid: 'auto', sid: 'auto', subtitles: true}};
  const reason = nativeRejection(probe, player.settings);
  const decisions = player.admissible(source, player.settings, [], [], reason, true);
  const selected = decisions.find(x => x.eligible);
  player.destroy(); holder.remove();
  return {firstEligible: selected?.id ?? null,
    decisions: decisions.map(x => ({id: x.id, eligible: x.eligible, code: x.code, reason: x.reason,
      browser: x.browserCapability?.status}))};
};
globalThis.playExistingRoute = async () => {
  const {Player} = await import('../../../web/generated/index.js');
  const holder = document.createElement('div'); document.body.append(holder);
  const admissionTimes = [];
  const original = Player.prototype.admissible;
  Player.prototype.admissible = function (...args) {
    const plans = original.apply(this, args);
    admissionTimes.push({ms: performance.now() - t0, firstEligible: plans.find(x => x.eligible)?.id ?? null});
    return plans;
  };
  let t0 = performance.now(), firstPresentedMs = null, videoSeen = false;
  const watch = () => {
    const video = holder.querySelector('video'); if (!video || videoSeen) return;
    videoSeen = true;
    video.requestVideoFrameCallback?.(() => {firstPresentedMs ??= performance.now() - t0;});
  };
  const observer = new MutationObserver(watch); observer.observe(holder, {childList: true, subtree: true});
  const player = new Player(holder, {assetBase: '/'});
  let openMs = null, playMs = null, error = null, selected = null, attempts = null;
  try {
    await player.open(file()); openMs = performance.now() - t0; watch();
    selected = player.diagnostics.plan?.id ?? null;
    attempts = player.diagnostics.selection?.attempts;
    await player.play(); playMs = performance.now() - t0;
    const deadline = performance.now() + 5000;
    while (firstPresentedMs === null && performance.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
  } catch (e) {error = String(e?.stack ?? e);}
  finally {observer.disconnect(); Player.prototype.admissible = original; player.destroy(); holder.remove();}
  return {openMs, playMs, firstPresentedMs, admissionTimes, selected, attempts, error};
};
globalThis.openExistingRoute = async () => {
  const {Player} = await import('../../../web/generated/index.js');
  const holder = document.createElement('div'); document.body.append(holder);
  const player = new Player(holder, {assetBase: '/'});
  const start = performance.now(); let result;
  try {
    await player.open(file());
    result = {openMs: performance.now() - start, selected: player.diagnostics.plan?.id ?? null,
      attempts: player.diagnostics.selection?.attempts};
  } catch (error) {result = {openMs: performance.now() - start, error: String(error?.stack ?? error),
    attempts: player.diagnostics.selection?.attempts};}
  finally {player.destroy(); holder.remove();}
  return result;
};
