// SPDX-License-Identifier: Apache-2.0
export const manifestURL = new URL('./provider-manifest.json', new URL('../', import.meta.url));
export {createComponentOwners} from '../runtime/web/providers/components/provider-container/src/owners.js';
export {repairMatroskaAudio,repairMatroskaAudioFragments} from '../runtime/web/providers/components/provider-container/src/audio-repair.js';
export {PacketAudioDecoder} from '../runtime/web/providers/components/provider-audio/src/packet-decoder.js';
export {PacketFlacEncoder} from '../runtime/web/providers/components/provider-audio/src/flac-encoder.js';
