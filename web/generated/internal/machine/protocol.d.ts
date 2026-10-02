// SPDX-License-Identifier: Apache-2.0
/** Scalar authority carried by effects; physical resources remain in the shell. */
export type EffectScope = Readonly<{
    owner: string;
    lifetime: number;
    sourceId: number | null;
    sessionId: number | null;
    operationId: number;
    playId?: number;
}>;
export type EffectLane = 'immediate' | 'scheduled';
/** IDs increase monotonically within one runtime lifetime, including rejected work. */
type EffectIdentity = Readonly<{
    id: number;
    scope: EffectScope;
    lane: EffectLane;
}>;
export type Effect = EffectIdentity & (Readonly<{
    kind: 'backend.play' | 'backend.pause';
    resourceId: string;
}> | Readonly<{
    kind: 'resource.release';
    resourceId: string;
}> | Readonly<{
    kind: 'timer.wait';
    deadlineMs: number;
}>);
export type EffectFailure = Readonly<{
    code: 'EFFECT_FAILED';
    message: string;
}>;
export type EffectOutcome = Readonly<{
    id: number;
    scope: EffectScope;
}> & (Readonly<{
    kind: 'completed';
}> | Readonly<{
    kind: 'failed';
    error: EffectFailure;
}> | Readonly<{
    kind: 'retired';
}>);
/** Structural identity checks never inspect live resources or ambient time. */
export declare function sameEffectScope(a: EffectScope, b: EffectScope): boolean;
/** Resource lifetime excludes operation ID: a session outlives the opening command. */
export declare function resourceScopeKey(scope: EffectScope): string;
export {};
