import type { PlayerOptions, RemuxRuntimePolicy } from '../types.js';
export declare function selectRemuxRuntime(options: Pick<PlayerOptions, 'remuxRuntime' | 'experimentalRemuxRuntime'>, capabilities?: {
    isolated: boolean;
    jspi: boolean;
}): {
    isolated: boolean;
    jspi: boolean;
    policy: RemuxRuntimePolicy;
    runtime: "jspi" | "asyncify" | "pthread";
};
/** Deployment filters runtime implementations, never playback-plan order.
 * Explicit policies remain pinned. Absence preserves the original choice so
 * normal plan rejection can report the missing provider requirement. */
export declare function deployedRemuxRuntime(selection: ReturnType<typeof selectRemuxRuntime>, available: (runtime: 'pthread' | 'jspi' | 'asyncify') => boolean): {
    isolated: boolean;
    jspi: boolean;
    policy: RemuxRuntimePolicy;
    runtime: "jspi" | "asyncify" | "pthread";
};
