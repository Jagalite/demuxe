// SPDX-License-Identifier: Apache-2.0
import type { PreparationAsset, PreparationComponent, PreparationProgress } from '../../types.js';
export type PreparationName = PreparationComponent | 'font';
export type PreparationEnvironment = Readonly<{
    software: string;
    runtime: 'pthread' | 'jspi' | 'asyncify';
    isolated: boolean;
    providerAssets: boolean;
    privatePlayback: boolean;
}>;
export type PreparationJob = Readonly<{
    name: PreparationName;
    engine: string;
    path: string;
    isolated: boolean;
    providerAssets: boolean;
    limit: number;
    bytes: number;
    started: number;
    deadline: number;
    cancelled: boolean;
    status: 'pending' | 'ready' | 'failed' | 'aborted';
    finished?: number;
    error?: string;
    phase: PreparationProgress['status'];
}>;
export type PreparationState = Readonly<{
    retired: boolean;
    jobs: readonly PreparationJob[];
}>;
export type PreparationAdmission = Readonly<{
    state: PreparationState;
    names: readonly PreparationName[];
    start: readonly PreparationName[];
    aborted: readonly PreparationAsset[] | null;
}>;
export declare function createPreparation(): PreparationState;
export declare function preparationEngine(name: string, environment: PreparationEnvironment): string;
export declare function admitPreparation(state: PreparationState, components: readonly PreparationComponent[], environment: PreparationEnvironment, now: number): PreparationAdmission;
export type PreparationEvent = Readonly<{
    kind: 'phase';
    phase: 'loading' | 'compiling';
} | {
    kind: 'bytes';
    bytes: number;
    declared?: boolean;
} | {
    kind: 'deadline';
    now: number;
}>;
export type PreparationStep = Readonly<{
    state: PreparationState;
    effect: 'ignore' | 'notify' | 'accepted' | 'abort' | 'overflow';
}>;
export declare function stepPreparation(state: PreparationState, name: PreparationName, event: PreparationEvent): PreparationStep;
export declare function completePreparation(state: PreparationState, name: PreparationName, now: number, error?: string): Readonly<{
    state: PreparationState;
    asset: PreparationAsset;
    publish: boolean;
    notify: boolean;
}>;
export declare function preparationAsset(state: PreparationState, name: PreparationName): PreparationAsset;
export declare function retirePreparation(state: PreparationState): PreparationState;
export declare function preparationProgress(state: PreparationState): PreparationProgress[];
