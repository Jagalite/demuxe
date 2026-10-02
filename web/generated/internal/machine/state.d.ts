// SPDX-License-Identifier: Apache-2.0
import { type OperationState } from './operations.js';
import { type PlaybackControl } from './playback.js';
import { type PlaybackSettings } from './settings.js';
import { type SourceControl } from './source.js';
/** One authoritative composed state reference per Player. Domain reducers have
 * no stores or scheduling of their own. Additional domains join this boundary. */
export type PlayerControlState = Readonly<{
    revision: number;
    operations: OperationState;
    playback: PlaybackControl;
    settings: Readonly<PlaybackSettings>;
    source: SourceControl;
}>;
export declare function initialPlayerControl(): PlayerControlState;
