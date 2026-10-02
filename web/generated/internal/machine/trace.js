// SPDX-License-Identifier: Apache-2.0
const identity = (value) => Number.isSafeInteger(value) && value !== null && value >= 0 ? value : null;
const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const status = (value) => ['idle', 'paused', 'playing', 'buffering', 'ended', 'error'].includes(value) ? value : 'unknown';
function scope(input) { return Object.freeze({ lifetime: count(input.lifetime), sourceId: identity(input.sourceId), sessionId: identity(input.sessionId), operationId: identity(input.operationId) }); }
function sanitize(input) {
    const copiedScope = scope(input.scope);
    if (input.kind === 'control') {
        const control = input.control;
        if (control.name === 'play' || control.name === 'pause' || control.name === 'close' || control.name === 'destroy')
            return Object.freeze({ scope: copiedScope, kind: 'control', control: Object.freeze({ name: control.name }) });
        if ((control.name === 'seek' || control.name === 'volume' || control.name === 'rate' || control.name === 'gain') && typeof control.value === 'number' && Number.isFinite(control.value))
            return Object.freeze({ scope: copiedScope, kind: 'control', control: Object.freeze({ name: control.name, value: control.value }) });
        if ((control.name === 'mute' || control.name === 'loop' || control.name === 'subtitle-visible') && typeof control.value === 'boolean')
            return Object.freeze({ scope: copiedScope, kind: 'control', control: Object.freeze({ name: control.name, value: control.value }) });
        if (control.name === 'mode' && ['auto', 'native', 'hybrid', 'software'].includes(control.value))
            return Object.freeze({ scope: copiedScope, kind: 'control', control: Object.freeze({ name: 'mode', value: control.value }) });
    }
    if (input.kind === 'observation' && Number.isFinite(input.currentTime) && (input.duration === null || Number.isFinite(input.duration)))
        return Object.freeze({ scope: copiedScope, kind: 'observation', status: status(input.status), currentTime: input.currentTime, duration: input.duration });
    if (input.kind === 'effect' && identity(input.effectId) !== null && ['backend.play', 'backend.pause', 'resource.release', 'timer.wait'].includes(input.name) && ['issued', 'completed', 'failed', 'retired'].includes(input.phase))
        return Object.freeze({ scope: copiedScope, kind: 'effect', effectId: input.effectId, name: input.name, phase: input.phase });
    if (input.kind === 'resource' && identity(input.resourceId) !== null && ['acquired', 'retired', 'released', 'failed', 'detached'].includes(input.phase))
        return Object.freeze({ scope: copiedScope, kind: 'resource', resourceId: input.resourceId, phase: input.phase });
    const category = input.kind === 'omitted' && ['source', 'filters', 'attachments', 'tracks', 'other'].includes(input.category) ? input.category : 'other';
    const reason = input.kind === 'omitted' && ['private-payload', 'unsupported-input', 'compound-settings', 'lifetime-only', 'missing-payload'].includes(input.reason ?? '') ? input.reason : 'unsupported-input';
    return Object.freeze({ scope: copiedScope, kind: 'omitted', category, reason });
}
export function createTrace(capacity = 256) {
    if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 4096)
        throw new RangeError('Invalid trace capacity');
    return Object.freeze({ schema: 1, capacity, nextSequence: 1, dropped: 0, entries: Object.freeze([]) });
}
/** All time is explicit. Inputs must be normalized DTOs, never host objects or
 * accessors. Unknown fields are never traversed or retained. */
export function appendTrace(trace, input, decision, explicitTick) {
    if (!Number.isFinite(explicitTick) || explicitTick < 0 || explicitTick < (trace.entries.at(-1)?.tick ?? 0))
        throw new RangeError('Trace tick must be finite and monotonic');
    if (!Number.isSafeInteger(trace.nextSequence) || trace.nextSequence >= Number.MAX_SAFE_INTEGER)
        throw new RangeError('Trace sequence exhausted');
    const copied = sanitize(input), reason = ['none', 'aborted', 'unsupported', 'invalid', 'failed', 'stale', 'full'].includes(decision.reason) ? decision.reason : 'unknown';
    const outcome = Object.freeze({ accepted: decision.accepted === true, status: status(decision.status), effectCount: count(decision.effectCount), pendingCount: count(decision.pendingCount), reason });
    const replay = copied.kind === 'control' ? 'control' : copied.kind === 'observation' ? 'observation' : copied.kind === 'omitted' ? 'omitted' : 'metadata';
    const entry = Object.freeze({ sequence: trace.nextSequence, tick: explicitTick, input: copied, decision: outcome, replay });
    const dropped = trace.entries.length >= trace.capacity ? 1 : 0;
    return Object.freeze({ schema: 1, capacity: trace.capacity, nextSequence: trace.nextSequence + 1, dropped: trace.dropped + dropped, entries: Object.freeze([...trace.entries.slice(dropped), entry]) });
}
/** Export remains data only. A consumer must use an explicitly simulated
 * executor: metadata/omitted entries cannot reconstruct external effects. */
