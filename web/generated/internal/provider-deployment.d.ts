// SPDX-License-Identifier: Apache-2.0
import type { ParsedProviderDeployment } from './provider-catalog.js';
import type { RuntimeProvider } from './machine/provider-runtime.js';
/** Observe the declared asset closure independently of qualification. */
export declare function identifyDeployment(deployment: ParsedProviderDeployment, base: URL): Promise<readonly RuntimeProvider[]>;
/** Additive publication: no active session can observe an asset or ABI replaced
 * underneath it. Different deployments can reuse identical declarations. */
export declare function mergeDeployments(current: ParsedProviderDeployment, incoming: ParsedProviderDeployment, revision: string): ParsedProviderDeployment;
