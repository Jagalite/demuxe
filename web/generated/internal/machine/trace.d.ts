// SPDX-License-Identifier: Apache-2.0
import type { PlayerControlState } from './state.js';
import type { PlayerControlInput, PlayerControlDecision } from './transition.js';
/** Bounded, data-only diagnostic history. This is deliberately not a serializer
 * for Player inputs: private source/filter/attachment graphs are omitted. */
export type TraceScope = Readonly<{
    lifetime: number;
    sourceId: number | null;
    sessionId: number | null;
    operationId: number | null;
}>;
export type TraceStatus = 'idle' | 'paused' | 'playing' | 'buffering' | 'ended' | 'error' | 'unknown';
export type TraceMode = 'auto' | 'native' | 'hybrid' | 'software';
export type TraceControl = Readonly<{
    name: 'play' | 'pause' | 'close' | 'destroy';
}> | Readonly<{
    name: 'seek' | 'volume' | 'rate' | 'gain';
    value: number;
}> | Readonly<{
    name: 'mute' | 'loop' | 'subtitle-visible';
    value: boolean;
}> | Readonly<{
    name: 'mode';
    value: TraceMode;
}>;
export type TraceInput = Readonly<{
    scope: TraceScope;
}> & (Readonly<{
    kind: 'control';
    control: TraceControl;
}> | Readonly<{
    kind: 'observation';
    status: TraceStatus;
    currentTime: number;
    duration: number | null;
}> | Readonly<{
    kind: 'effect';
    effectId: number;
    name: 'backend.play' | 'backend.pause' | 'resource.release' | 'timer.wait';
    phase: 'issued' | 'completed' | 'failed' | 'retired';
}> | Readonly<{
    kind: 'resource';
    resourceId: number;
    phase: 'reserved' | 'acquired' | 'retired' | 'released' | 'failed' | 'detached';
}> | Readonly<{
    kind: 'omitted';
    category: 'source' | 'filters' | 'attachments' | 'tracks' | 'other';
    reason?: 'private-payload' | 'unsupported-input' | 'compound-settings' | 'lifetime-only' | 'missing-payload';
}>);
export type TraceDecision = Readonly<{
    accepted: boolean;
    status: TraceStatus;
    effectCount: number;
    pendingCount: number;
    reason: 'none' | 'aborted' | 'unsupported' | 'invalid' | 'failed' | 'stale' | 'full' | 'unknown';
}>;
export type TraceEntry = Readonly<{
    sequence: number;
    tick: number;
    input: TraceInput;
    decision: TraceDecision;
    replay: 'control' | 'observation' | 'metadata' | 'omitted';
}>;
export type TraceState = Readonly<{
    schema: 1;
    capacity: number;
    nextSequence: number;
    dropped: number;
    entries: readonly TraceEntry[];
}>;
export declare function createTrace(capacity?: number): TraceState;
/** All time is explicit. Inputs must be normalized DTOs, never host objects or
 * accessors. Unknown fields are never traversed or retained. */
export declare function appendTrace(trace: TraceState, input: TraceInput, decision: TraceDecision, explicitTick: number): TraceState;
/** Export remains data only. A consumer must use an explicitly simulated
 * executor: metadata/omitted entries cannot reconstruct external effects. */
export declare function selectTrace(trace: TraceState): Readonly<{
    schema: 1;
    capacity: number;
    dropped: number;
    entries: readonly Readonly<{
        sequence: number;
        tick: number;
        input: TraceInput;
        decision: TraceDecision;
        replay: "control" | "observation" | "metadata" | "omitted";
    }>[];
    omitted: number;
    replayableControls: number;
    completeControlHistory: boolean;
    exactExternalReplay: false;
}>;
/** Safe production mapper. It records command data where the DTO is complete;
 * source graphs, compound settings and lifecycle-only notifications are marked
 * omitted. Public media status cannot be inferred from intent alone. */
export declare function tracePlayerTransition(trace: TraceState, input: PlayerControlInput, before: PlayerControlState, decision: PlayerControlDecision, tick: number): TraceState;