export function selectTrace(trace) {
    return Object.freeze({ schema: trace.schema, capacity: trace.capacity, dropped: trace.dropped, entries: trace.entries,
        omitted: trace.entries.filter(entry => entry.replay === 'omitted').length,
        replayableControls: trace.entries.filter(entry => entry.replay === 'control').length,
        completeControlHistory: trace.dropped === 0 && trace.entries.every(entry => entry.replay !== 'omitted'),
        exactExternalReplay: false });
}
/** Safe production mapper. It records command data where the DTO is complete;
 * source graphs, compound settings and lifecycle-only notifications are marked
 * omitted. Public media status cannot be inferred from intent alone. */
export function tracePlayerTransition(trace, input, before, decision, tick) {
    const state = decision.state, identities = { lifetime: 1, sourceId: state.source.serial || null, sessionId: state.source.acceptedSession, operationId: state.operations.active ?? before.operations.active };
    let event = { kind: 'omitted', scope: identities, category: 'other', reason: 'unsupported-input' };
    if (input.type === 'play.request')
        event = { kind: 'control', scope: identities, control: { name: 'play' } };
    else if (input.type === 'source.configure')
        event = { kind: 'control', scope: identities, control: { name: 'mode', value: state.source.automatic ? 'auto' : state.source.mode } };
    else if (input.type === 'setting.begin') {
        const command = input.command;
        if (command.kind === 'volume' || command.kind === 'rate' || command.kind === 'gain')
            event = { kind: 'control', scope: identities, control: { name: command.kind, value: command.value } };
        else if (command.kind === 'mute' || command.kind === 'subtitles')
            event = { kind: 'control', scope: identities, control: { name: command.kind === 'mute' ? 'mute' : 'subtitle-visible', value: command.value } };
        else if (command.kind === 'pause')
            event = { kind: 'control', scope: identities, control: { name: 'pause' } };
        else
            event = { kind: 'omitted', scope: identities, category: command.kind === 'track' ? 'tracks' : 'other', reason: 'private-payload' };
    }
    else if (input.type === 'settings.change') {
        const keys = Object.keys(input.value), value = input.value;
        if (keys.length === 1) {
            if (typeof value.pause === 'boolean')
                event = { kind: 'control', scope: identities, control: { name: value.pause ? 'pause' : 'play' } };
            else if (typeof value.volume === 'number')
                event = { kind: 'control', scope: identities, control: { name: 'volume', value: value.volume } };
            else if (typeof value.speed === 'number')
                event = { kind: 'control', scope: identities, control: { name: 'rate', value: value.speed } };
            else if (typeof value.gain === 'number')
                event = { kind: 'control', scope: identities, control: { name: 'gain', value: value.gain } };
            else if (typeof value.subtitles === 'boolean')
                event = { kind: 'control', scope: identities, control: { name: 'subtitle-visible', value: value.subtitles } };
            else
                event = { kind: 'omitted', scope: identities, category: keys[0] === 'vf' || keys[0] === 'af' ? 'filters' : 'tracks', reason: 'private-payload' };
        }
        else
            event = { kind: 'omitted', scope: identities, category: 'other', reason: 'compound-settings' };
    }
    else if (input.type === 'settings.accept')
        event = { kind: 'omitted', scope: identities, category: 'other', reason: 'compound-settings' };
    else if (input.type.startsWith('source.'))
        event = { kind: 'omitted', scope: identities, category: 'source', reason: 'private-payload' };
    else if (input.type === 'seek.request')
        event = { kind: 'omitted', scope: identities, category: 'other', reason: 'missing-payload' };
    else if (input.type === 'preferences.change')
        event = { kind: 'omitted', scope: identities, category: 'other', reason: 'compound-settings' };
    else
        event = { kind: 'omitted', scope: identities, category: 'other', reason: 'lifetime-only' };
    const reason = decision.accepted ? 'none' : decision.reason === 'retired' ? 'stale' : decision.reason === 'full' ? 'full' : 'unknown';
    return appendTrace(trace, event, { accepted: decision.accepted, status: 'unknown', effectCount: decision.effects?.length ?? 0, pendingCount: state.operations.entries.length, reason }, tick);
}
