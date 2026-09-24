// SPDX-License-Identifier: Apache-2.0
export type DecodeQuality = 'exact' | 'balanced' | 'performance';
export type AdaptiveDecodeState = 'normal' | 'reduced-reconstruction' | 'drop-non-reference';
export type DecodeInput = {
    codec?: string;
    codedWidth?: number;
    codedHeight?: number;
    displayWidth?: number;
    displayHeight?: number;
    decodeQuality: DecodeQuality;
    adaptiveState?: AdaptiveDecodeState;
    maxDecodePixels: number;
};
export type DecodePolicy = {
    requested: DecodeQuality;
    effective: DecodeQuality;
    codec: string;
    threads: number;
    skipFrame: 'default' | 'noref';
    skipLoopFilter: 'default' | 'noref';
    skipIdct: 'default';
    lowres: 0;
    filmGrain: 'default' | 'omit';
    adaptiveState: AdaptiveDecodeState;
    shortcuts: string[];
    ffmpegOptions: Record<string, string>;
    reason: string;
    requiresDecoderRestart: boolean;
};
export declare const supportsEmergencyFrameDrop: (codec: string) => boolean;
/** Only controls with a bounded reconstruction contract belong here. The
 * following screened controls are deliberately excluded: skip_frame=bidir,
 * skip_loop_filter=all, skip_idct=all, flags2=+fast, weakened err_detect,
 * disabled concealment, relaxed compliance and private H.264 recovery flags.
 * In particular, B-frame skipping and +fast changed retained pictures. */
export declare function resolveDecodePolicy(input: DecodeInput): DecodePolicy;
export declare function mpvDecoderOptions(policy: DecodePolicy): string;
/** Presentation drops alone can reflect display refresh limits rather than a
 * decoder backlog. Compare timeline progress with the requested playback rate. */
export declare function adaptiveDecodeSignal(input: {
    elapsedSeconds: number;
    playbackSpeed: number;
    advance: number;
    decoderDrops: number;
    presentationDrops: number;
    avsync: number;
}): {
    pressure: boolean;
    recovered: boolean;
};
/** Sample every two seconds. Each transition is followed by mpv decoder
 * reinitialization, so demand sustained evidence and a long recovery window. */
export declare function nextAdaptiveState(state: AdaptiveDecodeState, codec: string, pressure: boolean, recovered: boolean, streak: number): AdaptiveDecodeState;
