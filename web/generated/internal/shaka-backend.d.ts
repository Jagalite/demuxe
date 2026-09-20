// SPDX-License-Identifier: GPL-3.0-or-later
import type { Backend } from './backend.js';
import type { RemoteSource, TextTrackSource, SubtitleAsset, TrackType } from '../types.js';
/** Shaka exclusively owns adaptive manifests, scheduling, ABR and MediaSource.
 * NativePlayer supplies only media-element controls, output verification and gain. */
export declare class ShakaBackend extends EventTarget implements Backend {
    private video;
    private assetBase;
    readonly ready: Promise<void>;
    readonly properties: Map<string, unknown>;
    private native;
    private player?;
    private policy?;
    private runtime?;
    private stopped;
    private runtimeLoad;
    private opening;
    private failure?;
    private disposal?;
    private listeners;
    private blobs;
    private external;
    private visible;
    private selectedSub;
    private audioDisabled;
    private source?;
    constructor(video: HTMLVideoElement, assetBase?: URL);
    private emit;
    private active;
    private loaded;
    private mapped;
    open(_file: File | ArrayBuffer): Promise<void>;
    openRemote(source: RemoteSource): Promise<void>;
    private refresh;
    private audioTracks;
    private expected;
    verifyStartup(_expected?: {
        video: boolean;
        audio: boolean;
    }, output?: boolean): Promise<void>;
    verifyOutput(): Promise<void>;
    startupEvidence(): {
        sourceBufferCreated: boolean;
        apiHint?: string;
        prepared?: boolean;
        completedAtEOF?: boolean;
        outputVerified?: boolean;
        audioEvidence?: string;
        timing?: Record<string, number>;
        metadata?: boolean;
        initAccepted?: boolean;
        mediaAccepted?: boolean;
        decoderOutput?: boolean;
        videoPresented?: boolean;
        audioProgress?: boolean;
        audioDecoded?: boolean;
        audioDecoderConfigured?: boolean;
        playbackReady?: boolean;
    };
    play(): Promise<void>;
    pause(): Promise<void>;
    seek(seconds: number): Promise<void>;
    rate(value: number): Promise<void>;
    volume(value: number): Promise<void>;
    gain(value: number): Promise<void>;
    selectTrack(type: TrackType, id: string): Promise<void>;
    private applyText;
    subtitleVisible(visible: boolean): Promise<void>;
    addTextTrack(track: TextTrackSource): Promise<void>;
    addSubtitle(asset: SubtitleAsset): Promise<void>;
    resize(width: number, height: number): void;
    audioDiagnostics(): {
        source: string;
        state: string;
        decodedSampleCountersAvailable: boolean;
    };
    get diagnostics(): Record<string, unknown>;
    destroy(): Promise<void>;
    private dispose;
}
