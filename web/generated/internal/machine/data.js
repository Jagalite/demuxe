// SPDX-License-Identifier: Apache-2.0
/** Detach and freeze normalized plain DTOs. The shell must remove host objects,
 * accessors and callbacks before invoking selectors; this is not a serializer
 * for arbitrary objects or cyclic graphs. Never freeze the caller's graph. */
export function copyData(value) {
    const copies = new Map();
    const copy = (item) => {
        if (item === null || typeof item !== 'object')
            return item;
        if (copies.has(item))
            return copies.get(item);
        const result = Array.isArray(item) ? item.map(copy) : Object.fromEntries(Object.entries(item).map(([key, child]) => [key, copy(child)]));
        copies.set(item, result);
        return Object.freeze(result);
    };
    return copy(value);
}
