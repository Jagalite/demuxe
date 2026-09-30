import type { Player } from './unified-player.js';
/** Public structural contract; excludes private engines and raw property access. */
export type PlaybackControl = Pick<Player, 'state' | 'subscribe' | 'addEventListener' | 'removeEventListener' | 'play' | 'pause' | 'seek' | 'setVolume' | 'setMuted' | 'setPlaybackRate' | 'selectAudioTrack' | 'selectSubtitleTrack' | 'subtitleVisible' | 'setQuality' | 'seekToLive' | 'setLoop' | 'setPlaybackRange' | 'seekChapter' | 'preview' | 'getStats' | 'getPlaybackExplanation' | 'presentation' | 'host' | 'isDestroyed'>;
export type PlaybackRuntime = PlaybackControl & Pick<Player, 'open' | 'close' | 'destroy'>;
export type StateSource = Pick<PlaybackControl, 'state' | 'subscribe'>;
/** Current public API, without the class's private nominal members. */
export type PlayerAPI = Pick<Player, keyof Player>;
