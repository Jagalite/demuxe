// SPDX-License-Identifier: Apache-2.0
/** Legacy source distributions retain their existing discovery behavior. The
 * audited modular core assembler supplies deployment mode and reviewed build
 * identities without adding a Player option or a process-wide registry. */
export const providerDeploymentEnabled: boolean = false;
export const qualifiedProviderIdentities: Readonly<Record<string, string>> = Object.freeze({});
