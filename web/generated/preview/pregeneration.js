// SPDX-License-Identifier: Apache-2.0
import { createPregeneration, transitionPregeneration } from '../internal/machine/preview-pregeneration.js';
/** Owns only a timer and provider callback; scheduling authority is immutable. */
export class PreviewPregenerator {
    run;
    timer;
    state;
    constructor(config, bucket, run) {
        this.run = run;
        this.state = createPregeneration(config, bucket);
    }
    setDuration(duration) { this.dispatch({ kind: 'duration', duration }); }
    setEnabled(enabled) { this.dispatch({ kind: 'enabled', enabled }); }
    setFocus(time) { this.dispatch({ kind: 'focus', time }); }
    reset() { this.dispatch({ kind: 'reset' }); }
    stop() { this.dispatch({ kind: 'stop' }); }
    dispatch(event) {
        const next = transitionPregeneration(this.state, event);
        this.state = next.state;
        for (const effect of next.effects) {
            if (effect.kind === 'cancel-timer') {
                if (this.timer?.id === effect.id) {
                    const timer = this.timer;
                    this.timer = undefined;
                    clearTimeout(timer.handle);
                }
            }
            else if (effect.kind === 'schedule') {
                if (this.state.timer !== effect.id)
                    continue;
                const timer = { id: effect.id };
                this.timer = timer;
                try {
                    const acquired = setTimeout(() => { if (this.timer !== timer || this.state.timer !== effect.id)
                        return; this.timer = undefined; this.dispatch({ kind: 'timer', id: effect.id }); }, effect.delayMs);
                    timer.handle = acquired;
                    if (this.timer !== timer || this.state.timer !== effect.id)
                        clearTimeout(acquired);
                }
                catch (error) {
                    if (this.timer === timer)
                        this.timer = undefined;
                    if (this.state.timer === effect.id)
                        this.dispatch({ kind: 'stop' });
                    throw error;
                }
            }
            else {
                if (this.state.running?.id !== effect.id)
                    continue;
                let completion;
                try {
                    completion = this.run(effect.request);
                }
                catch {
                    this.dispatch({ kind: 'completed', id: effect.id, outcome: 'next' });
                    continue;
                }
                void Promise.resolve(completion).then(outcome => this.dispatch({ kind: 'completed', id: effect.id, outcome }), () => this.dispatch({ kind: 'completed', id: effect.id, outcome: 'next' }));
            }
        }
    }
}
