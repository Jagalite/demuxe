// SPDX-License-Identifier: Apache-2.0
import type { BufferingOptions, BufferingPolicy, BufferingResolution } from '../types.js';
export declare function bufferingPolicy(input?: BufferingOptions): BufferingPolicy;
export declare function resolveBuffering(policy: BufferingPolicy, backend: BufferingResolution['backend']): BufferingResolution;
export declare function mpvBufferingOptions(policy: BufferingPolicy, preparing?: boolean): Record<string, string>;
export declare function shakaBufferingOptions(policy: BufferingPolicy, preparing?: boolean): Record<string, number>;
