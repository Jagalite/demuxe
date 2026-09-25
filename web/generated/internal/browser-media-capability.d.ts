// SPDX-License-Identifier: Apache-2.0
import type { Probe } from './selection.js';
export type BrowserMediaCapability = {
    status: 'supported' | 'unsupported' | 'unknown';
    api: 'canPlayType' | 'isTypeSupported';
    tracks: Array<{
        index: number;
        type: string;
        codec: string;
        codecString?: string;
        serializationComplete: boolean;
    }>;
    queries: Array<{
        mime: string;
        result: string | boolean;
        adapter: string;
        negativeDecisive: boolean;
        reason?: string;
    }>;
    decodingInfo?: import('./media-capabilities.js').DecodingEvidence;
    unqueriedAudio?: boolean;
    reason?: string;
};
type BrowserQueries = {
    canPlayType: (mime: string) => string;
    isTypeSupported?: (mime: string) => boolean;
};
/** Query the browser for the actual selected streams and the destination of each
 * Native plan before allocating a playback backend. Unknowns remain explicit and
 * must be resolved by preparation/startup; a negative answer excludes the plan. */
export declare function nativeBrowserCapabilities(probe: Probe, aid: string, browser: BrowserQueries): {
    direct: BrowserMediaCapability;
    remux: BrowserMediaCapability;
    flac: BrowserMediaCapability;
    opus: BrowserMediaCapability;
};
export {};
