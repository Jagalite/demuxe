// SPDX-License-Identifier: Apache-2.0
export function matchesPolicyTrack(track, match) {
    return (match.language === undefined || !!track.language && track.language === match.language) &&
        (match.title === undefined || track.title?.toLowerCase() === match.title.trim().toLowerCase()) &&
        (match.codec === undefined || track.codec?.toLowerCase() === match.codec.trim().toLowerCase()) &&
        (match.streamIndex === undefined || track.streamIndex === match.streamIndex);
}
export function policyTrackAllowed(track, policy) { return policy?.allowed === undefined || policy.allowed.some(match => matchesPolicyTrack(track, match)); }
export function preferredTrackIndex(list, policy) {
    if (policy?.default === 'off')
        return Object.freeze({ index: -1 });
    const allowed = list.flatMap((track, index) => policyTrackAllowed(track, policy) ? [index] : []), preference = policy?.default;
    if (preference && preference !== 'file')
        for (const match of Array.isArray(preference) ? preference : [preference]) {
            const found = allowed.find(index => matchesPolicyTrack(list[index], match));
            if (found !== undefined)
                return Object.freeze({ index: found });
        }
    const index = allowed.find(index => list[index].default) ?? allowed.find(index => list[index].selected) ?? allowed[0] ?? -1;
    return Object.freeze({ index, ...(index < 0 && policy?.allowOff === false ? { rejection: 'Track policy requires a matching track, but none is available' } : {}) });
}
export function trackSelectionRejection(policy, id, track) {
    if (policy?.locked)
        return 'Track selection is locked by the host';
    if (id === null && policy?.allowOff === false)
        return 'Turning this track off is not allowed';
    if (id === 'auto' && policy?.allowAuto === false)
        return 'Automatic track selection is not allowed';
    if (track && !policyTrackAllowed(track, policy))
        return 'This track is not allowed by the host';
}
