// SPDX-License-Identifier: Apache-2.0
import {initialOperations,type OperationState} from './operations.js';
import {initialPlayback,type PlaybackControl} from './playback.js';
import {initialSettings,type PlaybackSettings} from './settings.js';
import {initialSource,type SourceControl} from './source.js';
/** One authoritative composed state reference per Player. Domain reducers have
 * no stores or scheduling of their own. Additional domains join this boundary. */
export type PlayerControlState=Readonly<{revision:number;operations:OperationState;playback:PlaybackControl;settings:Readonly<PlaybackSettings>;source:SourceControl}>;
export function initialPlayerControl():PlayerControlState{return Object.freeze({revision:0,operations:initialOperations(),playback:initialPlayback(),settings:initialSettings(),source:initialSource()});}
