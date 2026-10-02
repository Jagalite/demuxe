// SPDX-License-Identifier: Apache-2.0
import type { FeatureAvailability, FeatureName } from '../../types.js';
export type AdvancedControlsState = Readonly<{
    ownerId: number | null;
    sourceId: number | null;
    nextOwner: number;
    operation: number;
    busy: boolean;
    dirty: readonly string[];
    drafts: Readonly<Record<string, string>>;
    signatures: Readonly<Record<string, string>>;
    labels: Readonly<Record<string, string>>;
}>;
export type AdvancedOwner = Readonly<{
    ownerId: number | null;
    sourceId: number | null;
}>;
export type AdvancedControlsCommand = Readonly<{
    type: 'allocate-owner';
}> | Readonly<{
    type: 'reconcile';
} & AdvancedOwner> | Readonly<{
    type: 'start';
    destroyed: boolean;
    connected: boolean;
    pending: boolean;
} & AdvancedOwner> | Readonly<{
    type: 'settled';
    operation: number;
}> | Readonly<{
    type: 'dirty';
    field: string;
    value: string;
}> | Readonly<{
    type: 'clean';
    fields: readonly string[];
    operation: number;
}> | Readonly<{
    type: 'signature';
    field: string;
    value: string;
}> | Readonly<{
    type: 'labels';
    labels: Readonly<Record<string, string>>;
}>;
export type AdvancedControlsDecision = Readonly<{
    state: AdvancedControlsState;
    accepted?: boolean;
    ownerId?: number;
    operation?: number;
    changed?: boolean;
}>;
export declare function initialAdvancedControls(labels: Readonly<Record<string, string>>): AdvancedControlsState;
export declare function transitionAdvancedControls(state: AdvancedControlsState, command: AdvancedControlsCommand): AdvancedControlsDecision;
export declare function advancedControlsBlocked(state: AdvancedControlsState, facts: Readonly<{
    destroyed: boolean;
    pending: boolean;
    sourceId: number | null;
}>): boolean;
export declare function advancedFeatureDisabled(blocked: boolean, name: FeatureName, capability: FeatureAvailability): boolean;
export declare function advancedShouldSync(state: AdvancedControlsState, field: string, draft: boolean, focused: boolean, force: boolean): boolean;
export declare function advancedControlValue(state: AdvancedControlsState, field: string, observed: string): string;
