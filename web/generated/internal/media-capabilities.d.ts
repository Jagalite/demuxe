// SPDX-License-Identifier: Apache-2.0
import type { Probe } from './selection.js';
import type { BrowserMediaCapability } from './browser-media-capability.js';
export type DecodingQuery = {
    track: number;
    configuration: MediaDecodingConfiguration;
    container?: string;
    status: 'answered' | 'unavailable' | 'timeout' | 'error';
    supported?: boolean;
    smooth?: boolean;
    powerEfficient?: boolean;
    reason?: string;
    late?: boolean;
};
export type DecodingEvidence = {
    api: 'decodingInfo';
    queries: DecodingQuery[];
    unqueriedTracks: number[];
    scope: 'advisory';
    reason?: string;
};
type Decode = (configuration: MediaDecodingConfiguration) => Promise<Pick<MediaCapabilitiesInfo, 'supported' | 'smooth' | 'powerEfficient'>>;
/** Per-player, bounded cache of exact API inputs. No source outcomes are cached.
 * Predictions never prove output, change fidelity, or veto a working file route. */
export declare class MediaCapabilityQueries {
    private decode?;
    private timeoutMs;
    private onLateAnswer?;
    private cache;
    private tokens;
    private lateAnswers;
    private evidence;
    private key;
    cached(capability: BrowserMediaCapability, probe: Probe): DecodingEvidence | undefined;
    constructor(decode?: Decode | undefined, timeoutMs?: number, onLateAnswer?: (() => void) | undefined);
    inspect(capability: BrowserMediaCapability, probe: Probe): Promise<DecodingEvidence>;
    private query;
}
export {};
