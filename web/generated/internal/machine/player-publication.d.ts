// SPDX-License-Identifier: Apache-2.0
import type { PlayerState, SessionError } from '../../types.js';
import { type PlayerProjection, type PlayerProjectionInput } from './selectors.js';
import { type PlaybackStatisticsState } from './telemetry.js';
import type { PlayerControlState } from './state.js';
import type { PlayerControlDecision } from './transition.js';
export type PlayerPublicationState = Readonly<{
    serial: number;
    queueSerial: number;
    queued: number | null;
    snapshot: PlayerState | null;
    prepared: Readonly<{
        id: number;
        captureRevision: number;
        projection: PlayerProjection;
    }> | null;
    statistics: PlaybackStatisticsState;
    error: SessionError | null;
    operationStart: Readonly<{
        id: number;
        epoch: number;
        now: number;
        seekRecorded: boolean;
    }> | null;
}>;
export declare function initialPlayerPublication(): PlayerPublicationState;
export type PlayerPublicationInput = Readonly<{
    type: 'publication.schedule';
}> | Readonly<{
    type: 'publication.scheduled';
    id: number;
}> | Readonly<{
    type: 'publication.begin';
}> | Readonly<{
    type: 'publication.prepare';
    id: number;
    captureRevision: number;
    input: PlayerProjectionInput;
}> | Readonly<{
    type: 'publication.commit';
    id: number;
    captureRevision: number;
    timestamps: readonly number[];
}> | Readonly<{
    type: 'publication.error';
    epoch: number;
    session: number | null;
    error: SessionError | null;
}> | Readonly<{
    type: 'publication.operation-start';
    id: number;
    epoch: number;
    now: number;
}> | Readonly<{
    type: 'publication.seek';
    id: number;
    epoch: number;
    now: number;
}>;
export declare function retirePlayerPublication(state: PlayerPublicationState): PlayerPublicationState;
export declare function clearPlayerPublication(state: PlayerPublicationState): PlayerPublicationState;
export declare function acceptPlayerPublication(state: PlayerPublicationState, sourceId: number, preserve: boolean, timing?: Readonly<{
    elapsed: number;
    timestamps: readonly number[];
}>): PlayerPublicationState;
export declare function transitionPlayerPublication(state: PlayerControlState, input: PlayerPublicationInput): PlayerControlDecision;
