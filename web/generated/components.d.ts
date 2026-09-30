/** Explicit component composition API. Offers never grant qualification. */
export { audioRepairRecipe, packetCopyRecipe } from './internal/component-recipes.js';
export type { ComponentAudioCodec } from './internal/component-recipes.js';
export { parseProviderDeployment } from './internal/provider-catalog.js';
export type { ParsedProviderDeployment } from './internal/provider-catalog.js';
export { ProviderAcquisition } from './internal/provider-acquisition.js';
export { executeComponentBinding, selectComponentBinding } from './internal/component-selection.js';
export type { CompositionEvidence } from './internal/provider-resolution.js';
