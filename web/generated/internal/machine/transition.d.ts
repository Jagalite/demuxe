// SPDX-License-Identifier: Apache-2.0
import { type EffectRuntimeInput, type EffectRuntimeDecision } from './effect-runtime.js';
import type { EffectScope, EffectOutcome } from './protocol.js';
import { type ResourceLedgerInput, type ResourceLedgerDecision } from './resource-ledger.js';
import { type PlayerReadinessInput, type PlayerReadinessEffect } from './player-readiness.js';
import { type PlayerActionInput, type PlayerActionEffect } from './player-actions.js';
import { type PlayerPublicationInput } from './player-publication.js';
import type { PlayerProjection } from './selectors.js';
import { type PlayerMonitorInput } from './player-monitor.js';
import { type BoundaryInput, type BoundaryEffect } from './playback-boundary.js';
import { type OperationInput } from './operations.js';
import { type PlaybackInput } from './playback.js';
import { type SettingsInput, type SettingTransactionInput, type SettingEffect } from './settings.js';
import type { SourceAcceptanceEffect } from './source-acceptance.js';
import type { SourcePositioningEffect } from './source-positioning.js';
import type { SourceApplicationEffect } from './source-application.js';
import type { SourcePreparationEffect } from './source-preparation.js';
import { type SourceInput } from './source.js';
import { type AttachmentInput, type AttachmentEffect } from './attachments.js';
import { type RoutingInput } from './route-state.js';
import type { PlayerControlState } from './state.js';
export type SessionObservation = Readonly<{
    type: 'playback.sample';
    session: number;
    sequence: number;
    observation: 'waiting' | 'playing' | 'time' | 'pause';
    value?: number | boolean;
    publishedTime?: number;
}>;
export type PlayerControlInput = Readonly<{
    type: 'effect.event';
    input: EffectRuntimeInput;
}> | Readonly<{
    type: 'resource.event';
    input: ResourceLedgerInput;
}> | PlayerReadinessInput | PlayerActionInput | PlayerPublicationInput | PlayerMonitorInput | RoutingInput | AttachmentInput | BoundaryInput | OperationInput | PlaybackInput | SettingsInput | SettingTransactionInput | SourceInput | SessionObservation;
export type PlayerControlDecision<Effect = SettingEffect | BoundaryEffect | AttachmentEffect> = Readonly<{
    state: PlayerControlState;
    accepted: boolean;
    preparationEffect?: SourcePreparationEffect;
    applicationEffect?: SourceApplicationEffect;
    positioningEffect?: SourcePositioningEffect;
    acceptanceEffect?: SourceAcceptanceEffect;
    execution?: EffectRuntimeDecision;
    executionOutcomes?: readonly EffectOutcome[];
    resource?: ResourceLedgerDecision;
    id?: number;
    reason?: string;
    message?: string;
    retire: readonly number[];
    effects?: readonly Effect[];
    publication?: PlayerProjection;
    actionEffects?: readonly PlayerActionEffect[];
    readinessEffects?: readonly PlayerReadinessEffect[];
}>;
/** Publication bookkeeping does not invalidate an otherwise current capture.
 * Every domain change still advances the same composed authority revision. */
export declare function transitionPlayer(state: PlayerControlState, input: PlayerControlInput): PlayerControlDecision;
/** A backend listener keeps its allocation identity. Retirement fences every
 * accepted-session effect, including errors/recovery, not just playback flags. */
export declare function sessionAuthority(state: PlayerControlState, session: number): 'accepted' | 'candidate' | 'retired';
/** Current ownership is determined entirely by the composed Player state. */
export declare function playerEffectAuthority(state: PlayerControlState, scope: EffectScope): boolean;
export declare function playerDeploymentCurrent(state: PlayerControlState, epoch: number, operation: number | null, revision: number): boolean;
