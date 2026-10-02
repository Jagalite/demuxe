// SPDX-License-Identifier: Apache-2.0
import { type OperationState } from './operations.js';
import { type PlaybackControl } from './playback.js';
import { type PlaybackSettings, type PlayerPreferences, type SettingsTransactions } from './settings.js';
import { type BoundaryState } from './playback-boundary.js';
import { type SourceControl } from './source.js';
import { type AttachmentState } from './attachments.js';
/** One authoritative composed state reference per Player. Domain reducers have
 * no stores or scheduling of their own. Additional domains join this boundary. */
export type PlayerControlState = Readonly<{
    revision: number;
    attachments: AttachmentState;
    boundary: BoundaryState;
    operations: OperationState;
    playback: PlaybackControl;
    settings: Readonly<PlaybackSettings>;
    preferences: PlayerPreferences;
    settingsTransactions: SettingsTransactions;
    source: SourceControl;
}>;
export declare function initialPlayerControl(): PlayerControlState;
