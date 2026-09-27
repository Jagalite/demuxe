// SPDX-License-Identifier: Apache-2.0
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
