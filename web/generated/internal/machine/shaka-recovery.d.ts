// SPDX-License-Identifier: Apache-2.0
import type { NetworkRecoveryState } from '../../types.js';
/** Logical requests outlive individual fetch attempts and their backoff timers. */
export type ShakaRecoveryState = Readonly<{
    active: boolean;
    serial: number;
    requests: readonly number[];
    retrying: readonly number[];
}>;
export type ShakaRecoveryCommand = Readonly<{
    type: 'begin';
}> | Readonly<{
    type: 'retire';
}> | Readonly<{
    type: 'retry' | 'settle';
    id: number;
}>;
export declare function initialShakaRecovery(): ShakaRecoveryState;
export declare function transitionShakaRecovery(state: ShakaRecoveryState, command: ShakaRecoveryCommand): ShakaRecoveryState;
export declare function shakaRecoverySnapshot(state: ShakaRecoveryState): NetworkRecoveryState;
