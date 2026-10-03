// SPDX-License-Identifier: Apache-2.0
import { type SourcePreparation, type SourcePreparationFacts, type SourcePreparationEffect } from './source-preparation.js';
import { type SourceApplication, type SourceApplicationFacts, type SourceApplicationEffect, type SourceApplicationObservation } from './source-application.js';
import { type SourcePositioning, type SourcePositioningEffect, type SourcePositioningObservation } from './source-positioning.js';
import { type SourceAcceptance, type SourceAcceptanceEffect } from './source-acceptance.js';
import type { PlaybackMode } from '../../types.js';
import type { PlaybackSettings } from './settings.js';
type Phase = 'preparing' | 'configuring' | 'opening' | 'applying' | 'positioning' | 'verifying' | 'accepted';
export type SourceAttempt = Readonly<{
    id: number;
    operationEpoch: number;
    operation: number | null;
    session: number;
    fault: number | null;
    mode: PlaybackMode;
    preserve: boolean;
    phase: Phase;
    planId: string;
    preparation: SourcePreparation | null;
    application: SourceApplication | null;
    positioning: SourcePositioning | null;
    acceptance: SourceAcceptance | null;
}>;
export type SourceControl = Readonly<{
    serial: number;
    attemptSerial: number;
    sessionSerial: number;
    faultSerial: number;
    acceptedFault: number | null;
    acceptedSession: number | null;
    acceptedEpoch: number | null;
    mode: PlaybackMode;
    automatic: boolean;
    candidate: SourceAttempt | null;
}>;
export type SourceInput = Readonly<{
    type: 'source.fault';
    session: number;
}> | Readonly<{
    type: 'source.acceptance.next';
    attempt: number;
}> | Readonly<{
    type: 'source.acceptance.completed';
    attempt: number;
    step: number;
    hasProperty?: boolean;
}> | Readonly<{
    type: 'source.acceptance.failed' | 'source.acceptance.cleanup' | 'source.acceptance.cleaned';
    attempt: number;
    operationEpoch: number;
    operation: number | null;
}> | Readonly<{
    type: 'source.configure';
    mode?: PlaybackMode;
    automatic?: boolean;
}> | Readonly<{
    type: 'source.begin';
    operationEpoch: number;
    operation?: number | null;
    mode: PlaybackMode;
    preserve: boolean;
    planId: string;
}> | Readonly<{
    type: 'source.created';
    attempt: number;
    prepare?: boolean;
}> | Readonly<{
    type: 'source.positioning.begin';
    attempt: number;
    target: number;
    overlapping: boolean;
}> | Readonly<{
    type: 'source.positioning.next';
    attempt: number;
}> | Readonly<{
    type: 'source.positioning.completed';
    attempt: number;
    step: number;
    observation?: SourcePositioningObservation;
}> | Readonly<{
    type: 'source.application.begin';
    attempt: number;
    facts: SourceApplicationFacts;
}> | Readonly<{
    type: 'source.application.next';
    attempt: number;
}> | Readonly<{
    type: 'source.application.completed';
    attempt: number;
    step: number;
    observation?: SourceApplicationObservation;
}> | Readonly<{
    type: 'source.preparation.next';
    attempt: number;
}> | Readonly<{
    type: 'source.preparation.completed';
    attempt: number;
    step: number;
    facts?: SourcePreparationFacts;
}> | Readonly<{
    type: 'source.configured' | 'source.opened' | 'source.applied' | 'source.positioned' | 'source.finished';
    attempt: number;
}> | Readonly<{
    type: 'source.accept';
    attempt: number;
    operationEpoch: number;
    settings: Readonly<PlaybackSettings>;
    planMatches: boolean;
    publication?: Readonly<{
        predecessor: boolean;
    }>;
    timing?: Readonly<{
        elapsed: number;
        timestamps: readonly number[];
    }>;
    publicSelections?: Readonly<Partial<Record<'audio' | 'sub', string>>>;
}> | Readonly<{
    type: 'source.clear';
}>;
export type SourceDecision = Readonly<{
    state: SourceControl;
    accepted: boolean;
    attempt?: number;
    preparationEffect?: SourcePreparationEffect;
    applicationEffect?: SourceApplicationEffect;
    positioningEffect?: SourcePositioningEffect;
    acceptanceEffect?: SourceAcceptanceEffect;
    settings?: Readonly<PlaybackSettings>;
    newSource?: boolean;
    reason?: 'busy' | 'retired' | 'phase' | 'plan' | 'fault-capacity';
}>;
export declare function initialSource(): SourceControl;
/** Candidate and accepted identities are separate. A preserving handoff advances
 * session identity without changing the public source identity. Settings commit
 * is returned to the composed transition, never published independently. */
export declare function transitionSource(state: SourceControl, input: SourceInput): SourceDecision;
export declare function sourceDesiredSettings(settings: Readonly<PlaybackSettings>, facts: Readonly<{
    preserve: boolean;
    previousPause: boolean;
    previousSession: boolean;
    previousMode: PlaybackMode;
    mode: PlaybackMode;
}>): Readonly<PlaybackSettings>;
export declare function sourcePreparationCurrent(state: SourceControl, attempt: number, step: number): boolean;
export declare function sourceApplicationCurrent(state: SourceControl, attempt: number, step: number): boolean;
export declare function sourcePositioningCurrent(state: SourceControl, attempt: number, step: number): boolean;
/** Fault identities are bounded by the candidate and accepted session owners. */
export declare function sourceSessionFault(state: SourceControl, session: number): number | null;
export {};
