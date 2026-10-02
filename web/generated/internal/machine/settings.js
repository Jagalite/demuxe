// SPDX-License-Identifier: Apache-2.0
import { copyData } from './data.js';
import { decideTrackSelection, decideSubtitleVisibility } from './track-selection.js';
import { rangeRequirement } from './playback-boundary.js';
import { featureRejection } from './playback-plans.js';
export function initialSettings() { return Object.freeze({ pause: true, volume: 100, speed: 1, aid: 'auto', sid: 'auto', subtitles: true, vf: '', af: '', gain: 1 }); }
export function transitionSettings(state, input) { return Object.freeze(input.type === 'settings.accept' ? { ...input.value } : { ...state, ...input.value }); }
export function initialPreferences() { return Object.freeze({ publicSelections: Object.freeze({}), muted: false, outputDeviceId: '', buffering: Object.freeze({ preload: 'auto', profile: 'balanced' }), toneMapping: 'off', subtitleDelay: 0, audioDelay: 0, subtitleStyle: Object.freeze({}), playbackRange: null, loopPolicy: false, qualityPolicy: null }); }
export function effectiveVideoFilters(settings, preferences) {
    const tone = preferences.toneMapping === 'hdr-to-sdr' ? 'zscale=transfer=linear:npl=100,format=gbrpf32le,zscale=primaries=bt709,tonemap=tonemap=mobius:desat=0,zscale=transfer=bt709:matrix=bt709:range=limited,format=yuv420p' : '';
    return [tone ? `lavfi=[${tone}]` : '', settings.vf].filter(Boolean).join(',');
}
export function changePreferences(state, value) { return copyData({ ...state, ...value }); }
export function clearSourcePreferences(state) { return Object.freeze({ ...state, publicSelections: Object.freeze({}), playbackRange: null, loopPolicy: false, qualityPolicy: null }); }
export function initialSettingsTransactions() { return Object.freeze({ serial: 0, pending: null, degraded: null }); }
export function settingAuthority(state, id) {
    const pending = state.settingsTransactions.pending, operation = state.operations.entries.find(entry => entry.id === state.operations.active);
    return !!pending && pending.id === id && !state.operations.terminal && pending.epoch === state.operations.epoch && pending.session === state.source.acceptedSession && operation?.id === pending.operation && !operation.cancelled && operation.phase === 'active';
}
export function transitionSettingTransaction(state, input) {
    const empty = Object.freeze([]);
    const result = (next, accepted, id, effects = empty, message, rejection = 'unsupported') => Object.freeze({ state: next === state ? state : Object.freeze({ ...next, revision: state.revision + 1 }), accepted, id, effects, message, reason: accepted ? undefined : message ? rejection : 'retired', retire: Object.freeze([]) });
    if (input.type === 'preferences.change')
        return result({ ...state, preferences: changePreferences(state.preferences, input.value) }, true);
    if (input.type === 'setting.begin') {
        const operation = state.operations.entries.find(entry => entry.id === state.operations.active);
        if (state.operations.terminal || !operation || operation.cancelled || operation.epoch !== state.operations.epoch || state.settingsTransactions.pending)
            return result(state, false);
        let settings = state.settings, preferences = state.preferences, effect, rollback, reconfigure = false, promote = false, noop = false, mode, selection, verifyTrack;
        const command = input.command;
        const context = { sourceId: state.source.serial, session: state.source.acceptedSession, mode: state.source.mode, automatic: state.source.automatic, hasSource: !!input.hasSource, hasBackend: input.hasBackend };
        switch (command.kind) {
            case 'publicTrack': {
                selection = decideTrackSelection(settings, context, command.track, command.id, command.facts);
                if (selection.rejection)
                    return result(state, false, undefined, empty, selection.rejection.message, selection.rejection.reason);
                noop = selection.action === 'none' || selection.action === 'remember';
                if (selection.action !== 'none') {
                    const publicSelections = { ...preferences.publicSelections };
                    if (selection.key === null)
                        delete publicSelections[command.track];
                    else
                        publicSelections[command.track] = selection.key;
                    preferences = changePreferences(preferences, { publicSelections });
                }
                if (!noop)
                    settings = Object.freeze({ ...settings, [command.track === 'audio' ? 'aid' : 'sid']: selection.value });
                reconfigure = selection.action === 'select' || selection.action === 'replace';
                promote = selection.action === 'direct';
                effect = selection.action === 'select' ? { kind: 'source.reconfigure', settings } : selection.action === 'replace' ? { kind: 'source.replace', settings, mode: state.source.mode } : { kind: 'track', track: command.track, value: selection.value };
                rollback = { kind: 'track', track: command.track, value: state.settings[command.track === 'audio' ? 'aid' : 'sid'] };
                if (selection.action === 'direct')
                    verifyTrack = command.track;
                break;
            }
            case 'visibility': {
                const visibility = decideSubtitleVisibility(settings, context, command.value, command.facts);
                if (visibility.rejection)
                    return result(state, false, undefined, empty, visibility.rejection);
                noop = visibility.action === 'none';
                reconfigure = visibility.action === 'select';
                promote = visibility.promote;
                settings = Object.freeze({ ...settings, subtitles: command.value });
                effect = reconfigure ? { kind: 'source.reconfigure', settings } : { kind: 'subtitles', value: command.value };
                rollback = { kind: 'subtitles', value: state.settings.subtitles };
                break;
            }
            case 'range':
            case 'loop': {
                const requirement = rangeRequirement(command.kind, command.value, preferences.playbackRange, preferences.loopPolicy, command.facts);
                if (requirement.rejection)
                    return result(state, false, undefined, empty, requirement.rejection.message, requirement.rejection.reason);
                preferences = changePreferences(preferences, command.kind === 'range' ? { playbackRange: command.value } : { loopPolicy: command.value });
                noop = requirement.seek === undefined;
                effect = { kind: 'seek', value: requirement.seek ?? command.facts.time };
                rollback = { kind: 'seek', value: command.facts.time };
                break;
            }
            case 'volume':
                settings = Object.freeze({ ...settings, volume: command.value });
                effect = { kind: 'volume', value: preferences.muted ? 0 : command.value };
                rollback = { kind: 'volume', value: preferences.muted ? 0 : state.settings.volume };
                break;
            case 'mute':
                preferences = changePreferences(preferences, { muted: command.value });
                effect = { kind: 'volume', value: command.value ? 0 : settings.volume };
                rollback = { kind: 'volume', value: state.preferences.muted ? 0 : settings.volume };
                break;
            case 'rate':
                settings = Object.freeze({ ...settings, speed: command.value });
                effect = command;
                rollback = { kind: 'rate', value: state.settings.speed };
                break;
            case 'gain':
                settings = Object.freeze({ ...settings, gain: command.value });
                effect = command;
                rollback = { kind: 'gain', value: state.settings.gain };
                break;
            case 'pause':
                settings = Object.freeze({ ...settings, pause: true });
                effect = { kind: 'pause' };
                rollback = { kind: state.settings.pause ? 'pause' : 'play' };
                break;
            case 'track':
                if (command.clearPublicSelection) {
                    const publicSelections = { ...preferences.publicSelections };
                    delete publicSelections[command.track];
                    preferences = changePreferences(preferences, { publicSelections });
                    promote = true;
                }
                if (command.verify)
                    verifyTrack = command.track;
                settings = Object.freeze({ ...settings, [command.track === 'audio' ? 'aid' : 'sid']: command.value });
                effect = command;
                rollback = { kind: 'track', track: command.track, value: state.settings[command.track === 'audio' ? 'aid' : 'sid'] };
                break;
            case 'subtitles':
                settings = Object.freeze({ ...settings, subtitles: command.value });
                effect = { kind: 'subtitles', value: command.value };
                rollback = { kind: 'subtitles', value: state.settings.subtitles };
                break;
            case 'buffering':
                preferences = changePreferences(preferences, { buffering: command.value });
                effect = { kind: 'buffering', value: preferences.buffering };
                rollback = { kind: 'buffering', value: state.preferences.buffering };
                break;
            case 'output':
                preferences = changePreferences(preferences, { outputDeviceId: command.value });
                effect = command;
                rollback = { kind: 'output', value: state.preferences.outputDeviceId };
                break;
            case 'quality':
                preferences = changePreferences(preferences, { qualityPolicy: command.value });
                effect = { kind: 'quality', value: preferences.qualityPolicy };
                rollback = { kind: 'quality', value: copyData(command.previous) };
                break;
            case 'subtitleDelay':
            case 'audioDelay':
            case 'subtitleStyle':
                preferences = changePreferences(preferences, { [command.kind]: command.value });
                effect = { kind: 'source.reconfigure', settings };
                rollback = effect;
                reconfigure = true;
                break;
            case 'filters': {
                settings = Object.freeze({ ...settings, [command.key]: command.value });
                const rejection = !state.source.automatic && featureRejection(state.source.mode, { ...settings, toneMapping: preferences.toneMapping, hybridAudioFilters: input.hybridAudioFilters });
                if (rejection)
                    return result(state, false, undefined, empty, rejection);
                noop = command.value === state.settings[command.key];
                const direct = !command.value && state.source.automatic && input.hasBackend && state.source.mode !== 'native' && preferences.toneMapping === 'off';
                reconfigure = !direct;
                promote = !!direct && !noop;
                effect = direct ? { kind: 'filter', key: command.key, value: '' } : { kind: 'source.reconfigure', settings };
                rollback = { kind: 'filter', key: command.key, value: command.key === 'vf' ? effectiveVideoFilters(state.settings, state.preferences) : state.settings.af };
                if (!noop && !input.hasSource && state.source.automatic && (settings.vf || settings.af))
                    mode = featureRejection('hybrid', { ...settings, toneMapping: preferences.toneMapping, hybridAudioFilters: input.hybridAudioFilters }) ? 'software' : 'hybrid';
                break;
            }
            case 'toneMapping': {
                preferences = changePreferences(preferences, { toneMapping: command.value });
                noop = command.value === state.preferences.toneMapping;
                const direct = command.value === 'off' && state.source.automatic && input.hasBackend && state.source.mode === 'software';
                reconfigure = !direct;
                promote = !!direct && !noop;
                effect = direct ? { kind: 'filter', key: 'vf', value: settings.vf } : { kind: 'source.reconfigure', settings };
                rollback = { kind: 'filter', key: 'vf', value: effectiveVideoFilters(state.settings, state.preferences) };
                if (!noop && !input.hasSource) {
                    if (state.source.automatic && command.value !== 'off')
                        mode = 'software';
                    else {
                        const rejection = featureRejection(state.source.mode, { ...settings, toneMapping: command.value, hybridAudioFilters: input.hybridAudioFilters });
                        if (rejection)
                            return result(state, false, undefined, empty, rejection);
                    }
                }
                break;
            }
        }
        const effects = !noop && (reconfigure ? input.hasSource : input.hasBackend) ? [copyData(effect)] : [], restore = !noop && input.hasBackend && !reconfigure ? [copyData(rollback)] : [];
        if (!noop && (command.kind === 'range' || command.kind === 'loop') && input.hasBackend && effect.kind === 'seek') {
            effects.push(Object.freeze({ kind: 'seek.verify', value: effect.value }));
            restore.push(Object.freeze({ kind: 'seek.verify', value: command.facts.time }));
        }
        if (input.hasBackend && verifyTrack) {
            effects.push(Object.freeze({ kind: 'track.verify', track: verifyTrack, value: settings[verifyTrack === 'audio' ? 'aid' : 'sid'], settings }));
            restore.push(Object.freeze({ kind: 'track.verify', track: verifyTrack, value: state.settings[verifyTrack === 'audio' ? 'aid' : 'sid'], settings: state.settings }));
        }
        const settingKey = command.kind === 'volume' ? 'volume' : command.kind === 'rate' ? 'speed' : command.kind === 'gain' ? 'gain' : command.kind === 'pause' ? 'pause' : command.kind === 'subtitles' || command.kind === 'visibility' ? 'subtitles' : command.kind === 'track' || command.kind === 'publicTrack' && !noop ? (command.track === 'audio' ? 'aid' : 'sid') : command.kind === 'filters' ? command.key : undefined;
        const preferenceKey = command.kind === 'publicTrack' && selection?.action !== 'none' || command.kind === 'track' && command.clearPublicSelection ? 'publicSelections' : command.kind === 'mute' ? 'muted' : command.kind === 'buffering' ? 'buffering' : command.kind === 'output' ? 'outputDeviceId' : command.kind === 'quality' ? 'qualityPolicy' : command.kind === 'range' ? 'playbackRange' : command.kind === 'loop' ? 'loopPolicy' : command.kind === 'subtitleDelay' || command.kind === 'audioDelay' || command.kind === 'subtitleStyle' || command.kind === 'toneMapping' ? command.kind : undefined;
        const settingsPatch = Object.freeze(settingKey ? { [settingKey]: settings[settingKey] } : {}), preferencesPatch = copyData(preferenceKey ? { [preferenceKey]: preferences[preferenceKey] } : {});
        const id = state.settingsTransactions.serial + 1, transaction = Object.freeze({ id, operation: operation.id, epoch: operation.epoch, session: state.source.acceptedSession, phase: 'applying', reconfigure, promote, mode, settings, preferences, settingsPatch, preferencesPatch, rollback: Object.freeze(restore) });
        return result({ ...state, settingsTransactions: Object.freeze({ ...state.settingsTransactions, serial: id, pending: transaction }) }, true, id, Object.freeze(effects));
    }
    if (!settingAuthority(state, input.id))
        return result(state, false, input.id);
    const pending = state.settingsTransactions.pending;
    if (input.type === 'setting.failed') {
        if (pending.phase !== 'applying')
            return result(state, false, input.id);
        return result({ ...state, settingsTransactions: Object.freeze({ ...state.settingsTransactions, pending: Object.freeze({ ...pending, phase: 'compensating' }) }) }, true, input.id, pending.rollback);
    }
    if (input.type === 'setting.accept' && pending.phase === 'compensating' || input.type !== 'setting.accept' && pending.phase !== 'compensating')
        return result(state, false, input.id);
    const degraded = input.type === 'setting.degraded' ? Object.freeze({ id: pending.id, operation: pending.operation, session: pending.session }) : state.settingsTransactions.degraded;
    // Apply only the fields this command owns. Independent accepted observations
    // (for example an emergency pause) may arrive while its I/O is pending.
    const commit = input.type === 'setting.accept' && pending.phase !== 'accepted';
    return result({ ...state, source: commit && pending.mode ? Object.freeze({ ...state.source, mode: pending.mode }) : state.source, settings: commit ? Object.freeze({ ...state.settings, ...pending.settingsPatch }) : state.settings, preferences: commit ? changePreferences(state.preferences, pending.preferencesPatch) : state.preferences, settingsTransactions: Object.freeze({ ...state.settingsTransactions, pending: null, degraded }) }, true, input.id, input.type === 'setting.accept' && pending.promote ? Object.freeze([{ kind: 'promotion' }]) : empty);
}
