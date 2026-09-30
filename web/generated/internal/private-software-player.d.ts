// SPDX-License-Identifier: Apache-2.0
import type { Backend } from './backend.js';
import type { RemoteSource, MediaInputOptions, TrackType, ResourceLimits, FontAsset, SubtitleAsset } from '../types.js';
/** Experimental finite Software Backend. Public admission has its own gates. */
export declare class PrivateSoftwarePlayer extends EventTarget implements Backend {
    private options;
    readonly properties: Map<string, unknown>;
    readonly ready: Promise<void>;
    readonly planId: string;
    diagnostics?: Record<string, any>;
    private worker;
    private context;
    private node?;
    private gainNode?;
    private analyser?;
    private loading;
    private pending;
    private nextId;
    private generation;
    private closing;
    private destruction?;
    private failed?;
    private refresh?;
    private userPaused;
    private gainValue;
    private outputVerified;
    private attachmentIds;
    private presentedDraws;
    private presentation?;
    constructor(canvas: HTMLCanvasElement, options: {
        runtime: 'jspi' | 'asyncify';
        mode?: 'software' | 'hybrid';
        channels?: 2 | 6 | 8;
        assetBase: URL;
        duration?: number;
        resourceLimits?: ResourceLimits;
        fonts?: FontAsset[];
    });
    private emit;
    private initialize;
    private latency;
    private request;
    private receive;
    private fail;
    private waitUntil;
    open(file: File | ArrayBuffer, input?: MediaInputOptions): Promise<void>;
    openRemote(source: RemoteSource): Promise<void>;
    private load;
    private syncContext;
    play(): Promise<void>;
    pause(): Promise<void>;
    seek(seconds: number): Promise<void>;
    confirmSeek(target: number): Promise<boolean>;
    rate(value: number): Promise<any>;
    volume(value: number): Promise<any>;
    gain(value: number): Promise<void>;
    selectTrack(type: TrackType, id: string): Promise<any>;
    subtitleVisible(visible: boolean): Promise<any>;
    resize(width: number, height: number): void;
    command(...args: string[]): Promise<any>;
    previewSnapshot(): Promise<{
        blob: Blob;
        time: number;
        width: number;
        height: number;
    }>;
    addSubtitle(subtitle: SubtitleAsset): Promise<void>;
    startupEvidence(): {
        metadata: boolean;
        audioDecoderConfigured: boolean;
        audioDecoded: boolean;
        audioProgress: boolean;
        videoPresented: boolean;
        decoderOutput: boolean;
    };
    verifyOutput(signal?: AbortSignal): Promise<void>;
    setAudioOutputDevice(id: string): Promise<void>;
    audioDiagnostics(): {
        state: AudioContextState;
        sampleRate: number;
        outputChannels: 2 | 8 | 6;
        gain: number;
        rms: number;
        mediaFrames: any;
        transport: any;
        outputVerified: boolean;
    };
    destroy(): Promise<void>;
}
