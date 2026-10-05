// SPDX-License-Identifier: Apache-2.0
/** Output deadlines only; source loading and media preparation have separate budgets. */
export declare const NATIVE_OUTPUT_TIMEOUT_MS = 2000;
export declare const FIREFOX_LOCAL_RECOVERY_MS = 500;
export type NativeRecoveryFacts = Readonly<{
    firefox?: boolean;
    local: boolean;
    automatic: boolean;
    backendPlan: string | undefined;
    nativeRemux: 'auto' | 'never' | 'always';
    fallbackAvailable: boolean;
}>;
/** Prefer direct playback until output fails. No browser-version blacklist: a
 * healthy upstream fix naturally completes before this recovery deadline. */
export declare function fastLocalRecovery(facts: NativeRecoveryFacts): boolean;
