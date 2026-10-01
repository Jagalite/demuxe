// SPDX-License-Identifier: Apache-2.0
import {TakReader} from './tak.js';
import {ContainerProfileError} from './matroska.js';
import type {MatroskaTrack} from './matroska.js';
import {repairArchiveAudio,repairArchiveAudioFragments} from './archive-repair.js';
import type {ArchiveRepairComponents} from './archive-repair.js';
export type TakRepairComponents=Omit<ArchiveRepairComponents,'container'|'output'>&{container?:'tak';output?:'flac'};
const input={codec:'tak' as const,open:TakReader.open,admit(track:MatroskaTrack){
 if(track.rate!==44100||track.channels!==1||track.bitDepth!==16||track.privateData.length!==10)throw new ContainerProfileError('Unqualified standalone TAK conversion profile');
}};
function outputGuard(components:TakRepairComponents){if(components.output!==undefined&&components.output!=='flac')throw new ContainerProfileError('Standalone TAK conversion requires FLAC output');}
export async function repairTakAudio(file:Blob,components:TakRepairComponents,signal:AbortSignal):Promise<Blob>{signal.throwIfAborted();outputGuard(components);return repairArchiveAudio(file,components,signal,input);}
export async function* repairTakAudioFragments(file:Blob,components:TakRepairComponents,signal:AbortSignal):AsyncGenerator<Uint8Array>{signal.throwIfAborted();outputGuard(components);yield* repairArchiveAudioFragments(file,components,signal,input);}
