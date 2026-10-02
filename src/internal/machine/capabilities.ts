// SPDX-License-Identifier: Apache-2.0
import type {BufferingResolution, Capabilities, FeatureAvailability, PlaybackMode, PlayerCapabilities, PlayerState} from '../../types.js';

/** Observations captured by the shell; no backend instances or ambient APIs.
 * previousDuration deliberately describes the preceding published snapshot.
 * Its initial undefined value is distinct from a known null duration. */
export type CapabilityFacts = Readonly<{
  mode: PlaybackMode;
  hasSession: boolean;
  automaticSelection: boolean;
  previousDuration: number | null | undefined;
  backendPlan: string | null;
  nativeASS: boolean;
  privateRemux: boolean;
  privateFull: boolean;
  providerRuntime: boolean;
  hybridAudioFilters: boolean;
  nativeRemux: 'auto' | 'never' | 'always';
  canInspectFFmpeg: boolean;
  /** Null also represents a local source or an unspecified remote format. */
  remoteFormat: 'file' | 'hls' | 'dash' | null;
  backendMpvSubtitles: boolean;
  backendSetQuality: boolean;
  backendSeekToLive: boolean;
  backendNativeLive: boolean;
  isolated: boolean;
  webCodecs: boolean;
  mediaSource: boolean;
  webAudio: boolean;
  bufferingBackend: BufferingResolution['backend'];
  bufferingControl: BufferingResolution['control'];
}>;

function legacyCapabilities(facts: CapabilityFacts): Capabilities {
  if (['software-private', 'hybrid-private'].includes(facts.backendPlan ?? '')) {
    const full = facts.privateFull;
    return {
      videoFilters: full && (facts.automaticSelection || facts.mode === 'software'),
      audioFilters: full && (facts.automaticSelection || facts.mode === 'software' || facts.hybridAudioFilters),
      mpvSubtitles: full, externalTextTracks: false, externalSubtitles: full,
      customFonts: full, customRequestHeaders: true,
    };
  }
  return {
    videoFilters: facts.automaticSelection || facts.mode === 'software',
    audioFilters: facts.automaticSelection || facts.mode === 'software' || (facts.mode === 'hybrid' && facts.hybridAudioFilters),
    mpvSubtitles: facts.mode !== 'native' || ['remux-mpv', 'direct-mpv'].includes(facts.backendPlan ?? ''),
    externalTextTracks: facts.mode === 'native', externalSubtitles: true,
    customFonts: facts.nativeASS || facts.automaticSelection || facts.mode !== 'native',
    customRequestHeaders: facts.backendPlan === 'shaka-mse' || facts.mode !== 'native' || (facts.nativeRemux !== 'never' && facts.canInspectFFmpeg && facts.mediaSource),
  };
}

/** Inactive extraction of Player's capability projection. Preserve legacy
 * precedence and reasons, including route availability before a source opens.
 * This selector does not admit routes or execute feature requests. */
export function selectCapabilities(
  facts: CapabilityFacts,
  seekable: PlayerState['seekable'],
  audioTrackCount: number,
  subtitleTrackCount: number,
): PlayerCapabilities {
  const available: FeatureAvailability = {availability: 'available'};
  const unavailable = (reason: string): FeatureAvailability => ({availability: 'unavailable', reason});
  const unknown: FeatureAvailability = {availability: 'unknown', reason: 'Open a source to establish availability'};
  const nativeOverlay = (facts.nativeASS && (facts.isolated || facts.privateRemux) || facts.backendMpvSubtitles)
    && facts.backendPlan !== 'adapted-opus' && !(facts.remoteFormat && facts.remoteFormat !== 'file');
  const privateSoftware = ['software-private', 'hybrid-private'].includes(facts.backendPlan ?? '');
  const route = (mode: 'hybrid' | 'software'): FeatureAvailability =>
    facts.privateRemux && !facts.privateFull && !facts.providerRuntime ? unavailable('Private runtime has no qualified Hybrid or Software service')
    : !facts.isolated && !facts.privateFull ? unavailable('This deployment requires cross-origin isolation')
    : facts.mode === mode || mode === 'hybrid' && facts.mode === 'software' ? available
    : facts.automaticSelection ? {availability: 'switch', mode, reason: `This feature requires ${mode} playback`}
    : unavailable(`Select ${mode} mode first`);
  return {
    ...legacyCapabilities(facts),
    buffering: {
      control: facts.bufferingControl, preload: true, profile: facts.bufferingBackend !== 'browser',
      memoryBudget: ['mpv', 'remux'].includes(facts.bufferingBackend),
    },
    deployment: {isolated: facts.isolated, webCodecs: facts.webCodecs, mediaSource: facts.mediaSource},
    features: {
      subtitleDelay: privateSoftware && !facts.privateFull ? unavailable('Private Software subtitles are not qualified') : route('hybrid'),
      audioDelay: privateSoftware ? available : route('hybrid'),
      subtitleStyle: privateSoftware && !facts.privateFull ? unavailable('Private Software subtitle styling is not qualified') : route('hybrid'),
      quality: !facts.hasSession ? unknown : facts.backendSetQuality ? available : unavailable('This route does not expose adaptive qualities'),
      liveNavigation: !facts.hasSession ? unknown : facts.backendSeekToLive && facts.backendNativeLive ? available : unavailable('No controlled live timeline'),
      loop: seekable?.length && facts.previousDuration !== null ? available : unknown,
      playbackRange: seekable?.length ? available : unknown,
      frameStep: !facts.hasSession ? unknown : facts.mode === 'native' ? unavailable('Frame stepping requires mpv video playback') : available,
      snapshot: !facts.hasSession ? unknown : {availability: 'unknown', reason: 'Readback depends on the active renderer and source permissions'},
      audioOutputDevice: !facts.hasSession ? unknown : {availability: 'unknown', reason: 'Output selection depends on browser permission and the active audio sink'},
      seek: seekable === null ? {availability: 'unknown', reason: 'Seek window has not been established'} : seekable.length ? available : unavailable('The source currently has no seekable time range'),
      audioTracks: !facts.hasSession ? unknown : audioTrackCount ? available : unavailable('Audio track selection is not exposed by this source/browser'),
      subtitleTracks: !facts.hasSession ? unknown : subtitleTrackCount ? available : unavailable('No subtitle tracks are available'),
      audioGain: privateSoftware ? available : facts.mode === 'native' ? (facts.webAudio ? available : unavailable('Web Audio is unavailable')) : route('hybrid'),
      externalSubtitles: privateSoftware && !facts.privateFull ? unavailable('Private Software external subtitles are not qualified') : facts.mode === 'native' ? available : route('hybrid'),
      customFonts: privateSoftware && !facts.privateFull ? unavailable('Private Software custom fonts are not qualified') : facts.mode === 'native' && nativeOverlay ? available : route('hybrid'),
      videoFilters: route('software'),
      audioFilters: route(facts.hybridAudioFilters ? 'hybrid' : 'software'),
    },
  };
}
