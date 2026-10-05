// SPDX-License-Identifier: Apache-2.0
/** Shared deterministic storyboard identity for sampling and bounded retention. */
export function demuxeStoryboard(duration, capacity, bucketSeconds) {
    if (!Number.isFinite(duration) || duration <= 0)
        return [];
    const count = Math.min(24, Math.floor(capacity / 3));
    const reverse = (n) => { let value = 0; for (let i = 0; i < 5; i++) {
        value = value * 2 + n % 2;
        n = Math.floor(n / 2);
    } return value; };
    const times = Array.from({ length: count }, (_, i) => i).sort((a, b) => reverse(a) - reverse(b)).map(i => {
        const time = (i + .5) * duration / count;
        return bucketSeconds ? Math.floor(time / bucketSeconds) * bucketSeconds : time;
    });
    return [...new Set(times)];
}
