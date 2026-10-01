// SPDX-License-Identifier: Apache-2.0
import { PlayerError } from './errors.js';
import { freeze } from './state.js';
const invalid = (message) => { throw new PlayerError('INVALID_ARGUMENT', `Track policy: ${message}`); };
const object = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
function matcher(value) {
    if (!object(value) || !Object.keys(value).length || Object.keys(value).some(k => !['language', 'title', 'codec', 'streamIndex'].includes(k)))
        return invalid('expected a nonempty track matcher');
    for (const [key, v] of Object.entries(value)) {
        if (key === 'streamIndex') {
            if (!Number.isInteger(v) || Number(v) < 0)
                invalid('streamIndex must be a nonnegative integer');
        }
        else if (typeof v !== 'string' || !v.trim() || v.length > 256)
            invalid(`${key} must be a nonempty string up to 256 characters`);
        if (key === 'language')
            try {
                new Intl.Locale(v);
            }
            catch {
                invalid('invalid language tag');
            }
    }
    return { ...value };
}
export function normalizeTrackPolicy(value = {}) {
    if (!object(value) || Object.keys(value).some(k => !['audio', 'subtitles'].includes(k)))
        return invalid('expected audio/subtitles policies');
    const result = {};
    for (const key of ['audio', 'subtitles']) {
        const rule = value[key];
        if (rule === undefined)
            continue;
        if (!object(rule) || Object.keys(rule).some(k => !['default', 'allowed', 'allowOff', 'allowAuto', 'locked'].includes(k)))
            return invalid(`invalid ${key} policy`);
        const copy = {};
        for (const k of ['allowOff', 'allowAuto', 'locked'])
            if (rule[k] !== undefined) {
                if (typeof rule[k] !== 'boolean')
                    invalid(`${k} must be boolean`);
                copy[k] = rule[k];
            }
        if (rule.allowed !== undefined) {
            if (!Array.isArray(rule.allowed) || rule.allowed.length > 128)
                invalid('allowed must be an array of at most 128 matchers');
            copy.allowed = rule.allowed.map(matcher);
        }
        const d = rule.default;
        if (d !== undefined)
            copy.default = d === 'file' || d === 'off' ? d : Array.isArray(d) ? (d.length && d.length <= 128 ? d.map(matcher) : invalid('default preferences must contain 1–128 matchers')) : matcher(d);
        if (copy.default === 'off' && copy.allowOff === false)
            invalid('default off conflicts with allowOff false');
        result[key] = copy;
    }
    return freeze(result);
}
const names = new Intl.DisplayNames(['en'], { type: 'language' });
function language(value) {
    try {
        return (names.of(new Intl.Locale(value.replaceAll('_', '-')).language) ?? value).toLowerCase();
    }
    catch {
        return value.toLowerCase();
    }
}
export function matchesTrack(track, match) {
    return (match.language === undefined || !!track.language && language(track.language) === language(match.language)) &&
        (match.title === undefined || track.title?.toLowerCase() === match.title.trim().toLowerCase()) &&
        (match.codec === undefined || track.codec?.toLowerCase() === match.codec.trim().toLowerCase()) &&
        (match.streamIndex === undefined || track.streamIndex === match.streamIndex);
}
export function trackAllowed(track, policy) { return policy?.allowed === undefined || policy.allowed.some(m => matchesTrack(track, m)); }
export function defaultTrack(list, policy) {
    if (policy?.default === 'off')
        return null;
    const allowed = list.filter(t => trackAllowed(t, policy));
    const d = policy?.default;
    if (d && d !== 'file')
        for (const match of Array.isArray(d) ? d : [d]) {
            const found = allowed.find(t => matchesTrack(t, match));
            if (found)
                return found;
        }
    const found = allowed.find(t => t.default) ?? allowed.find(t => t.selected) ?? allowed[0];
    if (!found && policy?.allowOff === false)
        throw new PlayerError('UNSUPPORTED_FEATURE', 'Track policy requires a matching track, but none is available');
    return found ?? null;
}
export function assertTrackSelection(policy, id, track) {
    if (policy?.locked)
        throw new PlayerError('UNSUPPORTED_FEATURE', 'Track selection is locked by the host');
    if (id === null && policy?.allowOff === false)
        throw new PlayerError('UNSUPPORTED_FEATURE', 'Turning this track off is not allowed');
    if (id === 'auto' && policy?.allowAuto === false)
        throw new PlayerError('UNSUPPORTED_FEATURE', 'Automatic track selection is not allowed');
    if (track && !trackAllowed(track, policy))
        throw new PlayerError('UNSUPPORTED_FEATURE', 'This track is not allowed by the host');
}
