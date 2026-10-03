// SPDX-License-Identifier: Apache-2.0
import type { PlayerControlState } from './state.js';
import type { TrackType } from '../../types.js';
export type TrackConfirmationState = Readonly<{
    serial: number;
    pending: Readonly<{
        id: number;
        epoch: number;
        operation: number;
        session: number;
        track: TrackType;
        value: string;
        deadline: number;
        phase: 'waiting' | 'confirmed' | 'failed';
    }> | null;
}>;
export type TrackConfirmationInput = Readonly<{
    type: 'trackConfirmation.begin';
    session: number;
    track: TrackType;
    value: string;
    now: number;
}> | Readonly<{
    type: 'trackConfirmation.sample';
    id: number;
    now: number;
    tracks: readonly Readonly<{
        id: string;
        type: string;
        selected: boolean;
    }>[];
}> | Readonly<{
    type: 'trackConfirmation.timeout';
    id: number;
    now: number;
}> | Readonly<{
    type: 'trackConfirmation.finished';
    id: number;
}>;
export declare function initialTrackConfirmation(): TrackConfirmationState;
export declare function retireTrackConfirmation(state: TrackConfirmationState): TrackConfirmationState;
export declare function trackConfirmationAuthority(state: PlayerControlState, id: number): boolean;
export declare function transitionTrackConfirmation(state: PlayerControlState, input: TrackConfirmationInput): {
    state: Readonly<{
        revision: number;
        trackConfirmation: Readonly<{
            serial: number;
            pending: Readonly<{
                id: number;
                epoch: number;
                operation: number;
                session: number;
                track: TrackType;
                value: string;
                deadline: number;
                phase: "waiting" | "confirmed" | "failed";
            }> | null;
        }>;
        captureRevision: number;
        transport: import("./player-transport.js").PlayerTransportState;
        resources: import("./resource-ledger.js").ResourceLedgerState;
        executor: import("./effect-runtime.js").EffectRuntimeState;
        readiness: import("./player-readiness.js").PlayerReadinessState;
        actions: import("./player-actions.js").PlayerActionState;
        publication: import("./player-publication.js").PlayerPublicationState;
        monitor: import("./player-monitor.js").PlayerMonitorState;
        attachments: import("./attachments.js").AttachmentState;
        routing: import("./route-state.js").RoutingState;
        boundary: import("./playback-boundary.js").BoundaryState;
        operations: import("./operations.js").OperationState;
        playback: import("./playback.js").PlaybackControl;
        settings: Readonly<import("./settings.js").PlaybackSettings>;
        preferences: import("./settings.js").PlayerPreferences;
        settingsTransactions: import("./settings.js").SettingsTransactions;
        source: import("./source.js").SourceControl;
    }>;
    accepted: boolean;
    id: number | undefined;
    retire: readonly number[];
} | {
    state: Readonly<{
        revision: number;
        captureRevision: number;
        transport: import("./player-transport.js").PlayerTransportState;
        trackConfirmation: TrackConfirmationState;
        resources: import("./resource-ledger.js").ResourceLedgerState;
        executor: import("./effect-runtime.js").EffectRuntimeState;
        readiness: import("./player-readiness.js").PlayerReadinessState;
        actions: import("./player-actions.js").PlayerActionState;
        publication: import("./player-publication.js").PlayerPublicationState;
        monitor: import("./player-monitor.js").PlayerMonitorState;
        attachments: import("./attachments.js").AttachmentState;
        routing: import("./route-state.js").RoutingState;
        boundary: import("./playback-boundary.js").BoundaryState;
        operations: import("./operations.js").OperationState;
        playback: import("./playback.js").PlaybackControl;
        settings: Readonly<import("./settings.js").PlaybackSettings>;
        preferences: import("./settings.js").PlayerPreferences;
        settingsTransactions: import("./settings.js").SettingsTransactions;
        source: import("./source.js").SourceControl;
    }>;
    accepted: boolean;
    reason: string;
    retire: readonly number[];
};
