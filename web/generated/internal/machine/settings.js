// SPDX-License-Identifier: Apache-2.0
import { copyData } from './data.js';
export function initialSettings() { return Object.freeze({ pause: true, volume: 100, speed: 1, aid: 'auto', sid: 'auto', subtitles: true, vf: '', af: '', gain: 1 }); }
export function transitionSettings(state, input) { return Object.freeze(input.type === 'settings.accept' ? { ...input.value } : { ...state, ...input.value }); }
export function initialPreferences() { return Object.freeze({ muted: false, outputDeviceId: '', buffering: Object.freeze({ preload: 'auto', profile: 'balanced' }), subtitleDelay: 0, audioDelay: 0, subtitleStyle: Object.freeze({}), playbackRange: null, loopPolicy: false, qualityPolicy: null }); }
export function changePreferences(state, value) { return copyData({ ...state, ...value }); }
export function clearSourcePreferences(state) { return Object.freeze({ ...state, playbackRange: null, loopPolicy: false, qualityPolicy: null }); }
export function initialSettingsTransactions() { return Object.freeze({ serial: 0, pending: null, degraded: null }); }
export function settingAuthority(state, id) {
    const pending = state.settingsTransactions.pending, operation = state.operations.entries.find(entry => entry.id === state.operations.active);
    return !!pending && pending.id === id && !state.operations.terminal && pending.epoch === state.operations.epoch && pending.session === state.source.acceptedSession && operation?.id === pending.operation && !operation.cancelled && operation.phase === 'active';
}
export function transitionSettingTransaction(state, input) {
    const empty = Object.freeze([]);
    const result = (next, accepted, id, effects = empty) => Object.freeze({ state: next === state ? state : Object.freeze({ ...next, revision: state.revision + 1 }), accepted, id, effects, reason: accepted ? undefined : 'retired', retire: Object.freeze([]) });
    if (input.type === 'preferences.change')
        return result({ ...state, preferences: changePreferences(state.preferences, input.value) }, true);
    if (input.type === 'setting.begin') {
        const operation = state.operations.entries.find(entry => entry.id === state.operations.active);
        if (state.operations.terminal || !operation || operation.cancelled || operation.epoch !== state.operations.epoch || state.settingsTransactions.pending)
            return result(state, false);
        let settings = state.settings, preferences = state.preferences, effect, rollback, reconfigure = false;
        const command = input.command;
        switch (command.kind) {
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
        }
        const effects = (reconfigure ? input.hasSource : input.hasBackend) ? [copyData(effect)] : [], restore = input.hasBackend && !reconfigure ? [copyData(rollback)] : [];
        if (input.hasBackend && command.kind === 'track' && command.verify) {
            effects.push(Object.freeze({ kind: 'track.verify', track: command.track, value: command.value, settings }));
            restore.push(Object.freeze({ kind: 'track.verify', track: command.track, value: state.settings[command.track === 'audio' ? 'aid' : 'sid'], settings: state.settings }));
        }
        const settingKey = command.kind === 'volume' ? 'volume' : command.kind === 'rate' ? 'speed' : command.kind === 'gain' ? 'gain' : command.kind === 'pause' ? 'pause' : command.kind === 'subtitles' ? 'subtitles' : command.kind === 'track' ? (command.track === 'audio' ? 'aid' : 'sid') : undefined;
        const preferenceKey = command.kind === 'mute' ? 'muted' : command.kind === 'buffering' ? 'buffering' : command.kind === 'output' ? 'outputDeviceId' : command.kind === 'quality' ? 'qualityPolicy' : command.kind === 'subtitleDelay' || command.kind === 'audioDelay' || command.kind === 'subtitleStyle' ? command.kind : undefined;
        const settingsPatch = Object.freeze(settingKey ? { [settingKey]: settings[settingKey] } : {}), preferencesPatch = copyData(preferenceKey ? { [preferenceKey]: preferences[preferenceKey] } : {});
        const id = state.settingsTransactions.serial + 1, transaction = Object.freeze({ id, operation: operation.id, epoch: operation.epoch, session: state.source.acceptedSession, phase: 'applying', reconfigure, settings, preferences, settingsPatch, preferencesPatch, rollback: Object.freeze(restore) });
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
    return result({ ...state, settings: commit ? Object.freeze({ ...state.settings, ...pending.settingsPatch }) : state.settings, preferences: commit ? changePreferences(state.preferences, pending.preferencesPatch) : state.preferences, settingsTransactions: Object.freeze({ ...state.settingsTransactions, pending: null, degraded }) }, true, input.id);
}
