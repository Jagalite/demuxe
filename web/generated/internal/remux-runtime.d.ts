// SPDX-License-Identifier: Apache-2.0
import type { PlayerOptions, RemuxRuntimePolicy } from '../types.js';
import { type RemuxSelection, type RemuxRuntime } from './machine/remux-deployment.js';
export declare function selectRemuxRuntime(options: Pick<PlayerOptions, 'remuxRuntime' | 'experimentalRemuxRuntime' | 'providerPreferences'>, capabilities?: {
    isolated: boolean;
    jspi: boolean;
}): RemuxSelection;
/** Deployment filters runtime implementations, never playback-plan order.
 * Explicit policies remain pinned. Absence preserves the original choice so
 * normal plan rejection can report the missing provider requirement. */
export declare function deployedRemuxRuntime(selection: ReturnType<typeof selectRemuxRuntime>, available: (runtime: 'pthread' | 'jspi' | 'asyncify') => boolean): Readonly<{
    policy: RemuxRuntimePolicy;
    runtime: RemuxRuntime;
    isolated: boolean;
    jspi: boolean;
    providerPreferences?: import("./provider-cost.js").ProviderPreferencesData;
}>;
