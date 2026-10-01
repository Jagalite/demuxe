// SPDX-License-Identifier: Apache-2.0
import { EXECUTION_CAPABILITIES } from './execution-capabilities.js';
function object(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw Error('Expected deployment object');
    return value;
}
function text(value) {
    if (typeof value !== 'string' || !value.length || value.length > 512)
        throw Error('Invalid deployment identifier');
    return value;
}
function identifier(value) {
    const id = text(value);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._:/@+-]*$/.test(id))
        throw Error('Invalid deployment identifier characters');
    return id;
}
function packageName(value) {
    const name = text(value);
    if (!/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(name))
        throw Error('Invalid provider package name');
    return name;
}
function list(value, limit = 256) {
    if (!Array.isArray(value) || value.length > limit)
        throw Error('Invalid deployment list');
    return value;
}
function choice(value, choices) {
    if (typeof value !== 'string' || !choices.includes(value))
        throw Error('Unknown deployment enum value');
    return value;
}
function capability(value) {
    const input = object(value), id = text(input.capability);
    if (!Object.prototype.hasOwnProperty.call(EXECUTION_CAPABILITIES, id))
        throw Error('Unknown deployed capability');
    const descriptor = EXECUTION_CAPABILITIES[id];
    const profile = text(input.profile);
    if (input.version !== descriptor.version || !descriptor.profiles.includes(profile))
        throw Error('Unsupported deployed capability contract/profile');
    return Object.freeze({ capability: id, version: input.version, profile });
}
/** Parse configuration only. No fetches, native probes or module initialization.
 * Declared hashes are acquisition expectations, not verified bytes. A deployed
 * provider starts configured-unverified; only the current acquisition/probe
 * owner can supply availability. Packages never supply qualification here.
 */
export function parseProviderDeployment(value, assetBase) {
    const input = object(value);
    if (input.schema !== 1)
        throw Error('Unsupported provider deployment schema');
    if (input.providerContractVersion !== 1)
        throw Error('Incompatible provider contract version');
    if (!['http:', 'https:'].includes(assetBase.protocol) || assetBase.username || assetBase.password || assetBase.search || assetBase.hash || !assetBase.pathname.endsWith('/'))
        throw Error('Invalid provider asset base');
    const revision = identifier(input.revision);
    const assets = new Map();
    for (const value of list(input.assets)) {
        const item = object(value), id = identifier(item.id), path = text(item.path);
        if (assets.has(id))
            throw Error('Duplicate deployment asset');
        if (path.split('/').some(part => !part || part === '.' || part === '..' || !/^[a-zA-Z0-9_.-]+$/.test(part)))
            throw Error('Invalid provider asset path');
        const digest = text(item.sha256);
        if (!/^[a-f0-9]{64}$/.test(digest))
            throw Error('Invalid provider asset hash');
        if (typeof item.bytes !== 'number' || !Number.isSafeInteger(item.bytes) || item.bytes < 0 || item.bytes > 512 * 1024 * 1024)
            throw Error('Invalid provider asset size');
        const dependencies = list(item.dependencies ?? [], 64).map(identifier);
        assets.set(id, Object.freeze({ id, url: new URL(path, assetBase).href, sha256: digest, bytes: item.bytes, dependencies: Object.freeze(dependencies) }));
    }
    const closures = new Map();
    const visiting = new Set();
    function closure(id) {
        const existing = closures.get(id);
        if (existing)
            return existing;
        const asset = assets.get(id);
        if (!asset)
            throw Error('Undeployed provider asset dependency: ' + id);
        if (visiting.has(id))
            throw Error('Cyclic provider asset dependency: ' + id);
        visiting.add(id);
        const result = Object.freeze([...new Set([...asset.dependencies.flatMap(dependency => closure(dependency)), id])]);
        visiting.delete(id);
        closures.set(id, result);
        return result;
    }
    for (const id of assets.keys())
        closure(id);
    const providers = [], ids = new Set();
    const providerAssets = Object.create(null);
    for (const value of list(input.providers)) {
        const item = object(value), id = identifier(item.id);
        if (ids.has(id))
            throw Error('Duplicate configured provider');
        ids.add(id);
        const technology = choice(item.technology, ['browser-native', 'javascript', 'wasm', 'mixed']);
        const delivery = list(item.delivery, 3).map(v => choice(v, ['browser', 'application-bundle', 'optional-assets']));
        if (!delivery.length || new Set(delivery).size !== delivery.length)
            throw Error('Invalid provider delivery declaration');
        const offers = list(item.offers, 64).map(capability);
        if (!offers.length)
            throw Error('Provider declares no capability');
        const declaredAssets = list(item.assetIds ?? [], 64).map(identifier);
        if (delivery.includes('optional-assets') && !declaredAssets.length)
            throw Error('Optional provider assets are not declared');
        if (declaredAssets.length && !delivery.includes('optional-assets'))
            throw Error('Provider assets require optional-assets delivery');
        // Included JS is bound to an actual application build, not presumed present
        // because its source dependency appears in this monorepo.
        const applicationBuild = delivery.includes('application-bundle') ? identifier(item.applicationBuild) : undefined;
        if (technology === 'browser-native' && !delivery.includes('browser'))
            throw Error('Native provider must declare browser delivery');
        providerAssets[id] = Object.freeze([...new Set(declaredAssets.flatMap(id => closure(id)))]);
        providers.push(Object.freeze({ id, implementationIdentity: identifier(item.implementationIdentity), technology,
            delivery: Object.freeze(delivery), offers: Object.freeze(offers), availability: Object.freeze({ state: 'configured-unverified' }),
            ...(applicationBuild === undefined ? {} : { applicationBuild }),
            ...(item.packageName === undefined ? {} : { packageName: packageName(item.packageName) }) }));
    }
    return Object.freeze({ catalog: Object.freeze({ revision, providers: Object.freeze(providers) }),
        assets: Object.freeze([...assets.values()]), providerAssets: Object.freeze(providerAssets) });
}
/** Immutable update from a loader/probe owner. Reject stale or cross-build
 * observations rather than transferring availability to another implementation.
 */
export function withProviderAvailability(catalog, revision, updates) {
    if (revision !== catalog.revision)
        throw Error('Stale deployment availability observation');
    const facts = new Map();
    for (const update of updates) {
        if (facts.has(update.id) || !catalog.providers.some(p => p.id === update.id && p.implementationIdentity === update.implementationIdentity))
            throw Error('Unknown or mismatched provider observation');
        facts.set(update.id, update);
    }
    return Object.freeze({ revision, providers: Object.freeze(catalog.providers.map(provider => {
            const update = facts.get(provider.id);
            return update ? Object.freeze({ ...provider, availability: Object.freeze({ ...update.availability }) }) : provider;
        })) });
}
