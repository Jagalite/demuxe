// SPDX-License-Identifier: Apache-2.0
import { type CapabilityState, type CapabilityEvent, type TierAttemptState } from './routing.js';
/** Evidence belongs to the Player routing commit. Object-to-ID associations and
 * clock sampling remain in adapters. Monotonic versions reject observations
 * captured before retirement, including a clear followed by a new source. */
export type CapabilityOwner = Readonly<{
    revision: number;
    serial: number;
    identityEpoch: number;
    value: CapabilityState;
}>;
export type TierOwner = Readonly<{
    revision: number;
    serial: number;
    identityEpoch: number;
    value: TierAttemptState;
}>;
export type CapabilityChange = Readonly<{
    kind: 'identity';
}> | Readonly<{
    kind: 'event';
    event: CapabilityEvent;
}>;
export type TierChange = Readonly<{
    kind: 'identity';
}> | Readonly<{
    kind: 'clear';
}> | Readonly<{
    kind: 'failure';
    key: string;
    reason: string;
    now: number;
}> | Readonly<{
    kind: 'read';
    key: string;
    now: number;
}>;
export type RouteEvidence = Readonly<{
    capabilities: CapabilityOwner;
    tiers: TierOwner;
}>;
export declare function initialCapabilityOwner(): CapabilityOwner;
export declare function initialTierOwner(): TierOwner;
export declare function initialRouteEvidence(): RouteEvidence;
export declare function transitionCapabilityOwner(state: CapabilityOwner, change: CapabilityChange, revision: number): CapabilityOwner;
export declare function transitionTierOwner(state: TierOwner, change: TierChange, revision: number): TierOwner;
export declare function clearRouteEvidence(state: RouteEvidence): RouteEvidence;
/** Retiring a command rejects facts currently being captured without discarding
 * previously accepted evidence or the compatibility retry budget. */
export declare function retireRouteEvidence(state: RouteEvidence): RouteEvidence;
