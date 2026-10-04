// SPDX-License-Identifier: Apache-2.0
export {Player} from './unified-player.js';
export {PLAYBACK_MODES} from './types.js';
export type {StreamingOptions, MediaInputOptions, AudioOutput, ToneMapping, ResourceLimits, SubtitleOptions, PlaybackMode, RemuxRuntimePolicy, PlayerOptions, StartupEscalationOptions, RemoteSource, TextTrackSource, Capabilities, Diagnostics, PlaybackEvent, TrackType} from './types.js';

export {PlayerError} from './internal/errors.js';
export {PLAYER_EVENTS} from './types.js';
export type {PlayerState, PlayerEventMap, PlayerEventName, PlayerCapabilities, FeatureAvailability, MediaInfo, MediaTrack, TimeRange, SessionError, PlayerErrorCode, OpenOptions, MediaSourceInput, PendingOperation, OperationKind} from './types.js';

export type {PreloadPolicy, BufferingProfile, BufferingOptions, BufferingPolicy, BufferingCapabilities, BufferingResolution, BufferingState} from './types.js';

export {PreviewController} from './preview/controller.js';
export type {PreviewMetrics,PreviewRequest,PreviewFrame,PreviewImage,PreviewResult,PreviewContext,PreviewProvider,PreviewOptions} from './preview/controller.js';
export {AuthoredPreviewProvider,LocalVideoPreviewProvider} from './preview/providers.js';

export {SoftwarePreviewProvider} from './preview/software.js';

export type {PreparationComponent,PreparationOptions,PreparationAsset,PreparationReport,PreparationProgress} from './types.js';

export type {PreviewPregeneration,PreviewStrategy} from './types.js';

export type {TrackPolicy,TrackTypePolicy,TrackMatch} from './types.js';
export type {WatchdogOptions,WatchdogPolicy} from './types.js';

export type {PlayerPreview} from './preview/player-preview.js';

export type {ModeChangeDetail,SelectionChangeDetail,PlaybackStats,PlaybackExplanation,PlaybackDecisionCode} from './types.js';
export type {AttachmentHandle,SubtitleStyle,TimingSettings} from './types.js';
export type {Chapter} from './types.js';
export type {QualityPolicy,StreamingQuality,StreamingState} from './types.js';
export {inspectMedia,CUSTOM_SOURCE_PLAYBACK_LIMIT} from './sources.js';
export type {CustomSource,InspectionOptions,MediaInspection} from './types.js';
export type {SeekOptions,PlaybackRange,LoopPolicy,SnapshotOptions,VideoSnapshot} from './types.js';
export {PlayerPresentation} from './presentation.js';

export type {ProviderPreferences} from './types.js';
