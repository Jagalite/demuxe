// SPDX-License-Identifier: Apache-2.0
export const initialLegacyPlaybackWorker = () => ({ demuxFormat: '', seekPreroll: 0, decoderOutputWatchdog: true, snapshot: null, gpuPauseIntent: null, sourceRendered: 0, source: 0, opening: false, ready: false, initialized: false, closing: false, pumpFailed: false, force: true, paused: true, busyUntil: 0, pendingTarget: null, restarted: false, position: 0, nextDiagnostics: 0, commandSerial: 0x80000000, commands: [], timerSerial: 0, timer: null });
export function reduceLegacyPlaybackWorker(s, e) {
    if (s.closing)
        return s;
    switch (e.type) {
        case 'format': return { ...s, demuxFormat: e.format, seekPreroll: e.software ? 1 : e.format === 'mpegts' ? 30 : /^(mkv|matroska(?:,|$))/.test(e.format) ? 0.5 : 0 };
        case 'decoder-watchdog': return { ...s, decoderOutputWatchdog: e.enabled };
        case 'gpu-lost': return { ...s, gpuPauseIntent: s.paused };
        case 'gpu-intent': return { ...s, gpuPauseIntent: e.paused };
        case 'gpu-restored': return { ...s, gpuPauseIntent: null };
        case 'frame-presented': return { ...s, sourceRendered: Math.min(6, s.sourceRendered + 1) };
        case 'ready': return s.initialized ? { ...s, ready: true } : s;
        case 'init': return s.initialized ? s : { ...s, initialized: true };
        case 'close': return { ...s, closing: true, opening: false, commands: [], timer: null };
        case 'fail': return { ...s, pumpFailed: true, commands: [], timer: null };
        case 'invalidate': return { ...s, force: true };
        case 'rendered': return { ...s, force: false };
        case 'touch': return { ...s, busyUntil: e.now + 300 };
        case 'pause': return { ...s, paused: e.paused, busyUntil: e.now + 300 };
        case 'seek': return Number.isFinite(e.target) ? { ...s, pendingTarget: e.target, restarted: false, sourceRendered: 0 } : s;
        case 'position': return Number.isFinite(e.position) ? { ...s, position: e.position } : s;
        case 'restart': return { ...s, restarted: true };
        case 'seek-released': return legacySeekComplete(s) ? { ...s, pendingTarget: null, force: true } : s;
        case 'diagnostics': return { ...s, nextDiagnostics: e.now + 200 };
    }
}
export function legacySeekComplete(s) { return !s.closing && s.pendingTarget !== null && s.restarted && Math.abs(s.position - s.pendingTarget) < .15; }
export function legacyPumpDelay(s, now, extraWork = false, activeDelay = 5) { return s.paused && s.pendingTarget === null && !extraWork && now >= s.busyUntil ? 100 : activeDelay; }
export function admitLegacyCommand(s) {
    if (s.closing || s.pumpFailed || s.commands.length >= 128 || s.commandSerial >= 0xffffffff)
        return { state: s, id: null };
    const id = s.commandSerial;
    return { state: { ...s, commandSerial: id + 1, commands: [...s.commands, { id, source: s.source }] }, id };
}
export function finishLegacyCommand(s, id) { return s.commands.some(value => value.id === id) ? { ...s, commands: s.commands.filter(value => value.id !== id) } : s; }
export function armLegacyPump(s) {
    if (s.closing || s.pumpFailed || s.timerSerial >= Number.MAX_SAFE_INTEGER)
        return { state: s, id: null };
    const id = s.timerSerial + 1;
    return { state: { ...s, timerSerial: id, timer: id }, id };
}
export function takeLegacyPump(s, id) { return s.timer === id ? { ...s, timer: null } : s; }
export function admitLegacySource(s) {
    if (!s.ready || s.closing || s.pumpFailed || s.opening || s.source >= 0xffffffff)
        return { state: s, id: null };
    const id = s.source + 1;
    return { state: { ...s, source: id, opening: true, sourceRendered: 0, snapshot: s.snapshot?.capturing ? s.snapshot : null, pendingTarget: null, restarted: false, position: 0 }, id };
}
export function finishLegacySource(s, id) { return !s.closing && s.opening && s.source === id ? { ...s, opening: false } : s; }
export const initialLegacyPCM = () => ({ epoch: -1, forwarded: 0 });
export function planLegacyPCM(s, epoch, ack, written, preserveFinalBatch = false) {
    if (epoch & 1)
        return { state: s, kind: 'wait', count: 0 };
    if (s.epoch !== epoch && preserveFinalBatch && s.epoch >= 0)
        return { state: s, kind: 'wait', count: 0 };
    if (s.epoch !== epoch)
        return { state: { epoch, forwarded: 0 }, kind: 'reset', count: 0 };
    if (ack !== epoch)
        return { state: s, kind: 'wait', count: 0 };
    const count = (written - s.forwarded) >>> 0;
    if (count > 8192)
        throw Error('PCM capacity invariant violated');
    return { state: s, kind: 'copy', count };
}
export function commitLegacyPCM(s, epoch, written) { return s.epoch === epoch ? { ...s, forwarded: written >>> 0 } : s; }
export function legacyCommandCurrent(s, id) { return !s.closing && s.commands.some(command => command.id === id && command.source === s.source); }
export function admitLegacySnapshot(s, id) { return s.ready && !s.closing && !s.pumpFailed && !s.snapshot && Number.isSafeInteger(id) ? { ...s, snapshot: { id, source: s.source, capturing: false }, force: true } : s; }
export function captureLegacySnapshot(s) { return s.snapshot && !s.snapshot.capturing && !s.closing ? { ...s, snapshot: { ...s.snapshot, capturing: true } } : s; }
export function finishLegacySnapshot(s, id, source) { return s.snapshot?.id === id && s.snapshot.source === source ? { state: { ...s, snapshot: null }, publish: !s.closing && !s.pumpFailed && s.source === source } : { state: s, publish: false }; }
