// SPDX-License-Identifier: Apache-2.0
import {Player,type PlayerOptions,type ProviderPreferences} from 'demuxe';
import {selectComponentBinding,executeComponentBinding,type ProviderPreferences as ComponentPreferences} from 'demuxe/components';
const preferences = [
  {capability:'audio.decode.ac3',providers:['audio-common','audio-ac3']},
  {capability:'media.prepare.file',providers:['ffmpeg-file-preparation-asyncify']},
] as const satisfies ProviderPreferences;
const componentPreferences:ComponentPreferences=preferences;
const options:PlayerOptions={providerPreferences:preferences};
declare const container:HTMLElement;
new Player(container,options);
declare const resolution:Parameters<typeof selectComponentBinding>[0];
declare const recipe:Parameters<typeof executeComponentBinding>[1];
declare const acquisition:Parameters<typeof executeComponentBinding>[0];
declare const evidence:Parameters<typeof executeComponentBinding>[2];
selectComponentBinding(resolution,'fine',undefined,{recipe,providerPreferences:componentPreferences});
executeComponentBinding(acquisition,recipe,evidence,'scope','fine',async binding=>binding,undefined,preferences);
// @ts-expect-error Capabilities are known contracts, not arbitrary labels.
const invalid:ProviderPreferences=[{capability:'decode-anything',providers:['ffmpeg']}];
void invalid;
