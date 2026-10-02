// SPDX-License-Identifier: Apache-2.0
/** Detach and freeze normalized plain DTOs. The shell must remove host objects,
 * accessors and callbacks before invoking selectors; this is not a serializer
 * for arbitrary objects or cyclic graphs. Never freeze the caller's graph. */
export declare function copyData<T>(value: T): T;
