// SPDX-License-Identifier: Apache-2.0
import {TtaReader} from './tta.js';
import {repairArchiveAudio,repairArchiveAudioFragments} from './archive-repair.js';
import type {ArchiveRepairComponents} from './archive-repair.js';
export type TtaRepairComponents=Omit<ArchiveRepairComponents,'container'>&{container?:'tta'};
const input={codec:'tta' as const,open:TtaReader.open};
export function repairTtaAudio(file:Blob,components:TtaRepairComponents,signal:AbortSignal):Promise<Blob>{return repairArchiveAudio(file,components,signal,input);}
export function repairTtaAudioFragments(file:Blob,components:TtaRepairComponents,signal:AbortSignal):AsyncGenerator<Uint8Array>{return repairArchiveAudioFragments(file,components,signal,input);}
