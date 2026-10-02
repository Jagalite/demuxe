// SPDX-License-Identifier: Apache-2.0
export function initialExternalDecoder() { return Object.freeze({ serial: 0, generation: 0, current: null }); }
export function externalDecoderCurrent(state, lease) { return state.current?.id === lease.id && state.generation === lease.generation; }
/** Reserve the successor before closing a previous browser handle. A close
 * callback can retire this reservation or install a newer one synchronously. */
export function beginExternalDecoderConfiguration(state) {
    const lease = Object.freeze({ id: state.serial + 1, generation: state.generation + 2 });
    return Object.freeze({ state: Object.freeze({ serial: lease.id, generation: lease.generation, current: Object.freeze({ ...lease, phase: 'acquiring' }) }), lease, close: state.current?.id ?? null });
}
export function acceptExternalDecoderConfiguration(state, lease) { return externalDecoderCurrent(state, lease) ? Object.freeze({ ...state, current: Object.freeze({ ...lease, phase: 'configured' }) }) : state; }
export function retireExternalDecoder(state, lease) {
    if (lease && !externalDecoderCurrent(state, lease))
        return Object.freeze({ state, close: null });
    return Object.freeze({ state: Object.freeze({ ...state, generation: state.generation + 1, current: null }), close: state.current?.id ?? null });
}
export function externalDecoderSubmission(state, lease, facts) {
    if (!lease || !externalDecoderCurrent(state, lease) || !facts.present || facts.closed)
        return 'closed';
    return facts.queued >= 8 ? 'again' : 'submit';
}
