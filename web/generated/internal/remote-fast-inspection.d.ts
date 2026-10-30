// SPDX-License-Identifier: Apache-2.0
import type { RemotePreparationSource } from './preparation-source.js';
import type { Probe } from './selection.js';
type Result = {
    status: string;
    evidence?: Probe;
    available?: string[];
    bytesRead: number;
    reason?: string;
};
/** Feed the maintained complete metadata inspector through Demuxe transport.
 * This does not promote partial optional-provider A/V enumeration to absence. */
export declare function inspectRemoteFastSource(source: RemotePreparationSource, base: URL, signal: AbortSignal, onProgress?: (value: {
    phase: string;
}) => void): Promise<Result>;
export {};
