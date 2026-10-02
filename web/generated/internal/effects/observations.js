// SPDX-License-Identifier: Apache-2.0
import { ranges, cachedRanges } from '../state.js';
import { copyData } from '../machine/data.js';
import { captureMediaObservation } from './media-observations.js';
/** Explicit shell reads. The caller supplies one accepted-session tuple and an
 * already merged/policy-filtered track inventory; this adapter does not read
 * Player fields, acquire resources or decide which observation is current. */
export function capturePlayerObservation(source) {
    const { properties: p, surface, ...values } = source, controls = copyData(values);
    const hasSession = controls.sourceId !== null, d = p.get('duration'), rawLive = p.get('native-live');
    const nativeLive = typeof rawLive === 'boolean' ? rawLive : null, live = nativeLive ?? controls.requestedLive;
    const cache = p.get('demuxer-cache-state'), seekable = p.get('seekable');
    const observation = {
        time: Number(p.get('time-pos')) || 0, duration: typeof d === 'number' && Number.isFinite(d) && d >= 0 ? d : null, nativeLive,
        eof: p.get('eof-reached') === true, paused: p.get('pause') === true, pausedForCache: p.get('paused-for-cache') === true, nativeWaiting: p.get('native-waiting') === true,
        seekable: typeof seekable === 'boolean' ? seekable : null,
        nativeSeekable: hasSession && controls.mode === 'native' ? ranges(p.get('native-seekable')) : null,
        nativeBuffered: hasSession && controls.mode === 'native' ? ranges(p.get('native-buffered')) : null,
        cacheSeekable: hasSession && controls.mode !== 'native' && live ? ranges(cache?.['seekable-ranges']) : null,
        cached: hasSession && controls.mode !== 'native' ? cachedRanges(cache?.['seekable-ranges']) : null,
    };
    return copyData({ ...controls, observation, media: captureMediaObservation(p, controls.mode, surface) });
}
