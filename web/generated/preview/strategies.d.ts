// SPDX-License-Identifier: Apache-2.0
import type { PreviewStrategy, PreviewPregeneration } from '../types.js';
import type { AdaptivePregeneration } from './pregeneration.js';
export declare function resolvePreviewStrategy(value: PreviewStrategy): {
    strategy: PreviewStrategy;
    generation?: PreviewPregeneration | AdaptivePregeneration;
};
