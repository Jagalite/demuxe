// SPDX-License-Identifier: Apache-2.0
/** Extend the pinned upstream manager so its bandwidth estimation, hysteresis,
 * timers, resize handling, CMSD and teardown retain one owner. */
export function switchingAbrFactory(runtime, choose, transition) {
    return () => new class extends runtime.abr.SimpleAbrManager {
        candidates = [];
        choice = null;
        setVariants(variants, isLowLatency) { this.candidates = [...variants]; return super.setVariants(variants, isLowLatency); }
        chooseVariant(preferFastSwitching) {
            const recommended = super.chooseVariant(preferFastSwitching);
            this.choice = recommended ? choose(recommended, this.candidates, this.getBandwidthEstimate()) : null;
            return this.choice?.variant ?? null;
        }
        init(callback, disable) {
            super.init(variant => {
                const settings = transition(variant, this.choice?.variant === variant ? this.choice.urgency : 'buffered');
                if (settings)
                    callback(variant, settings.clearBuffer, settings.safeMargin);
            }, disable);
        }
        stop() { this.candidates = []; this.choice = null; super.stop(); }
        release() { this.candidates = []; this.choice = null; super.release(); }
    }();
}
