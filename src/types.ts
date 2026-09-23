// SPDX-License-Identifier: Apache-2.0
export const PLAYBACK_MODES = Object.freeze(['native', 'hybrid', 'software'] as const);
export type PlaybackMode = typeof PLAYBACK_MODES[number];
export type TrackType = 'audio' | 'sub';
export type MediaInputOptions = {demuxer?: string};
/** Shaka owns adaptive selection. maxBandwidth is a bitrate ceiling; representation
 * pins a source video representation (or HLS variant URI). live permits a live timeline. */
export type StreamingOptions = {maxBandwidth?: number; representation?: string; live?: boolean};
export type RemoteSource = MediaInputOptions & {
  streaming?: StreamingOptions;
  url: string;
  format?: 'file' | 'hls' | 'dash';
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  allowedOrigins?: string[];
  immutable?: boolean;
  refreshAuthorization?: (resource?: {url: string}) => Promise<{url?: string; headers?: Record<string, string>}>;
};
export type TextTrackSource = {src: string; label: string; language?: string; default?: boolean};
export type SubtitleOptions = {label?: string; language?: string; select?: boolean};
export type SubtitleAsset = {bytes: ArrayBuffer; format: 'srt' | 'ass' | 'ssa' | 'vtt'; label: string; language?: string; select: boolean};
export type FontAsset = {name: string; bytes: ArrayBuffer};
export type AudioOutput = 'stereo' | '5.1' | '7.1' | 'auto';
export type ToneMapping = 'off' | 'hdr-to-sdr';
/** Software decode pixels (up to 4K), and mpv's individual FFmpeg allocation cap. */
export type ResourceLimits = {maxDecodePixels?: number; maxAllocationBytes?: number};
export type PreloadPolicy = 'none' | 'metadata' | 'auto';
export type BufferingProfile = 'low-latency' | 'balanced' | 'resilient';
/** memoryBudget is a coded-data budget ceiling in bytes (8–64 MiB), not total player memory.
 * Browser and Shaka cannot enforce it; consult diagnostics. */
