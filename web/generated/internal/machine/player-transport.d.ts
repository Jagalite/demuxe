// SPDX-License-Identifier: Apache-2.0
import type { PlayerControlState } from './state.js';
import type { PlayerControlDecision } from './transition.js';
import { type RouteRequirements } from './route-recovery.js';
type Phase = 'verifying' | 'seeking' | 'selecting' | 'restoring' | 'retrying' | 'resuming' | 'finished';
type Work = Readonly<{
    id: number;
    epoch: number;
    operation: number;
    session: number;
    kind: 'play' | 'seek';
    phase: Phase;
    intent: number;
    target: number;
    previous: number;
    wasPaused: boolean;
    held: boolean;
    trialSame: boolean;
    trialVerified: boolean;
    bounded: boolean;
    local: boolean;
    inconclusive: boolean;
    backendPlan: string | undefined;
    nativeRemux: 'auto' | 'never' | 'always';
}>;
export type PlayerTransportState = Readonly<{
    serial: number;
    pending: Work | null;
}>;
export type TransportEffect = Readonly<{
    kind: 'verify' | 'hold-seek' | 'seek' | 'fallback' | 'restore' | 'resume' | 'pause' | 'reject' | 'ignore';
    target?: number;
    budget?: number;
    start?: number;
    requirements?: RouteRequirements;
}>;
export type PlayerTransportInput = Readonly<{
    type: 'transport.play.begin';
    intent: number;
    position: number;
    trialSame: boolean;
    trialVerified: boolean;
    firefox?: boolean;
    local: boolean;
    backendPlan: string | undefined;
    nativeRemux: 'auto' | 'never' | 'always';
    fallbackAvailable: boolean;
}> | Readonly<{
    type: 'transport.seek.begin';
    intent: number;
    target: number;
    previous: number;
    sourceId?: number | null;
    seekable: readonly Readonly<{
        start: number;
        end: number;
    }>[] | null;
}> | Readonly<{
    type: 'transport.play.failed';
    id: number;
    compatible: boolean;
    inconclusive: boolean;
    streaming: boolean;
}> | Readonly<{
    type: 'transport.play.fallback-failed';
    id: number;
    compatible: boolean;
    code: string;
}> | Readonly<{
    type: 'transport.play.restored';
    id: number;
}> | Readonly<{
    type: 'transport.seek.failed';
    id: number;
    boundary: boolean;
    terminal: boolean;
    code: string;
    invalidPosition: boolean;
    streaming: boolean;
}> | Readonly<{
    type: 'transport.seek.restore-failed';
    id: number;
    terminal?: boolean;
    code?: string;
}> | Readonly<{
    type: 'transport.seek.verified' | 'transport.seek.restored' | 'transport.seek.resumed' | 'transport.complete' | 'transport.finished';
    id: number;
}>;
export declare function initialPlayerTransport(): PlayerTransportState;
export declare function retirePlayerTransport(state: PlayerTransportState): PlayerTransportState;
/** A queued Pause supersedes compensating resume without changing FIFO settings. */
export declare function pausePlayerTransport(state: PlayerTransportState): PlayerTransportState;
export declare function playerTransportAuthority(state: PlayerControlState, id: number): boolean;
export declare function transitionPlayerTransport(state: PlayerControlState, input: PlayerTransportInput): PlayerControlDecision;
export {};
