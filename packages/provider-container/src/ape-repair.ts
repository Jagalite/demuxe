// SPDX-License-Identifier: Apache-2.0
import {ApeReader} from './ape.js';
import {ContainerProfileError} from './matroska.js';
import type {MatroskaTrack} from './matroska.js';
import {repairArchiveAudio,repairArchiveAudioFragments} from './archive-repair.js';
import type {ArchiveRepairComponents} from './archive-repair.js';
export type ApeRepairComponents=Omit<ArchiveRepairComponents,'container'|'output'>&{container?:'ape';output?:'flac'};
const input={codec:'ape' as const,open:ApeReader.open,admit(track:MatroskaTrack){
 const extra=track.privateData;
 if(track.rate!==44100||track.channels!==2||track.bitDepth!==16||extra.length!==6||new DataView(extra.buffer,extra.byteOffset,extra.byteLength).getUint16(0,true)!==3990||new DataView(extra.buffer,extra.byteOffset,extra.byteLength).getUint16(2,true)!==2000)throw new ContainerProfileError('Unqualified standalone APE conversion profile');
}};
function outputGuard(components:ApeRepairComponents){if(components.output!==undefined&&components.output!=='flac')throw new ContainerProfileError('Standalone APE conversion requires FLAC output');}
export async function repairApeAudio(file:Blob,components:ApeRepairComponents,signal:AbortSignal):Promise<Blob>{signal.throwIfAborted();outputGuard(components);return repairArchiveAudio(file,components,signal,input);}
export async function* repairApeAudioFragments(file:Blob,components:ApeRepairComponents,signal:AbortSignal):AsyncGenerator<Uint8Array>{signal.throwIfAborted();outputGuard(components);yield* repairArchiveAudioFragments(file,components,signal,input);}
