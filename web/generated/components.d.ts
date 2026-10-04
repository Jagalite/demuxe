// SPDX-License-Identifier: Apache-2.0
/** Explicit component composition API. Offers never grant qualification. */
export { audioRepairRecipe, g726RawRepairRecipe, packetCopyRecipe, webmPacketCopyRecipe } from './internal/component-recipes.js';
export type { ComponentAudioCodec, G726RawCodec, G726RawBits } from './internal/component-recipes.js';
export { parseProviderDeployment } from './internal/provider-catalog.js';
export type { ParsedProviderDeployment } from './internal/provider-catalog.js';
export { ProviderAcquisition } from './internal/provider-acquisition.js';
export { executeComponentBinding, selectComponentBinding } from './internal/component-selection.js';
export type { CompositionEvidence } from './internal/provider-resolution.js';
export type { ProviderPreferences } from './types.js';
