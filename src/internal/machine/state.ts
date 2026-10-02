// SPDX-License-Identifier: Apache-2.0
import {initialOperations,type OperationState} from './operations.js';
import {initialPlayback,type PlaybackControl} from './playback.js';
import {initialSettings,initialPreferences,initialSettingsTransactions,type PlaybackSettings,type PlayerPreferences,type SettingsTransactions} from './settings.js';
import {initialBoundary,type BoundaryState} from './playback-boundary.js';
import {initialSource,type SourceControl} from './source.js';
import {initialAttachments,type AttachmentState} from './attachments.js';
import {initialRouting,type RoutingState} from './route-state.js';
/** One authoritative composed state reference per Player. Domain reducers have
 * no stores or scheduling of their own. Additional domains join this boundary. */
export type PlayerControlState=Readonly<{revision:number;attachments:AttachmentState;routing:RoutingState;boundary:BoundaryState;operations:OperationState;playback:PlaybackControl;settings:Readonly<PlaybackSettings>;preferences:PlayerPreferences;settingsTransactions:SettingsTransactions;source:SourceControl}>;
export function initialPlayerControl():PlayerControlState{return Object.freeze({revision:0,attachments:initialAttachments(),routing:initialRouting(),boundary:initialBoundary(),operations:initialOperations(),playback:initialPlayback(),settings:initialSettings(),preferences:initialPreferences(),settingsTransactions:initialSettingsTransactions(),source:initialSource()});}
