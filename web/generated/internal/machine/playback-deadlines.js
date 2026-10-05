// SPDX-License-Identifier: Apache-2.0
/** Output deadlines only; source loading and media preparation have separate budgets. */
export const NATIVE_OUTPUT_TIMEOUT_MS = 2000;
export const FIREFOX_LOCAL_RECOVERY_MS = 500;
/** Prefer direct playback until output fails. No browser-version blacklist: a
 * healthy upstream fix naturally completes before this recovery deadline. */
export function fastLocalRecovery(facts) {
    return facts.firefox === true && facts.local && facts.automatic && facts.nativeRemux !== 'never' && facts.fallbackAvailable && ['direct', 'direct-mpv'].includes(facts.backendPlan ?? '');
}
