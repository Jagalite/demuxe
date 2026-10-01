// SPDX-License-Identifier: Apache-2.0
import {WavPackReader} from './wavpack.js';
import {repairArchiveAudio,repairArchiveAudioFragments} from './archive-repair.js';
import type {ArchiveRepairComponents} from './archive-repair.js';
export type WavPackRepairComponents=Omit<ArchiveRepairComponents,'container'>&{container?:'wavpack'};
const input={codec:'wavpack' as const,open:WavPackReader.open};
export function repairWavPackAudio(file:Blob,components:WavPackRepairComponents,signal:AbortSignal):Promise<Blob>{return repairArchiveAudio(file,components,signal,input);}
export function repairWavPackAudioFragments(file:Blob,components:WavPackRepairComponents,signal:AbortSignal):AsyncGenerator<Uint8Array>{return repairArchiveAudioFragments(file,components,signal,input);}
