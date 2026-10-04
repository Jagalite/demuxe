// SPDX-License-Identifier: Apache-2.0
/** Legacy source distributions retain their existing discovery behavior. The
 * audited modular core assembler supplies deployment mode and reviewed build
 * identities without adding a Player option or a process-wide registry. */
export declare const providerDeploymentEnabled: boolean;
export declare const qualifiedProviderIdentities: Readonly<Record<string, string>>;
/** Legacy source builds expect explicitly prepared assets. Beta assembly sets
 * this false when its optional Shaka runtime is deliberately omitted. */
export declare const bundledShakaIncluded: boolean;
