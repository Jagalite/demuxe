// SPDX-License-Identifier: Apache-2.0
export function initialSelectiveWorklet() { return Object.freeze({ phase: 'active', generation: -1, epoch: -1 }); }
export function retireSelectiveWorklet(state, failed = false) { return state.phase !== 'active' ? state : Object.freeze({ ...state, phase: failed ? 'failed' : 'closed' }); }
// Called only at identity boundaries, never allocating for stable audio quanta.
export function observeSelectiveWorklet(state, generation, epoch) {
    if (state.phase !== 'active')
        return state;
    if (generation !== state.generation)
        return Object.freeze({ ...state, generation });
    return epoch !== state.epoch ? Object.freeze({ ...state, epoch }) : state;
}
export function selectiveWorkletCurrent(state, generation, epoch) { return state.phase === 'active' && state.generation === generation && state.epoch === epoch; }
// Cadence positions, PCM cursors and per-frame rate-scan positions are DSP progress.
export function selectiveTimelineDue(frame, next) { return frame >= next; }
export function selectiveNextTimeline(frame) { return frame + 1024; }
export function selectivePulseDue(frame, last, rate) { return frame - last > rate * 0.5; }
export function selectiveWorkletFrames(read, write, quantum, capacity) { return Math.min((write - read) >>> 0, quantum, capacity); }
export function selectiveWorkletCanConsume(gate, running, outputChannels, epoch, permittedEpoch) { return !!gate && !!running && outputChannels > 0 && epoch === permittedEpoch; }
// Unsigned header cursors may wrap; scanning is bounded by the physical ring.
export function selectiveWorkletScanFrames(read, write, capacity) { return Math.min((write - read) >>> 0, capacity); }
export function selectiveWorkletScanOffset(read, scanned, available) { const offset = (scanned - read) >>> 0; return offset <= available ? offset : 0; }
export function selectiveWorkletLayoutSupported(channels) { return channels === 2 || channels === 6 || channels === 8; }
