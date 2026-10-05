// SPDX-License-Identifier: Apache-2.0
import type { PreviewSamplingContext } from '../types.js';
export type GaussianSampling = Readonly<{
    samples: number;
    every: number;
    radius: number;
    sigma: number;
}>;
export type DirectionalSampling = Readonly<{
    samples: number;
    every: number;
    radius: number;
    lookAhead: number;
}>;
export declare function sampleGaussian(context: PreviewSamplingContext, options: GaussianSampling): readonly number[];
export declare function sampleDirectional(context: PreviewSamplingContext, options: DirectionalSampling): readonly number[];
/** A bounded working set, including resident entries, rather than a stream of misses. */
export declare function sampleDemuxe(context: PreviewSamplingContext): readonly number[];
