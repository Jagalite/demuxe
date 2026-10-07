// SPDX-License-Identifier: Apache-2.0
import type { Shaka } from './shaka-api.js';
/** Extend the pinned upstream manager so its bandwidth estimation, hysteresis,
 * timers, resize handling, CMSD and teardown retain one owner. */
export declare function switchingAbrFactory(runtime: typeof Shaka, choose: (recommended: Shaka.extern.Variant, variants: readonly Shaka.extern.Variant[], estimate: number) => Readonly<{
    variant: Shaka.extern.Variant;
    urgency: 'buffered' | 'responsive';
}> | null, transition: (variant: Shaka.extern.Variant, urgency: 'buffered' | 'responsive') => Readonly<{
    clearBuffer: boolean;
    safeMargin: number;
}> | null): () => Shaka.abr.SimpleAbrManager;
