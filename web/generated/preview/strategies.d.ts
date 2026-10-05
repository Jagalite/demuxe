// SPDX-License-Identifier: Apache-2.0
import type { PreviewStrategy, PreviewPregeneration, PreviewSampler } from '../types.js';
import type { AdaptivePregeneration, CustomPregeneration } from './pregeneration.js';
export declare function resolvePreviewStrategy(value: PreviewStrategy): {
    strategy: PreviewStrategy;
    generation?: PreviewPregeneration | AdaptivePregeneration | CustomPregeneration;
    sample?: PreviewSampler;
};
