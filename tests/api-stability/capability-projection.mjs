// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectCapabilities} from '../../web/generated/internal/machine/capabilities.js';

const available = {availability: 'available'};
const unknown = {availability: 'unknown', reason: 'Open a source to establish availability'};
const unavailable = reason => ({availability: 'unavailable', reason});
const switchTo = mode => ({availability: 'switch', mode, reason: `This feature requires ${mode} playback`});
const seekable = [{start: 0, end: 60}];
const facts = overrides => ({
  mode: 'native', hasSession: true, automaticSelection: false, previousDuration: 60,
  backendPlan: 'direct', nativeASS: false, privateRemux: false, privateFull: false,
  providerRuntime: false, hybridAudioFilters: false, nativeRemux: 'auto', canInspectFFmpeg: true,
  remoteFormat: null, backendMpvSubtitles: false, backendSetQuality: false,
  backendSeekToLive: false, backendNativeLive: false, isolated: true, webCodecs: true,
  mediaSource: true, webAudio: true, bufferingBackend: 'browser', bufferingControl: 'hint',
  ...overrides,
});
const project = (overrides, ranges = seekable, audio = 1, subtitles = 1) => selectCapabilities(facts(overrides), ranges, audio, subtitles);

test('manual Native snapshot preserves every legacy capability and feature reason', () => {
  assert.deepEqual(project(), {
    videoFilters: false, audioFilters: false, mpvSubtitles: false, externalTextTracks: true,
    externalSubtitles: true, customFonts: false, customRequestHeaders: true,
    buffering: {control: 'hint', preload: true, profile: false, memoryBudget: false},
    deployment: {isolated: true, webCodecs: true, mediaSource: true},
    features: {
      subtitleDelay: unavailable('Select hybrid mode first'), audioDelay: unavailable('Select hybrid mode first'),
      subtitleStyle: unavailable('Select hybrid mode first'), quality: unavailable('This route does not expose adaptive qualities'),
      liveNavigation: unavailable('No controlled live timeline'), loop: available, playbackRange: available,
      frameStep: unavailable('Frame stepping requires mpv video playback'),
      snapshot: {availability: 'unknown', reason: 'Readback depends on the active renderer and source permissions'},
      audioOutputDevice: {availability: 'unknown', reason: 'Output selection depends on browser permission and the active audio sink'},
      seek: available, audioTracks: available, subtitleTracks: available, audioGain: available,
      externalSubtitles: available, customFonts: unavailable('Select hybrid mode first'),
      videoFilters: unavailable('Select software mode first'), audioFilters: unavailable('Select software mode first'),
    },
  });
});

test('Automatic Native requests qualified mode switches without claiming the route already exists', () => {
  const result = project({automaticSelection: true});
  assert.equal(result.videoFilters, true);
  assert.equal(result.audioFilters, true);
  assert.equal(result.customFonts, true);
  assert.equal(result.mpvSubtitles, false);
  for (const name of ['subtitleDelay', 'audioDelay', 'subtitleStyle', 'customFonts']) assert.deepEqual(result.features[name], switchTo('hybrid'));
  for (const name of ['videoFilters', 'audioFilters']) assert.deepEqual(result.features[name], switchTo('software'));
  assert.deepEqual(project({automaticSelection: true, hybridAudioFilters: true}).features.audioFilters, switchTo('hybrid'));
});

test('Hybrid filter policy and Software inheritance retain their different routing rules', () => {
  const hybrid = project({mode: 'hybrid', bufferingBackend: 'mpv', bufferingControl: 'profile'});
  assert.equal(hybrid.videoFilters, false);
  assert.equal(hybrid.audioFilters, false);
  assert.equal(hybrid.mpvSubtitles, true);
  assert.equal(hybrid.externalTextTracks, false);
  assert.deepEqual(hybrid.features.audioDelay, available);
  assert.deepEqual(hybrid.features.videoFilters, unavailable('Select software mode first'));
  assert.deepEqual(hybrid.features.audioFilters, unavailable('Select software mode first'));
  const filteredHybrid = project({mode: 'hybrid', hybridAudioFilters: true});
  assert.equal(filteredHybrid.audioFilters, true);
  assert.deepEqual(filteredHybrid.features.audioFilters, available);
  assert.deepEqual(project({mode: 'hybrid', automaticSelection: true}).features.videoFilters, switchTo('software'));
  const software = project({mode: 'software'});
  for (const name of ['videoFilters', 'audioFilters', 'subtitleDelay', 'audioDelay', 'subtitleStyle', 'customFonts', 'frameStep', 'audioGain']) assert.deepEqual(software.features[name], available, name);
  assert.equal(software.videoFilters, true);
  assert.equal(software.audioFilters, true);
});

