// SPDX-License-Identifier: Apache-2.0
import { sampleGaussian, sampleDirectional, sampleDemuxe } from './samplers.js';
export function resolvePreviewStrategy(value) {
    if (!value || typeof value !== 'object')
        throw new TypeError('Invalid preview strategy');
    switch (value.type) {
        case 'demuxe': return { strategy: Object.freeze({ type: 'demuxe' }), generation: { strategy: 'custom', intervalMs: 100 }, sample: sampleDemuxe };
        case 'custom':
            if (typeof value.sample !== 'function')
                throw new TypeError('Invalid preview sampler');
            return { strategy: Object.freeze({ type: 'custom', sample: value.sample }), generation: { strategy: 'custom' }, sample: value.sample };
        case 'gaussian':
        case 'directional': {
            const samples = value.samples ?? 25, every = value.every ?? 1, radius = value.radius ?? 30;
            if (!Number.isInteger(samples) || samples < 1 || samples > 256 || !Number.isFinite(every) || every <= 0 || !Number.isFinite(radius) || radius < 0 || radius > 3600 || radius / every > 2048)
                throw new RangeError('Invalid preview sampling limits');
            if (value.type === 'gaussian') {
                const sigma = value.sigma ?? 10;
                if (!Number.isFinite(sigma) || sigma <= 0 || sigma > 3600)
                    throw new RangeError('Invalid preview sigma');
                const strategy = Object.freeze({ type: 'gaussian', samples, every, radius, sigma });
                return { strategy, generation: { strategy: 'custom' }, sample: context => sampleGaussian(context, strategy) };
            }
            const lookAhead = value.lookAhead ?? .5;
            if (!Number.isFinite(lookAhead) || lookAhead < 0 || lookAhead > 5)
                throw new RangeError('Invalid preview look-ahead');
            const strategy = Object.freeze({ type: 'directional', samples, every, radius, lookAhead });
            return { strategy, generation: { strategy: 'custom' }, sample: context => sampleDirectional(context, strategy) };
        }
        case 'on-demand': return { strategy: Object.freeze({ type: 'on-demand' }) };
        case 'uniform': {
            const samples = value.samples ?? 48;
            return { strategy: Object.freeze({ type: 'uniform', samples }), generation: { samples } };
        }
        case 'interval': {
            const every = value.every ?? 5, unit = value.unit ?? 'seconds', count = value.count;
            return { strategy: Object.freeze({ type: 'interval', every, unit, count }), generation: { every, unit, count } };
        }
        case 'adaptive': {
            const samples = value.samples ?? 24, every = value.every ?? 5, radius = value.radius ?? 30;
            return { strategy: Object.freeze({ type: 'adaptive', samples, every, radius }), generation: { strategy: 'adaptive', samples, every, radius } };
        }
        case 'timestamps': {
            if (!Array.isArray(value.timestamps))
                throw new TypeError('Invalid preview timestamps');
            const timestamps = Object.freeze([...value.timestamps]), count = value.count;
            return { strategy: Object.freeze({ type: 'timestamps', timestamps, count }), generation: { timestamps, count } };
        }
        default: throw new TypeError('Unknown preview strategy');
    }
}
