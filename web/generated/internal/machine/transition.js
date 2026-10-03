// SPDX-License-Identifier: Apache-2.0
import { effectRuntimeWork, transitionEffectRuntime } from './effect-runtime.js';
import { resourceScopeRetired } from './resource-ledger.js';
import { transitionResourceLedger } from './resource-ledger.js';
import { transitionPlayerReadiness, retirePlayerReadiness } from './player-readiness.js';
import { transitionPlayerAction, retirePlayerActions } from './player-actions.js';
import { transitionPlayerPublication, acceptPlayerPublication, clearPlayerPublication, retirePlayerPublication } from './player-publication.js';
import { transitionPlayerMonitor, stopPlayerMonitor } from './player-monitor.js';
import { transitionBoundary, playbackBoundaryReached } from './playback-boundary.js';
import { transitionOperations } from './operations.js';
import { transitionPlayback } from './playback.js';
import { transitionSettings, transitionSettingTransaction, changePreferences, clearSourcePreferences } from './settings.js';
import { transitionSource } from './source.js';
import { transitionAttachment, attachmentAuthority, attachmentPreferences } from './attachments.js';
import { transitionRouting } from './route-state.js';
import { clearRecovery, retireRecovery } from './route-recovery.js';
import { cancelPromotion } from './route-promotion.js';
import { clearRouteEvidence, retireRouteEvidence } from './route-evidence.js';
import { transitionInspection, isInspectionWorkChange } from './route-inspection.js';
/** Publication bookkeeping does not invalidate an otherwise current capture.
 * Every domain change still advances the same composed authority revision. */