export type BufferingOptions = {preload?:PreloadPolicy; profile?:BufferingProfile; memoryBudget?:number};
export type BufferingPolicy = Readonly<Required<Pick<BufferingOptions,'preload'|'profile'>> & Pick<BufferingOptions,'memoryBudget'>>;
export type BufferingCapabilities = Readonly<{control:'hint'|'profile'; preload:boolean; profile:boolean; memoryBudget:boolean}>;
export type BufferingResolution = {requestedMemoryBudget?:number; requestedProfile:BufferingProfile; preload:PreloadPolicy; backend:'browser'|'shaka'|'remux'|'mpv'; control:'hint'|'profile'; cache?:boolean; forwardLimitBytes?:number; backwardLimitBytes?:number; forwardSeconds?:number; backwardSeconds?:number; notes:string[]; settings?:Record<string,unknown>};
export type PreviewPregeneration = readonly number[] | ({width?:number;height?:number;count?:number|null} & ({timestamps:readonly number[];every?:never;unit?:never}|{every:number;unit?:'seconds'|'minutes';timestamps?:never}));
export type PreviewOptions = {pregenerate?:PreviewPregeneration;enabled?:boolean;bucketSeconds?:number;debounceMs?:number;width?:number;maxCacheBytes?:number;maxEntries?:number;timeoutMs?:number};
export type PreparationComponent = 'inspector' | 'hybrid' | 'software';
export type PreparationOptions = 'all' | readonly PreparationComponent[];
export type PreparationAsset = {name:PreparationComponent|'font';status:'ready'|'failed'|'aborted';bytes:number;milliseconds:number;error?:string};
export type PreparationReport = {milliseconds:number;assets:PreparationAsset[]};
export type PreparationProgress = {name:PreparationAsset['name'];status:PreparationAsset['status']|'queued'|'loading'|'compiling'};
/** Match fields are combined with AND; language aliases and regions match their base language. */
export type TrackMatch = Readonly<{language?:string; title?:string; codec?:string; streamIndex?:number}>;
export type TrackTypePolicy = Readonly<{
  /** Ordered preferences fall back to the file default among allowed tracks. */
  default?:'file'|'off'|TrackMatch|readonly TrackMatch[];
  /** OR of matchers; omitted permits all tracks, [] permits none. */
  allowed?:readonly TrackMatch[];
  allowOff?:boolean;
  allowAuto?:boolean;
  /** Prevent subsequent public track changes, including legacy selectors. */
  locked?:boolean;
}>;
export type TrackPolicy = Readonly<{audio?:TrackTypePolicy; subtitles?:TrackTypePolicy}>;
export type PlayerOptions = {
  trackPolicy?:TrackPolicy;
  /** Download and compile selected components at construction; omitted means lazy loading. */
  prepare?:PreparationOptions;
  preview?:PreviewOptions|false;
  /** Automatic balanced buffering and auto preload when omitted. */
  buffering?: BufferingOptions;
  /** Package runtime root; includes web/ and fixtures/. Same-origin only. */
  assetBase?: string;
  audioOutput?: AudioOutput;
  audioFallback?: 'stereo' | 'reject';
  toneMapping?: ToneMapping;
  resourceLimits?: ResourceLimits;
  mode?: PlaybackMode;
  /** Defaults to true when mode is omitted. Explicit modes remain pinned. */
  automaticSelection?: boolean;
  /** Internal Native packaging plan; "never" disables the packet-copy fallback. */
  /** Opt-in retained-session seeks; broad automatic admission remains gated. */
  experimentalBufferedNativeSeeks?: boolean;
  /** Explicit Native trials only; copy original audio first, then qualified integer FLAC. */
  experimentalAudioAdaptation?: 'flac' | 'opus';
  /** Permit automatic FLAC for the qualified local-file subset; never permits lossy conversion. */
  automaticAudioAdaptation?: 'lossless';
  /** Explicit lossy permission; does not authorize resampling or downmixing. */
  allowLossyAudio?: boolean;
  /** External ASS/SSA overlay on qualified Native presentations; no embedded extraction.
   * Enabled by default with automatic selection. Set false to require mpv subtitles. */
  experimentalNativeASS?: boolean;
  /** Compatibility switch for the bounded local embedded mpv subtitle service.
   * Enabled by default; false retains the previous Hybrid/Software selection. */
  experimentalMpvSubtitles?: boolean;
  /** Opt-in Native candidate preparation during playback. Budget covers known
   * Wasm and packet allocations, not opaque browser/GPU memory. */
  experimentalBackgroundPromotion?: {maxKnownBytes:number};
  nativeRemux?: 'auto' | 'never' | 'always';
  /** Optional Software presenter; RGB remains the default. */
  softwarePresenter?: 'rgb' | 'experimental-yuv';
  width?: number;
  height?: number;
  videoFilters?: string;
  /** Experimental scalar attenuation, 0..1; 1 avoids Native Web Audio allocation. */
  audioGain?: number;
  audioFilters?: string;
  /** Opt-in scalar audio filtering on Hybrid; other filters retain Software routing. */
  experimentalHybridAudioFilters?: boolean;
};
export type Capabilities = {
  videoFilters: boolean;
  audioFilters: boolean;
  mpvSubtitles: boolean;
  externalTextTracks: boolean;
  externalSubtitles: boolean;
  customFonts: boolean;
  customRequestHeaders: boolean;
};
export type PlaybackEvent = {event: string; name?: string; data?: unknown; [key: string]: unknown};
export type Diagnostics = {
  preview?:{sourceId:string;cacheBytes:number;cacheEntries:number;requests:number;hits:number;failures:number;cancelled:number;active:boolean;pending:boolean;lastFailure?:{provider:string;kind:string}};
  buffering?: BufferingResolution;
  runtimeCapabilities?: import('./internal/runtime-capability.js').CapabilityRecord[];
  planAdmission?:Array<{id:string;mode:PlaybackMode;eligible:boolean;code?:string;reason?:string;browserCapability?:import('./internal/browser-media-capability.js').BrowserMediaCapability}>;
  plan?: {id:string; mode:PlaybackMode; video:string; audio:string; qualification:string};
  mode: PlaybackMode;
  switching: boolean;
  videoFilters: string;
  audioFilters: string;
  audioGain?: number;
  toneMapping?: ToneMapping;
  resourceLimits?: ResourceLimits;
  selection?: {automatic: boolean; attempts: Array<{mode: PlaybackMode | 'probe'; outcome: 'skipped' | 'failed' | 'selected'; reason: string}>};
  backend?: Record<string, unknown>;
};

