// SPDX-License-Identifier: Apache-2.0
/** Internal foundation only. No Player state authority is transferred here yet. */
export type EffectScope = Readonly<{
  owner: string;
  lifetime: number;
  sourceId: number | null;
  sessionId: number | null;
  operationId: number;
}>;
export type EffectLane = 'immediate' | 'scheduled';
/** IDs increase monotonically within one runtime lifetime, including rejected work. */
type EffectIdentity = Readonly<{id:number; scope:EffectScope; lane:EffectLane}>;
export type Effect = EffectIdentity & (
  | Readonly<{kind:'backend.play'|'backend.pause'; resourceId:string}>
  | Readonly<{kind:'resource.release'; resourceId:string}>
  | Readonly<{kind:'timer.wait'; deadlineMs:number}>
);
export type EffectFailure = Readonly<{code:'EFFECT_FAILED'; message:string}>;
export type EffectOutcome = Readonly<{id:number; scope:EffectScope}> & (
  | Readonly<{kind:'completed'}>
  | Readonly<{kind:'failed'; error:EffectFailure}>
  | Readonly<{kind:'retired'}>
);
/** Structural identity checks never inspect live resources or ambient time. */
export function sameEffectScope(a:EffectScope,b:EffectScope):boolean {
  return a.owner===b.owner && a.lifetime===b.lifetime && a.sourceId===b.sourceId &&
    a.sessionId===b.sessionId && a.operationId===b.operationId;
}
/** Resource lifetime excludes operation ID: a session outlives the opening command. */
export function resourceScopeKey(scope:EffectScope):string {
  return JSON.stringify([scope.owner,scope.lifetime,scope.sourceId,scope.sessionId]);
}
