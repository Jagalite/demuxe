// SPDX-License-Identifier: Apache-2.0
export function initialSettings() { return Object.freeze({ pause: true, volume: 100, speed: 1, aid: 'auto', sid: 'auto', subtitles: true, vf: '', af: '', gain: 1 }); }
export function transitionSettings(state, input) { return Object.freeze(input.type === 'settings.accept' ? { ...input.value } : { ...state, ...input.value }); }