export function transitionPlayer(state, input) {
    let decision = reducePlayer(state, input);
    if (decision.state !== state && input.type !== 'resource.event') {
        let resources = decision.state.resources;
        const candidates = [state.source.acceptedSession, state.source.candidate?.session];
        const cancelled = (input.type === 'operation.cancel' || input.type === 'operation.finish' || input.type === 'operation.release') && input.id === state.operations.active;
        for (const session of new Set(candidates))
            if (session !== null && session !== undefined && (sessionAuthority(decision.state, session) === 'retired' || cancelled && session === state.source.candidate?.session && session !== decision.state.source.acceptedSession))
                resources = transitionResourceLedger(resources, { type: 'retire-scope', scopeKey: `scope:${session}` }).state;
        if (input.type === 'operation.retire' && input.terminal)
            resources = transitionResourceLedger(resources, { type: 'dispose' }).state;
        if (resources !== decision.state.resources)
            decision = Object.freeze({ ...decision, state: Object.freeze({ ...decision.state, resources }) });
    }
    if (decision.state !== state && input.type !== 'effect.event') {
        let executor = decision.state.executor;
        const outcomes = [];
        for (const { effect } of executor.pending) {
            const retiredCleanup = effect.kind === 'resource.release' && resourceScopeRetired(decision.state.resources, `scope:${effect.scope.sessionId}`), step = transitionEffectRuntime(executor, { type: 'retire', id: effect.id, current: playerEffectAuthority(decision.state, effect.scope), retiredCleanup });
            executor = step.state;
            outcomes.push(...step.outcomes);
        }
        if (decision.state.operations.terminal) {
            const disposed = transitionEffectRuntime(executor, { type: 'dispose' });
            executor = disposed.state;
            outcomes.push(...disposed.outcomes);
        }
        if (executor !== decision.state.executor)
            decision = Object.freeze({ ...decision, state: Object.freeze({ ...decision.state, executor }), executionOutcomes: Object.freeze(outcomes) });
    }
    const bookkeeping = input.type === 'effect.event' || input.type === 'resource.event' || ['publication.schedule', 'publication.scheduled', 'publication.begin', 'publication.prepare', 'publication.commit'].includes(input.type);
    return decision.state === state || bookkeeping ? decision : Object.freeze({ ...decision, state: Object.freeze({ ...decision.state, captureRevision: state.captureRevision + 1 }) });
}
function reducePlayer(state, input) {
    if (input.type === 'effect.event') {
        const event = input.input, work = 'id' in event ? effectRuntimeWork(state.executor, event.id) : undefined;
        const normalized = work && (event.type === 'start' || event.type === 'retire' || event.type === 'physical-result') ? { ...event, current: playerEffectAuthority(state, work.effect.scope), ...event.type !== 'physical-result' ? { retiredCleanup: work.effect.kind === 'resource.release' && resourceScopeRetired(state.resources, `scope:${work.effect.scope.sessionId}`) } : {} } : event;
        const execution = transitionEffectRuntime(state.executor, normalized);
        return Object.freeze({ state: execution.state === state.executor ? state : Object.freeze({ ...state, revision: state.revision + 1, executor: execution.state }), accepted: execution.accepted, reason: execution.reason, execution, retire: Object.freeze([]) });
    }
    if (input.type === 'resource.event') {
        const resource = transitionResourceLedger(state.resources, input.input);
        return Object.freeze({ state: resource.state === state.resources ? state : Object.freeze({ ...state, revision: state.revision + 1, resources: resource.state }), accepted: resource.accepted, reason: resource.reason, resource, retire: Object.freeze([]) });
    }
    if (isReadinessInput(input))
        return transitionPlayerReadiness(state, input);
    if (isActionInput(input))
        return transitionPlayerAction(state, input);
    if (isPublicationInput(input))
        return transitionPlayerPublication(state, input);
    if (isMonitorInput(input))
        return transitionPlayerMonitor(state, input);
    if (isRoutingInput(input)) {
        if (input.type === 'routing.deployment' && !playerDeploymentCurrent(state, input.epoch, input.operation, input.change.kind === 'resolved' ? input.change.revision : state.routing.deployment.revision))
            return Object.freeze({ state, accepted: false, reason: 'retired', retire: Object.freeze([]) });
        if (input.type === 'routing.recovery' && (state.operations.terminal || input.change.kind === 'begin' && (input.change.epoch !== state.operations.epoch || input.change.session !== state.source.acceptedSession || state.source.acceptedEpoch !== state.operations.epoch || !state.source.automatic || state.source.mode === 'software') || input.change.kind === 'streaming.failed' && (input.change.source !== state.source.serial || input.change.session !== state.source.acceptedSession || state.source.acceptedEpoch !== state.operations.epoch)))
            return Object.freeze({ state, accepted: false, reason: 'retired', retire: Object.freeze([]) });
        if ((input.type === 'routing.capabilities' || input.type === 'routing.tiers' || input.type === 'routing.promotion') && state.operations.terminal)
            return Object.freeze({ state, accepted: false, reason: 'retired', retire: Object.freeze([]) });
        if (input.type === 'routing.discovery' && (state.operations.terminal || input.epoch !== state.operations.epoch || input.operation !== state.operations.active || input.operation !== null && !state.operations.entries.some(entry => entry.id === input.operation && entry.epoch === input.epoch && !entry.cancelled)))
            return Object.freeze({ state, accepted: false, reason: 'retired', retire: Object.freeze([]) });
        if (input.type === 'routing.inspection') {
            const work = state.routing.inspection.work, change = input.change;
            const cleanup = change.kind === 'work.finished' && work?.id === change.id && work.epoch === change.epoch && work.operation === change.operation && input.epoch === change.epoch && input.operation === change.operation;
            const rebound = change.kind === 'work.begin' || change.kind === 'work.finished' ? (change.epoch !== input.epoch || change.operation !== input.operation) : isInspectionWorkChange(change) && (work?.epoch !== input.epoch || work.operation !== input.operation);
            if (rebound || !cleanup && (state.operations.terminal || input.epoch !== state.operations.epoch || input.operation !== state.operations.active || input.operation !== null && !state.operations.entries.some(entry => entry.id === input.operation && entry.epoch === input.epoch) || change.kind !== 'restore' && state.operations.entries.some(entry => entry.id === input.operation && entry.cancelled)))
                return Object.freeze({ state, accepted: false, reason: 'retired', retire: Object.freeze([]) });
        }
        if (input.type === 'routing.decoding' && (state.operations.terminal || input.epoch !== state.operations.epoch || input.session !== state.source.acceptedSession))
            return Object.freeze({ state, accepted: false, reason: 'retired', retire: Object.freeze([]) });
        const routing = transitionRouting(state.routing, input);
        return Object.freeze({ state: routing === state.routing ? state : Object.freeze({ ...state, revision: state.revision + 1, routing }), accepted: routing !== state.routing || !['routing.deployment', 'routing.inspection', 'routing.discovery', 'routing.capabilities', 'routing.tiers', 'routing.promotion', 'routing.recovery'].includes(input.type), retire: Object.freeze([]) });
    }
    if (isAttachmentInput(input))
        return transitionAttachment(state, input);
    if (isBoundaryInput(input))
        return transitionBoundary(state, input);
    if (isSettingTransaction(input))
        return transitionSettingTransaction(state, input);
    if (input.type === 'playback.sample') {
        const previous = state.playback;
        if (state.operations.terminal || state.source.acceptedEpoch !== state.operations.epoch || state.source.candidate || input.session !== state.source.acceptedSession || input.session === previous.sampleSession && input.sequence <= previous.sampleSequence)
            return Object.freeze({ state, accepted: false, id: undefined, reason: 'retired', retire: Object.freeze([]) });
        const playing = input.observation === 'playing' || input.observation === 'time' && !state.settings.pause && typeof input.value === 'number' && input.value > (input.publishedTime ?? 0);
        const playback = Object.freeze({ ...previous, sampleSession: input.session, sampleSequence: input.sequence, observedPlaying: playing ? true : previous.observedPlaying, observedWaiting: playing ? false : input.observation === 'waiting' ? true : previous.observedWaiting });
        // EOF pauses are physical observations, not a new user pause intent. Keep
        // accepted play intent until the boundary owner has restarted/stopped it.
        const boundaryPause = input.boundary && playbackBoundaryReached(state, input.boundary.time, input.boundary.duration, input.boundary.ended);
        const settings = input.observation === 'pause' && input.value === true && state.operations.active === null && !boundaryPause ? Object.freeze({ ...state.settings, pause: true }) : state.settings;
        return Object.freeze({ state: Object.freeze({ ...state, revision: state.revision + 1, playback, settings }), accepted: true, id: undefined, reason: undefined, retire: Object.freeze([]) });
    }
    if (isSourceInput(input)) {
        const retired = state.operations.terminal || state.operations.entries.some(entry => entry.id === state.operations.active && entry.cancelled);
        const cleanup = input.type === 'source.acceptance.cleanup' || input.type === 'source.acceptance.cleaned' || input.type === 'source.acceptance.failed';
        const forward = !cleanup && input.type !== 'source.configure' && input.type !== 'source.clear' && input.type !== 'source.finished';
        const expired = input.type === 'source.fault' ? sessionAuthority(state, input.session) === 'retired' : input.type === 'source.begin' ? input.operationEpoch !== state.operations.epoch || input.operation !== undefined && input.operation !== state.operations.active : state.source.candidate?.operationEpoch !== state.operations.epoch || state.source.candidate?.operation !== state.operations.active;
        // A cancelled command retires its candidate, not the accepted backend.
        // Fault observations follow the listener's session authority in both cases.
        if (forward && (expired || input.type !== 'source.fault' && retired))
            return Object.freeze({ state, accepted: false, id: undefined, reason: 'retired', retire: Object.freeze([]) });
        const decision = transitionSource(state.source, input.type === 'source.accept' ? { ...input, operationEpoch: state.operations.epoch } : input.type === 'source.begin' ? { ...input, operation: state.operations.active } : input), settings = decision.settings ?? (input.type === 'source.clear' ? Object.freeze({ ...state.settings, pause: true, aid: 'auto', sid: 'auto' }) : state.settings);
        const playback = decision.settings || input.type === 'source.clear' ? Object.freeze({ ...state.playback, observedPlaying: false, observedWaiting: false, sampleSession: decision.state.acceptedSession, sampleSequence: 0 }) : state.playback;
        const reset = input.type === 'source.clear' || input.type === 'source.accept' && decision.accepted && !state.source.candidate?.preserve;
        const pending = state.settingsTransactions.pending;
        const acceptedSetting = input.type === 'source.accept' && decision.accepted && pending?.reconfigure && pending.phase === 'applying' && pending.operation === state.operations.active && pending.epoch === state.operations.epoch;
        const attachment = state.attachments.pending, acceptedAttachment = input.type === 'source.accept' && decision.accepted && !reset && attachment?.phase === 'applying' && attachmentAuthority(state, attachment.id);
        const attachments = reset ? Object.freeze({ ...state.attachments, entries: Object.freeze(state.operations.terminal ? [] : state.attachments.entries.filter(entry => entry.kind === 'font')), pending: null }) : acceptedAttachment ? Object.freeze({ ...state.attachments, entries: attachment.entries, pending: Object.freeze({ ...attachment, phase: 'accepted', session: decision.state.acceptedSession }) }) : state.attachments;
        const desiredPreferences = acceptedSetting ? changePreferences(state.preferences, pending.preferencesPatch) : acceptedAttachment ? attachmentPreferences(state) : state.preferences, resetPreferences = reset ? clearSourcePreferences(desiredPreferences) : desiredPreferences;
        const preferences = reset && input.type === 'source.accept' && input.publicSelections ? changePreferences(resetPreferences, { publicSelections: input.publicSelections }) : resetPreferences;
        const settingsTransactions = input.type === 'source.clear' || input.type === 'source.accept' && decision.accepted ? Object.freeze({ ...state.settingsTransactions, pending: acceptedSetting ? Object.freeze({ ...pending, phase: 'accepted', session: decision.state.acceptedSession, settings, preferences }) : null, degraded: null }) : state.settingsTransactions;
        return Object.freeze({ ...decision, state: decision.state === state.source ? state : Object.freeze({ ...state, revision: state.revision + 1, source: decision.state, readiness: input.type === 'source.clear' || input.type === 'source.accept' && decision.accepted ? retirePlayerReadiness(state.readiness) : state.readiness, actions: input.type === 'source.clear' || input.type === 'source.accept' && decision.accepted ? retirePlayerActions(state.actions) : state.actions, publication: input.type === 'source.clear' ? clearPlayerPublication(state.publication) : input.type === 'source.accept' && decision.accepted ? acceptPlayerPublication(state.publication, decision.state.serial, !!state.source.candidate?.preserve, input.timing) : state.publication, monitor: input.type === 'source.clear' || input.type === 'source.accept' && decision.accepted ? stopPlayerMonitor(state.monitor) : state.monitor, attachments, settings, playback, preferences, settingsTransactions, routing: input.type === 'source.clear' ? Object.freeze({ ...state.routing, recovery: clearRecovery(state.routing.recovery), promotion: cancelPromotion(state.routing.promotion), evidence: clearRouteEvidence(state.routing.evidence), discovery: Object.freeze({ ...state.routing.discovery, current: null }), inspection: transitionInspection(state.routing.inspection, { kind: 'clear' }) }) : reset ? Object.freeze({ ...state.routing, recovery: Object.freeze({ ...state.routing.recovery, failedStreaming: null }) }) : state.routing, boundary: input.type === 'source.clear' || input.type === 'source.accept' && decision.accepted ? Object.freeze({ ...state.boundary, pending: null }) : state.boundary }), id: decision.attempt, retire: Object.freeze([]) });
    }
    if (input.type === 'settings.accept' || input.type === 'settings.change')
        return Object.freeze({ state: Object.freeze({ ...state, revision: state.revision + 1, settings: transitionSettings(state.settings, input) }), accepted: true, id: undefined, reason: undefined, retire: Object.freeze([]) });
    if (input.type === 'play.request' || input.type === 'play.retire' || input.type === 'play.settled' || input.type === 'seek.request' || input.type === 'seek.settled' || input.type === 'playback.observed') {
        if ((input.type === 'play.request' || input.type === 'seek.request') && state.operations.terminal)
            return Object.freeze({ state, accepted: false, id: undefined, reason: 'destroyed', retire: Object.freeze([]) });
        const decision = transitionPlayback(state.playback, input);
        if ((input.type === 'play.request' || input.type === 'seek.request') && (!('id' in decision) || decision.id === undefined))
            return Object.freeze({ state, accepted: false, id: undefined, reason: 'full', retire: Object.freeze([]) });
        return Object.freeze({ state: Object.freeze({ ...state, revision: state.revision + 1, playback: decision.state }), accepted: true, id: 'id' in decision ? decision.id : undefined, reason: undefined, retire: decision.retire });
    }
    const decision = transitionOperations(state.operations, input);
    const pending = state.settingsTransactions.pending;
    const retired = input.type === 'operation.retire' || (input.type === 'operation.cancel' || input.type === 'operation.finish' || input.type === 'operation.release') && input.id === pending?.operation;
    const settingsTransactions = retired && pending ? Object.freeze({ ...state.settingsTransactions, pending: null }) : state.settingsTransactions;
    const attachment = state.attachments.pending, retireAttachment = input.type === 'operation.retire' || (input.type === 'operation.cancel' || input.type === 'operation.finish' || input.type === 'operation.release') && input.id === attachment?.operation;
    const attachments = retireAttachment && attachment ? Object.freeze({ ...state.attachments, pending: null }) : state.attachments;
    const retireDiscovery = input.type === 'operation.retire' || (input.type === 'operation.cancel' || input.type === 'operation.finish' || input.type === 'operation.release') && input.id === state.operations.active;
    const routing = retireDiscovery ? Object.freeze({ ...state.routing, ...(input.type === 'operation.retire' ? { promotion: cancelPromotion(state.routing.promotion), recovery: retireRecovery(state.routing.recovery) } : {}), evidence: retireRouteEvidence(state.routing.evidence), discovery: Object.freeze({ ...state.routing.discovery, current: null }) }) : state.routing;
    return Object.freeze({ ...decision, state: decision.state === state.operations ? state : Object.freeze({ ...state, revision: state.revision + 1, operations: decision.state, readiness: input.type === 'operation.retire' || (input.type === 'operation.cancel' || input.type === 'operation.finish' || input.type === 'operation.release') && input.id === state.readiness.pending?.operation ? retirePlayerReadiness(state.readiness) : state.readiness, actions: input.type === 'operation.retire' || (input.type === 'operation.cancel' || input.type === 'operation.finish' || input.type === 'operation.release') && input.id === state.actions.pending?.operation ? retirePlayerActions(state.actions) : state.actions, publication: input.type === 'operation.retire' ? retirePlayerPublication(state.publication) : state.publication, monitor: input.type === 'operation.retire' ? stopPlayerMonitor(state.monitor) : state.monitor, attachments, settingsTransactions, routing, boundary: input.type === 'operation.retire' ? Object.freeze({ ...state.boundary, pending: null }) : state.boundary }), retire: Object.freeze([]) });
}
function isReadinessInput(input) { return input.type.startsWith('readiness.'); }
function isActionInput(input) { return input.type.startsWith('action.'); }
function isPublicationInput(input) { return input.type.startsWith('publication.'); }
function isMonitorInput(input) { return input.type.startsWith('monitor.'); }
function isAttachmentInput(input) { return input.type.startsWith('attachment.'); }
function isRoutingInput(input) { return input.type.startsWith('routing.'); }
function isBoundaryInput(input) { return input.type.startsWith('boundary.'); }
function isSourceInput(input) { return input.type.startsWith('source.'); }
function isSettingTransaction(input) { return input.type.startsWith('setting.') || input.type === 'preferences.change'; }
/** A backend listener keeps its allocation identity. Retirement fences every
 * accepted-session effect, including errors/recovery, not just playback flags. */
