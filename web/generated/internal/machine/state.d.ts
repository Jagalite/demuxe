// SPDX-License-Identifier: Apache-2.0
import { type ResourceLedgerState } from './resource-ledger.js';
import { type PlayerReadinessState } from './player-readiness.js';
import { type PlayerActionState } from './player-actions.js';
import { type PlayerPublicationState } from './player-publication.js';
import { type PlayerMonitorState } from './player-monitor.js';
import { type OperationState } from './operations.js';
import { type PlaybackControl } from './playback.js';
import { type PlaybackSettings, type PlayerPreferences, type SettingsTransactions } from './settings.js';
import { type BoundaryState } from './playback-boundary.js';
import { type SourceControl } from './source.js';
import { type AttachmentState } from './attachments.js';
import { type RoutingState } from './route-state.js';
/** One authoritative composed state reference per Player. Domain reducers have
 * no stores or scheduling of their own. Additional domains join this boundary. */
export type PlayerControlState = Readonly<{
    revision: number;
    captureRevision: number;
    resources: ResourceLedgerState;
    readiness: PlayerReadinessState;
    actions: PlayerActionState;
    publication: PlayerPublicationState;
    monitor: PlayerMonitorState;
    attachments: AttachmentState;
    routing: RoutingState;
    boundary: BoundaryState;
    operations: OperationState;
    playback: PlaybackControl;
    settings: Readonly<PlaybackSettings>;
    preferences: PlayerPreferences;
    settingsTransactions: SettingsTransactions;
    source: SourceControl;
}>;
export declare function initialPlayerControl(): PlayerControlState;
