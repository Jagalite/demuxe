// SPDX-License-Identifier: Apache-2.0
import { type ProviderPreferencesData } from './provider-runtime.js';
import type { RemuxRuntimePolicy } from '../../types.js';
export type RemuxRuntime = 'pthread' | 'jspi' | 'asyncify';
export type RemuxSelection = Readonly<{
    policy: RemuxRuntimePolicy;
    runtime: RemuxRuntime;
    isolated: boolean;
    jspi: boolean;
    providerPreferences?: ProviderPreferencesData;
}>;
export type RemuxDeployment = Readonly<{
    revision: number;
    selection: RemuxSelection | null;
}>;
export type RemuxDeploymentChange = Readonly<{
    kind: 'configure';
    selection: RemuxSelection;
}> | Readonly<{
    kind: 'resolved';
    revision: number;
    available: Readonly<Partial<Record<RemuxRuntime, boolean>>>;
    providers?: readonly string[];
}>;
export declare function initialRemuxDeployment(selection?: RemuxSelection | null): RemuxDeployment;
/** Explicit policies are pinned and do not invoke deployment probes. */
export declare function remuxDeploymentCandidates(selection: RemuxSelection, providers?: readonly string[]): readonly RemuxRuntime[];
export declare function resolveRemuxDeployment(selection: RemuxSelection, available: Readonly<Partial<Record<RemuxRuntime, boolean>>>, providers?: readonly string[]): RemuxSelection;
export declare function transitionRemuxDeployment(state: RemuxDeployment, change: RemuxDeploymentChange): RemuxDeployment;
