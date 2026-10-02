// SPDX-License-Identifier: Apache-2.0
import type { PlayerProjectionInput } from '../machine/selectors.js';
export type PlayerProjectionSource = Omit<PlayerProjectionInput, 'observation' | 'media'> & Readonly<{
    properties: ReadonlyMap<string, unknown>;
    surface?: HTMLCanvasElement | HTMLVideoElement;
}>;
/** Explicit shell reads. The caller supplies one accepted-session tuple and an
 * already merged/policy-filtered track inventory; this adapter does not read
 * Player fields, acquire resources or decide which observation is current. */
export declare function capturePlayerObservation(source: PlayerProjectionSource): PlayerProjectionInput;
