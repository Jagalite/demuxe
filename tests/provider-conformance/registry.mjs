// SPDX-License-Identifier: Apache-2.0
import {contractKey} from './package.mjs';

// A finite test registry: capability declarations select checks, never routes.
const rows = [];
const register = (capability, profiles, suite, codec) => profiles.forEach(profile => rows.push({capability, version: 1, profile, suite, codec}));
for (const codec of ['ac3', 'eac3']) register('audio.decode.' + codec, ['48khz-fltp'], 'audio-decoder', codec);
register('audio.decode.dts', ['core-48khz-fltp'], 'audio-decoder', 'dts-core');
register('audio.decode.dts', ['ma-48khz-s32p'], 'audio-decoder', 'dts-hd');
for (const codec of ['truehd', 'mlp']) register('audio.decode.' + codec, ['48khz-integer'], 'audio-decoder', codec);
register('audio.decode.aac', ['lc-48khz-stereo'], 'audio-decoder', 'aac');
for (const codec of ['opus', 'vorbis', 'mp3', 'pcm']) register('audio.decode.' + codec, ['48khz-stereo'], 'audio-decoder', codec);
for (const codec of ['flac', 'alac']) register('audio.decode.' + codec, ['48khz-integer'], 'audio-decoder', codec);
register('audio.encode.flac', ['48khz-s24'], 'flac-encoder');
register('audio.encode.opus', ['48khz-mono-stereo'], 'opus-encoder');
register('container.read.matroska', ['finite-clear-av'], 'matroska');
register('container.mux.fmp4', ['explicit-timeline-av'], 'fmp4');
export const suites = Object.freeze(rows);
const index = new Map(rows.map(row => [contractKey(row), row]));
export const selectSuite = offer => index.get(contractKey(offer));
export function fixtureMatches(offer, fixture) {
  const selected = selectSuite(offer);
  if (selected?.suite !== 'audio-decoder') return true;
  const codec = selected.codec;
  if (!(codec === 'pcm' ? fixture.codec?.startsWith('pcm-') : fixture.codec === codec)) return false;
  if (!Number.isSafeInteger(fixture.sampleRate) || !Number.isSafeInteger(fixture.channels)) return false;
  if (offer.profile.includes('48khz') && fixture.sampleRate !== 48000) return false;
  if (offer.profile.includes('stereo') && fixture.channels !== 2) return false;
  if (['ac3', 'eac3', 'dts-core'].includes(codec) && ![1, 2, 6].includes(fixture.channels)) return false;
  return true;
}