export function sessionAuthority(state, session) {
    if (state.operations.terminal)
        return 'retired';
    if (state.source.acceptedSession === session && state.source.acceptedEpoch === state.operations.epoch)
        return 'accepted';
    const candidate = state.source.candidate;
    if (candidate?.session === session && candidate.operationEpoch === state.operations.epoch && candidate.operation === state.operations.active && !state.operations.entries.some(entry => entry.id === state.operations.active && entry.cancelled))
        return 'candidate';
    return 'retired';
}
/** Current ownership is determined entirely by the composed Player state. */
export function playerEffectAuthority(state, scope) {
    if (scope.owner !== 'player' || state.operations.terminal || scope.lifetime !== state.operations.epoch || scope.sessionId === null || sessionAuthority(state, scope.sessionId) === 'retired' || resourceScopeRetired(state.resources, `scope:${scope.sessionId}`))
        return false;
    if (scope.operationId !== 0 && (state.operations.active !== scope.operationId || !state.operations.entries.some(entry => entry.id === scope.operationId && !entry.cancelled)))
        return false;
    return scope.playId === undefined || state.playback.plays.includes(scope.playId);
}
export function playerDeploymentCurrent(state, epoch, operation, revision) { return !state.operations.terminal && state.operations.epoch === epoch && state.operations.active === operation && state.routing.deployment.revision === revision && (operation === null || state.operations.entries.some(entry => entry.id === operation && entry.epoch === epoch && !entry.cancelled)); }
