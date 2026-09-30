import { PlayerError } from './errors.js';
import type { RecipeResolution } from './provider-resolution.js';
/** Existing diagnostics already carry per-plan rejection reasons. Preserve that
 * distinction in the final error instead of feeding "no playback route" through
 * the unsupported-media string classifier. Capability names are context, not
 * a claim that every requirement listed is missing.
 */
export declare function deploymentRejectionError(decisions: readonly {
    id: string;
    code?: string;
    reason?: string;
}[]): PlayerError | undefined;
/** For explicit provider catalogs: never reinterpret pending validation or an
 * acquisition error as absence. Preserve terminal error identity and do not
 * put deployment failures in source compatibility caches.
 */
export declare function providerResolutionError(resolutions: readonly RecipeResolution[]): Error | undefined;
