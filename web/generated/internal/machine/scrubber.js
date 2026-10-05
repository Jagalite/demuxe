// SPDX-License-Identifier: Apache-2.0
export function initialScrubber() { return Object.freeze({ terminal: false, hover: 0, serial: 0, nextResource: 1, nextPresentation: 1, pending: null, generation: null, presentation: null, displayedImage: null, visible: false }); }
function clear(state) {
    return Object.freeze({ state: Object.freeze({ ...state, presentation: null, displayedImage: null, visible: false }), accepted: true, clear: true, abortPresentation: state.presentation?.id });
}
export function transitionScrubber(state, command) {
    if (command.type === 'allocate') {
        const id = state.nextResource;
        return Object.freeze({ state: Object.freeze({ ...state, nextResource: id + 1 }), id });
    }
    if (command.type === 'hide' || command.type === 'destroy') {
        const result = clear(state);
        return Object.freeze({ ...result, state: Object.freeze({ ...result.state, terminal: state.terminal || command.type === 'destroy', hover: state.hover + 1, serial: state.serial + 1, pending: null, generation: null }), abortGeneration: state.generation?.id });
    }
    if (state.terminal)
        return Object.freeze({ state, accepted: false });
    switch (command.type) {
        case 'hover': return Object.freeze({ state: Object.freeze({ ...state, hover: state.hover + 1, visible: true }), id: state.hover + 1, placeholder: !state.visible });
        case 'cache': {
            if (command.hover !== state.hover)
                return Object.freeze({ state, accepted: false });
            const pending = !command.defer && (!command.hit || command.refine) ? Object.freeze({ ...command.target }) : null;
            return Object.freeze({ state: Object.freeze({ ...state, serial: state.serial + (command.hit ? 1 : 0), pending }), accepted: true, show: command.hit });
        }
        case 'generate': {
            if (state.generation || !state.pending)
                return Object.freeze({ state, accepted: false });
            const generation = Object.freeze({ ...state.pending, id: state.serial + 1 });
            return Object.freeze({ state: Object.freeze({ ...state, serial: generation.id, generation, pending: null }), accepted: true, generate: generation });
        }
        case 'generated': return command.aborted || state.generation?.id !== command.id || state.serial !== command.id ? Object.freeze({ state, accepted: false }) : Object.freeze({ state, accepted: true, show: command.hasFrame, clear: !command.hasFrame });
        case 'generation-finished': return state.generation?.id === command.id ? Object.freeze({ state: Object.freeze({ ...state, generation: null }), accepted: true }) : Object.freeze({ state, accepted: false });
        case 'show': {
            if (state.presentation?.image === command.image)
                return Object.freeze({ state, accepted: false });
            const id = state.nextPresentation;
            return Object.freeze({ state: Object.freeze({ ...state, nextPresentation: id + 1, presentation: Object.freeze({ id, image: command.image }) }), accepted: true, presentation: Object.freeze({ id, needsImage: state.displayedImage !== command.image }), abortPresentation: state.presentation?.id });
        }
        case 'clear': return clear(state);
        case 'decoded': return state.presentation?.id === command.id ? Object.freeze({ state: Object.freeze({ ...state, displayedImage: state.presentation.image }), accepted: true }) : Object.freeze({ state, accepted: false });
        case 'presented': return state.presentation?.id === command.id ? Object.freeze({ state: Object.freeze({ ...state, visible: true }), accepted: true }) : Object.freeze({ state, accepted: false });
        case 'presentation-finished': return state.presentation?.id === command.id ? Object.freeze({ state: Object.freeze({ ...state, presentation: null }), accepted: true }) : Object.freeze({ state, accepted: false });
        case 'presentation-failed':
        case 'deadline': return state.presentation?.id === command.id ? clear(state) : Object.freeze({ state, accepted: false });
    }
}
export function scrubberDistance(strategy, span, generation = false) {
    if (strategy?.type === 'demuxe')
        return generation ? 0 : span;
    if (generation && strategy?.type === 'adaptive')
        return (strategy.every ?? 5) / 2 + 1;
    if (strategy?.type === 'interval')
        return (strategy.every ?? 5) * (strategy.unit === 'minutes' ? 60 : 1) / 2 + 1;
    if (strategy?.type === 'adaptive' || strategy?.type === 'uniform')
        return span / (2 * (strategy.samples ?? (strategy.type === 'adaptive' ? 24 : 48))) + 1;
    return strategy ? 1 : span / 96 + 1;
}
export function scrubberPointer(facts) {
    if (facts.touch || facts.disabled)
        return Object.freeze({ hide: true });
    if (!facts.width || facts.max <= facts.min)
        return Object.freeze({ hide: false });
    // Native range values follow the thumb's centre, whose travel excludes its width.
    const thumb = Math.max(0, Math.min(facts.width, facts.thumbWidth ?? 0)), travel = facts.width - thumb;
    if (travel <= 0)
        return Object.freeze({ hide: false });
    const fraction = Math.max(0, Math.min(1, (facts.x - facts.left - thumb / 2) / travel)), half = Math.min(120, facts.parentWidth / 2), span = facts.max - facts.min;
    const step = facts.step ?? 0, offset = step > 0 ? Math.min(Math.round(fraction * span / step), Math.floor(span / step + 1e-9)) * step : fraction * span;
    const time = Number((facts.min + offset).toPrecision(12));
    return Object.freeze({ hide: false, time, left: Math.max(half, Math.min(facts.parentWidth - half, facts.x - facts.parentLeft)) });
}