test('no-session projection preserves unknown observed features and pre-source route policy', () => {
  const result = project({hasSession: false, automaticSelection: true, previousDuration: undefined}, null, 0, 0);
  for (const name of ['quality', 'liveNavigation', 'loop', 'playbackRange', 'frameStep', 'snapshot', 'audioOutputDevice', 'audioTracks', 'subtitleTracks']) assert.deepEqual(result.features[name], unknown, name);
  assert.deepEqual(result.features.seek, {availability: 'unknown', reason: 'Seek window has not been established'});
  assert.deepEqual(result.features.videoFilters, switchTo('software'));
  assert.deepEqual(result.features.audioGain, available);
  assert.deepEqual(result.features.externalSubtitles, available);
  assert.equal(result.externalTextTracks, true);
});

test('deployment rejection wins over active mode and automatic route preferences', () => {
  const isolation = unavailable('This deployment requires cross-origin isolation');
  for (const mode of ['native', 'hybrid', 'software']) {
    for (const automaticSelection of [false, true]) {
      const result = project({mode, automaticSelection, isolated: false});
      assert.deepEqual(result.features.videoFilters, isolation);
      assert.deepEqual(result.features.subtitleDelay, isolation);
    }
  }
  const privateUnavailable = unavailable('Private runtime has no qualified Hybrid or Software service');
  assert.deepEqual(project({privateRemux: true, isolated: false, automaticSelection: true}).features.videoFilters, privateUnavailable);
  assert.deepEqual(project({privateRemux: true, providerRuntime: true, isolated: false, mode: 'software'}).features.videoFilters, isolation);
  assert.deepEqual(project({privateRemux: true, providerRuntime: true, automaticSelection: true}).features.videoFilters, switchTo('software'));
  assert.deepEqual(project({privateRemux: true, privateFull: true, isolated: false, mode: 'software'}).features.videoFilters, available);
});

test('partial private Software retains explicit subtitle limitations and audio exceptions', () => {
  for (const [mode, backendPlan] of [['software', 'software-private'], ['hybrid', 'hybrid-private']]) {
    const result = project({mode, backendPlan, privateRemux: true, isolated: false});
    for (const name of ['videoFilters', 'audioFilters', 'mpvSubtitles', 'externalTextTracks', 'externalSubtitles', 'customFonts']) assert.equal(result[name], false, name);
    assert.equal(result.customRequestHeaders, true);
    assert.deepEqual(result.features.subtitleDelay, unavailable('Private Software subtitles are not qualified'));
    assert.deepEqual(result.features.subtitleStyle, unavailable('Private Software subtitle styling is not qualified'));
    assert.deepEqual(result.features.externalSubtitles, unavailable('Private Software external subtitles are not qualified'));
    assert.deepEqual(result.features.customFonts, unavailable('Private Software custom fonts are not qualified'));
    assert.deepEqual(result.features.audioDelay, available);
    assert.deepEqual(result.features.audioGain, available);
    assert.deepEqual(result.features.frameStep, available);
  }
});

test('full private playback remains usable without isolation and retains manual Hybrid limits', () => {
  const common = {privateFull: true, privateRemux: true, isolated: false};
  const software = project({...common, mode: 'software', backendPlan: 'software-private'});
  for (const name of ['videoFilters', 'audioFilters', 'mpvSubtitles', 'externalSubtitles', 'customFonts', 'customRequestHeaders']) assert.equal(software[name], true, name);
  assert.equal(software.externalTextTracks, false);
  for (const name of ['subtitleDelay', 'subtitleStyle', 'externalSubtitles', 'customFonts', 'videoFilters']) assert.deepEqual(software.features[name], available, name);
  const hybrid = project({...common, mode: 'hybrid', backendPlan: 'hybrid-private'});
  assert.equal(hybrid.videoFilters, false);
  assert.equal(hybrid.audioFilters, false);
  assert.deepEqual(hybrid.features.videoFilters, unavailable('Select software mode first'));
  const filtered = project({...common, mode: 'hybrid', backendPlan: 'hybrid-private', hybridAudioFilters: true});
  assert.equal(filtered.audioFilters, true);
  assert.deepEqual(filtered.features.audioFilters, available);
});

