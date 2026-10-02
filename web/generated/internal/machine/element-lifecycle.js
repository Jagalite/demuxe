// SPDX-License-Identifier: Apache-2.0
export function initialElementLifecycle() {
    return Object.freeze({ terminal: false, connection: 0, source: 0, attributeScheduled: false });
}
export function transitionElementLifecycle(state, command) {
    switch (command.type) {
        case 'connect':
        case 'disconnect': return Object.freeze({ state: Object.freeze({ ...state, connection: state.connection + 1 }), accepted: !state.terminal, connection: state.connection + 1 });
        case 'connect-ready': return Object.freeze({ state, accepted: !state.terminal && command.connected && command.connection === state.connection });
        case 'owner-ready': return Object.freeze({ state, accepted: !state.terminal && command.connected && command.sameOwner });
        case 'disconnect-ready': {
            const accepted = !state.terminal && !command.connected && command.connection === state.connection;
            return Object.freeze({ state: accepted ? Object.freeze({ ...state, source: state.source + 1 }) : state, accepted });
        }
        case 'source-start': return state.terminal ? Object.freeze({ state, accepted: false }) : Object.freeze({ state: Object.freeze({ ...state, source: state.source + 1 }), accepted: true, source: state.source + 1 });
        case 'source-retire': return Object.freeze({ state: Object.freeze({ ...state, source: state.source + 1 }), accepted: true });
        case 'destroy': return state.terminal ? Object.freeze({ state, accepted: false }) : Object.freeze({ state: Object.freeze({ ...state, terminal: true, connection: state.connection + 1, source: state.source + 1 }), accepted: true });
        case 'schedule-attribute': return state.attributeScheduled ? Object.freeze({ state, accepted: false }) : Object.freeze({ state: Object.freeze({ ...state, attributeScheduled: true }), accepted: true });
        case 'flush-attribute': return Object.freeze({ state: Object.freeze({ ...state, attributeScheduled: false }), accepted: command.hasOwner && !state.terminal });
    }
}
export function elementSourceCurrent(state, source, facts) {
    return !state.terminal && source === state.source && !facts.aborted && facts.sameOwner;
}
export function initialMediaElementBinding() { return Object.freeze({ generation: 0, bound: false, connection: 0 }); }
export function transitionMediaElementBinding(state, command) {
    switch (command.type) {
        case 'bind': return state.bound ? Object.freeze({ state, accepted: false }) : Object.freeze({ state: Object.freeze({ ...state, generation: state.generation + 1, bound: true }), accepted: true });
        case 'dispose': return Object.freeze({ state: state.bound ? Object.freeze({ ...state, generation: state.generation + 1, bound: false }) : state, accepted: state.bound });
        case 'connect':
        case 'disconnect': return Object.freeze({ state: Object.freeze({ ...state, connection: state.connection + 1 }), accepted: true });
        case 'disconnect-ready': return Object.freeze({ state, accepted: !command.connected && command.connection === state.connection });
    }
}
export function mediaElementBindingCurrent(state, generation) { return state.bound && state.generation === generation; }
