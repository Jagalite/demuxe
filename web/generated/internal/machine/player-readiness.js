// SPDX-License-Identifier: Apache-2.0
export function initialPlayerReadiness() { return Object.freeze({ serial: 0, pending: null }); }
export function retirePlayerReadiness(state) { return state.pending ? Object.freeze({ ...state, pending: null }) : state; }
function sessionCurrent(state, session) { return state.source.acceptedSession === session && state.source.acceptedEpoch === state.operations.epoch || state.source.candidate?.session === session && state.source.candidate.operationEpoch === state.operations.epoch; }
export function playerReadinessAuthority(state, id) {
    const pending = state.readiness.pending;
    return !!pending && pending.id === id && !state.operations.terminal && pending.epoch === state.operations.epoch && pending.operation === state.operations.active && sessionCurrent(state, pending.session) && state.operations.entries.some(entry => entry.id === pending.operation && entry.epoch === pending.epoch && !entry.cancelled);
}
export function transitionPlayerReadiness(state, input) {
    const no = (reason = 'retired', message) => Object.freeze({ state, accepted: false, reason, message, retire: Object.freeze([]) });
    const set = (readiness, effects = []) => Object.freeze({ state: Object.freeze({ ...state, revision: state.revision + 1, readiness }), accepted: true, id: readiness.pending?.id, retire: Object.freeze([]), readinessEffects: Object.freeze(effects.map(effect => Object.freeze({ ...effect }))) });
    const pending = state.readiness.pending;
    if (input.type === 'readiness.finished')
        return pending?.id === input.id ? set(retirePlayerReadiness(state.readiness)) : no();
    if (input.type === 'readiness.begin') {
        if (state.operations.terminal || input.epoch !== state.operations.epoch || input.operation === null || input.operation !== state.operations.active || input.session === null || !sessionCurrent(state, input.session) || !state.operations.entries.some(entry => entry.id === input.operation && entry.epoch === input.epoch && !entry.cancelled))
            return no();
        if (pending)
            return no('busy', 'Presentation verification is already active');
        if (input.mode !== 'native' && (input.now === undefined || !Number.isFinite(input.now)))
            return no('invalid', 'Presentation verification requires a clock observation');
        const id = state.readiness.serial + 1, deadline = input.mode === 'native' ? null : input.now + 25000;
        return set(Object.freeze({ serial: id, pending: Object.freeze({ id, epoch: input.epoch, operation: input.operation, session: input.session, mode: input.mode, phase: input.mode === 'native' ? 'native' : 'sampling', target: input.target, deadline }) }), [input.mode === 'native' ? { kind: 'readiness.native', ...(input.expected ? { expected: Object.freeze({ ...input.expected }) } : {}) } : { kind: 'readiness.sample', deadline: deadline }]);
    }
    if (!pending || !playerReadinessAuthority(state, input.id))
        return no();
    const advance = (phase, effects = []) => set(Object.freeze({ ...state.readiness, pending: Object.freeze({ ...pending, phase }) }), effects);
    const wait = () => advance('waiting', [{ kind: 'readiness.wait', milliseconds: 25 }]);
    if (input.type === 'readiness.sample') {
        if (pending.phase !== 'sampling' || pending.deadline === null)
            return no();
        if (input.now >= pending.deadline)
            return no('timeout', `${pending.mode} mode did not present the requested position`);
        if (input.failed)
            return no('session-error');
        if (input.boundary !== undefined)
            return no('boundary');
        const facts = input.facts;
        if (!facts)
            return no('invalid', 'Missing presentation observations');
        if (!facts.hasVideo && facts.trackCount > 0 && (!facts.selectedAudio || facts.audioConfigured))
            return advance('finished');
        if (pending.mode === 'hybrid' && facts.unsupportedVideo)
            return no('unsupported', 'Hybrid mode has no external decoder for this video codec. Choose software mode for this source.');
        if (facts.rendered && (pending.mode !== 'hybrid' || facts.decoderCompatible) && !facts.seeking && facts.position !== null && Math.abs(facts.position - pending.target) < .15)
            return advance('confirming', [{ kind: 'readiness.confirm', target: pending.target }]);
        return wait();
    }
    if (input.phase !== pending.phase)
        return no();
    switch (pending.phase) {
        case 'native': return advance('finished');
        case 'confirming': return input.confirmed === false ? wait() : advance('finished');
        case 'waiting': return advance('sampling', [{ kind: 'readiness.sample', deadline: pending.deadline }]);
        case 'sampling':
        case 'finished': return no();
    }
}