test('Native subtitle overlay depends on deployment, backend and remote container facts', () => {
  assert.deepEqual(project({nativeASS: true}).features.customFonts, available);
  assert.deepEqual(project({nativeASS: true, isolated: false, privateRemux: true}).features.customFonts, available);
  assert.deepEqual(project({nativeASS: false, backendMpvSubtitles: true, isolated: false}).features.customFonts, available);
  for (const overrides of [{backendPlan: 'adapted-opus'}, {remoteFormat: 'hls'}, {remoteFormat: 'dash'}]) {
    const result = project({nativeASS: true, backendMpvSubtitles: true, ...overrides});
    assert.deepEqual(result.features.customFonts, unavailable('Select hybrid mode first'));
    assert.equal(result.customFonts, true, 'Legacy policy remains distinct from feature availability');
  }
  assert.deepEqual(project({nativeASS: true, remoteFormat: 'file'}).features.customFonts, available);
  assert.deepEqual(project({nativeASS: true, isolated: false}).features.customFonts, unavailable('This deployment requires cross-origin isolation'));
});

test('Native legacy headers and mpv subtitles preserve backend-specific exceptions', () => {
  for (const backendPlan of ['remux-mpv', 'direct-mpv']) assert.equal(project({backendPlan}).mpvSubtitles, true);
  for (const overrides of [{nativeRemux: 'never'}, {canInspectFFmpeg: false}, {mediaSource: false}]) assert.equal(project(overrides).customRequestHeaders, false);
  assert.equal(project({nativeRemux: 'always'}).customRequestHeaders, true);
  assert.equal(project({backendPlan: 'shaka-mse', nativeRemux: 'never', canInspectFFmpeg: false, mediaSource: false}).customRequestHeaders, true);
  assert.equal(project({mode: 'hybrid', nativeRemux: 'never', canInspectFFmpeg: false, mediaSource: false}).customRequestHeaders, true);
  assert.deepEqual(project({webAudio: false}).features.audioGain, unavailable('Web Audio is unavailable'));
});

test('quality and live navigation use observed backend support only with a session', () => {
  assert.deepEqual(project({backendSetQuality: true}).features.quality, available);
  assert.deepEqual(project({backendSetQuality: true, hasSession: false}).features.quality, unknown);
  assert.deepEqual(project({backendSeekToLive: true, backendNativeLive: true}).features.liveNavigation, available);
  for (const overrides of [{backendSeekToLive: true}, {backendNativeLive: true}]) assert.deepEqual(project(overrides).features.liveNavigation, unavailable('No controlled live timeline'));
  assert.deepEqual(project({hasSession: false, backendSeekToLive: true, backendNativeLive: true}).features.liveNavigation, unknown);
});

test('seek, tracks and previous-duration loop semantics keep unknown separate from unavailable', () => {
  assert.deepEqual(project({}, null).features.seek, {availability: 'unknown', reason: 'Seek window has not been established'});
  assert.deepEqual(project({}, []).features.seek, unavailable('The source currently has no seekable time range'));
  assert.deepEqual(project({}, [], 0, 0).features.loop, unknown);
  assert.deepEqual(project({previousDuration: null}).features.loop, unknown);
  assert.deepEqual(project({previousDuration: null}).features.playbackRange, available);
  assert.deepEqual(project({previousDuration: undefined}).features.loop, available, 'Initial optional snapshot read is undefined, not null');
  assert.deepEqual(project({previousDuration: 0}).features.loop, available);
  const empty = project({}, seekable, 0, 0);
  assert.deepEqual(empty.features.audioTracks, unavailable('Audio track selection is not exposed by this source/browser'));
  assert.deepEqual(empty.features.subtitleTracks, unavailable('No subtitle tracks are available'));
});

test('buffering and deployment projection use supplied facts without consulting browser globals', () => {
  for (const [bufferingBackend, profile, memoryBudget] of [['browser', false, false], ['shaka', true, false], ['remux', true, true], ['mpv', true, true]]) {
    const result = project({bufferingBackend, bufferingControl: 'profile', isolated: false, webCodecs: false, mediaSource: false});
    assert.deepEqual(result.buffering, {control: 'profile', preload: true, profile, memoryBudget});
    assert.deepEqual(result.deployment, {isolated: false, webCodecs: false, mediaSource: false});
  }
});

test('capability projection leaves frozen facts/ranges untouched and shares no state across calls', () => {
  const input = Object.freeze(facts({automaticSelection: true}));
  const ranges = Object.freeze([Object.freeze({start: 2, end: 40})]);
  const before = structuredClone({input, ranges});
  const first = selectCapabilities(input, ranges, 2, 3);
  const expected = structuredClone(first);
  first.deployment.isolated = false;
  first.features.videoFilters.reason = 'Caller mutation';
  assert.deepEqual(selectCapabilities(input, ranges, 2, 3), expected);
  assert.deepEqual({input, ranges}, before);
});
