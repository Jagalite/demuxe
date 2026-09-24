// SPDX-License-Identifier: Apache-2.0
import type { BufferingPolicy, BufferingResolution } from '../types.js';
import type { AudioOutput, FontAsset, ResourceLimits, SubtitleAsset, MediaInputOptions, StreamingOptions } from '../types.js';
import type { ExternalDecodeIntent } from './external-decoder-selection.js';
import type { DecodeQuality } from './decode-policy.js';
export type PlayerEvent = {
    event: string;
    id?: number;
    name?: string;
    data?: unknown;
    error?: string;
    [key: string]: unknown;
};
export type RemoteSource = MediaInputOptions & {
    streaming?: StreamingOptions;
    url: string;
    format?: 'file' | 'hls' | 'dash';
    headers?: Record<string, string>;
    credentials?: RequestCredentials;
    allowedOrigins?: string[];
    immutable?: boolean;
    refreshAuthorization?: (resource?: {
        url: string;
    }) => Promise<{
        url?: string;
        headers?: Record<string, string>;
    }>;
};
export type PlayerDiagnostics = {
    buffering?: BufferingResolution;
    path: 'wasm';
    presentation?: {
        position?: number;
        pts?: number[];
        retained?: number;
        pending?: number;
        received?: number;
        closed?: number;
    };
    decoder?: 'software' | 'webcodecs' | 'webgpu';
    decoderBackend?: 'ffmpeg' | 'webcodecs' | 'webgpu';
    webgpu?: {
        available: boolean;
        selected: boolean;
        codec: string | null;
        decodeIntent?: ExternalDecodeIntent | null;
        queuedPackets: number;
        retainedFrames: number;
        liveSurfaces: number;
        surfaceBytes: number;
        pooledBufferBytes: number;
        pipelineCount: number;
        submissions: number;
        deviceLost: boolean;
    };
    decoderStats?: Record<string, number | boolean>;
    rendered: number;
    heapBytes: number;
    queuedFrames: number;
    epoch: number;
    io?: Record<string, number | string>;
    seeking?: boolean;
    position?: number;
    presentedPosition?: number;
    ioPending?: boolean;
    interruptions?: number;
    renderMs?: number;
    copyMs?: number;
};
/** One isolated software engine per player; bounded remote ranges and local File reads; ArrayBuffer inputs remain capped. */
export declare class WasmPlayer extends EventTarget {
    private loading;
    private worker;
    private workerOwner;
    private audioContext;
    private audioNode?;
    private analyser?;
    private gainNode?;
    private gainValue;
    private timing?;
    private lastTiming?;
    private nextId;
    private pending;
    private destroyed;
    private destruction?;
    private onDestroyed?;
    private readyTimer?;
    private rejectReady?;
    private eventWaiters;
    private hasFile;
    private seekObservation?;
    private opening;
    private refreshAuthorization?;
    private audioHeader;
    private outputChannels;
    private requestedOutput;
    private deviceChannels;
    diagnostics?: PlayerDiagnostics;
    private buffering;
    private bufferingSettings;
    browserCodecsAbsent: boolean;
    properties: Map<string, unknown>;
    readonly ready: Promise<void>;
    constructor(canvas: HTMLCanvasElement, { prepared, buffering, disableBrowserCodecs, measureOutput, mode, softwarePresenter, audioOutput, audioFallback, resourceLimits, fonts, assetBase, decodeQuality, adaptiveFrameDrop, videoTrack, webgpuDecodeIntent }?: {
        prepared?: {
            module?: WebAssembly.Module;
            font?: ArrayBuffer;
        };
        buffering?: BufferingPolicy;
        assetBase?: URL;
        audioOutput?: AudioOutput;
        audioFallback?: 'stereo' | 'reject';
        resourceLimits?: ResourceLimits;
        fonts?: FontAsset[];
        disableBrowserCodecs?: boolean;
        measureOutput?: boolean;
        mode?: 'hybrid' | 'software';
        softwarePresenter?: 'auto' | 'rgb' | 'experimental-yuv';
        decodeQuality?: DecodeQuality;
        adaptiveFrameDrop?: boolean;
        videoTrack?: {
            codec: string;
            codecString?: string;
            webCodecsSupported?: boolean;
            width?: number;
            height?: number;
        };
        webgpuDecodeIntent?: Partial<ExternalDecodeIntent>;
    });
    private sendTiming;
    private fail;
    private request;
    open(file: File | ArrayBuffer, options?: MediaInputOptions): Promise<void>;
    openRemote(source: RemoteSource): Promise<void>;
    private waitForEvent;
    private openLocal;
    waitForPreviewPresentation(): Promise<void>;
    /** Snapshot only this private software surface after a completed presentation. */
    previewSnapshot(): Promise<{
        blob: Blob;
        time: number;
        width: number;
        height: number;
    }>;
    inspectMetadata(): Promise<void>;
    command(...args: string[]): Promise<void>;
    private setPause;
    private configureBuffering;
    play(): Promise<void>;
    pause(): Promise<void>;
    seek(seconds: number): Promise<any>;
    rate(rate: number): Promise<void>;
    volume(percent: number): Promise<void>;
    gain(value: number): Promise<void>;
    selectTrack(type: 'audio' | 'sub', id: string): Promise<void>;
    private observeSeekEvent;
    confirmSeek(target: number): Promise<boolean>;
    seekBoundary(target: number): number | undefined;
    addSubtitle(subtitle: SubtitleAsset): Promise<void>;
    subtitleVisible(visible: boolean): Promise<void>;
    resize(width: number, height: number): void;
    startupEvidence(): {
        apiHint?: string | undefined;
        metadata: boolean;
        audioDecoderConfigured: boolean;
        audioDecoded: boolean;
        audioProgress: boolean;
        videoPresented: boolean;
        decoderOutput: boolean;
    };
    audioDiagnostics(): {
        gain: number;
        gainStage: string;
        requestedOutput: AudioOutput;
        outputChannels: number;
        deviceChannels: number;
        channelLayout: string;
        state: AudioContextState;
        sampleRate: number;
        mediaFrames: number;
        underruns: number;
        rms: number;
        latencyConfidence: string;
    };
    destroy(): Promise<void>;
}