export type OpenOptions = MediaInputOptions & {signal?: AbortSignal; trackPolicy?:TrackPolicy};
export type MediaSourceInput = File | ArrayBuffer | string | URL | RemoteSource;
export type OperationKind = 'opening' | 'seeking' | 'switching' | 'closing';
export type PendingOperation = Readonly<{id: number; kind: OperationKind}>;
export type PlayerErrorCode = 'INVALID_ARGUMENT' | 'ABORTED' | 'AUTOPLAY_BLOCKED' | 'SOURCE_PERMISSION' | 'SOURCE_CHANGED' | 'NETWORK_TIMEOUT' | 'UNSUPPORTED_MEDIA' | 'UNSUPPORTED_TIMELINE' | 'UNSUPPORTED_FEATURE' | 'ASSET_LOAD_FAILED' | 'ISOLATION_REQUIRED' | 'DECODE_FAILED';
export type SessionError = Readonly<{code: PlayerErrorCode; message: string; operationId: number | null; operation: OperationKind | null; scope: 'operation' | 'session'; retryable: boolean}>;
export type TimeRange = Readonly<{start: number; end: number}>;
export type FeatureAvailability = Readonly<{availability: 'available'} | {availability: 'switch'; mode: PlaybackMode; reason: string} | {availability: 'unavailable'; reason: string} | {availability: 'unknown'; reason: string}>;
export type FeatureName = 'seek' | 'audioTracks' | 'subtitleTracks' | 'externalSubtitles' | 'customFonts' | 'videoFilters' | 'audioFilters' | 'audioGain';
export type PlayerCapabilities = Readonly<Capabilities & {
  buffering: BufferingCapabilities;
  deployment: Readonly<{isolated: boolean; webCodecs: boolean; mediaSource: boolean}>;
  features: Readonly<Record<FeatureName, FeatureAvailability>>;
}>;
export type MediaTrack = Readonly<{id: string; type: 'audio' | 'subtitle' | 'video'; label: string; language: string | null; codec: string | null; selected: boolean; external: boolean; title:string|null; streamIndex:number|null; default:boolean; forced:boolean; channels:number|null}>;
export type MediaInfo = Readonly<{
  displayWidth: number | null; displayHeight: number | null; aspectRatio: number | null;
  rotation: number | null; video: MediaTrack | null; audio: MediaTrack | null; subtitle: MediaTrack | null;
}>;
export type PlayerState = Readonly<{
  status: 'idle' | 'paused' | 'playing' | 'buffering' | 'ended' | 'error';
  playbackIntent: 'play' | 'pause'; pendingOperation: PendingOperation | null;
  sourceId: number | null; currentTime: number; duration: number | null;
  streamType: 'unknown' | 'vod' | 'live'; subtitlesVisible:boolean; volume: number; muted: boolean; playbackRate: number;
  activeMode: PlaybackMode | null; automaticSelection: boolean;
  buffered: readonly TimeRange[] | null; seekable: readonly TimeRange[] | null;
  /** Resident demux packet coverage; decoding may still be required. */
  cached: readonly TimeRange[] | null;
  trackPolicy:TrackPolicy;
  audioTracks: readonly MediaTrack[]; subtitleTracks: readonly MediaTrack[];
  mediaInfo: MediaInfo; capabilities: PlayerCapabilities; error: SessionError | null;
}>;
export const PLAYER_EVENTS = Object.freeze(['play','playing','pause','waiting','ended','timeupdate','durationchange','seeking','seeked','volumechange','ratechange','trackschange','capabilitieschange','sourcechange','statechange','error'] as const);
export type PlayerEventName = typeof PLAYER_EVENTS[number];
export type PlayerEventMap = {[K in Exclude<PlayerEventName, 'error'>]: CustomEvent<PlayerState>} & {error: CustomEvent<SessionError>};
