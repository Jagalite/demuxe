// SPDX-License-Identifier: Apache-2.0
import type { BufferingOptions, BufferingPolicy } from '../types.js';
export declare function bufferingPolicy(input?: BufferingOptions): BufferingPolicy;
export { resolveBuffering, mpvBufferingOptions, shakaBufferingOptions } from './machine/buffering-policy.js';
