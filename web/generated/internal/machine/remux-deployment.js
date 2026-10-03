// SPDX-License-Identifier: Apache-2.0
export function initialRemuxDeployment(selection = null) { return Object.freeze({ revision: 0, selection: selection ? Object.freeze({ ...selection }) : null }); }
/** Explicit policies are pinned and do not invoke deployment probes. */
export function remuxDeploymentCandidates(selection) { return Object.freeze(!['auto', 'on'].includes(selection.policy) ? [] : (selection.policy === 'auto' && selection.isolated ? ['pthread', 'jspi', 'asyncify'] : ['jspi', 'asyncify']).filter(runtime => runtime !== 'jspi' || selection.jspi)); }
export function resolveRemuxDeployment(selection, available) {
    const runtime = remuxDeploymentCandidates(selection).find(runtime => available[runtime]) ?? selection.runtime;
    return Object.freeze({ ...selection, runtime });
}
export function transitionRemuxDeployment(state, change) {
    if (state.revision >= Number.MAX_SAFE_INTEGER)
        return state;
    if (change.kind === 'configure')
        return state.selection ? state : Object.freeze({ revision: state.revision + 1, selection: Object.freeze({ ...change.selection }) });
    if (!state.selection || change.revision !== state.revision)
        return state;
    return Object.freeze({ revision: state.revision + 1, selection: resolveRemuxDeployment(state.selection, change.available) });
}
