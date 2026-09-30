import type { Probe } from './selection.js';
export type ComponentPreparedAudio = {
    file: Blob;
    tracks: {
        id: string;
        type: string;
        codec: string;
        selected: boolean;
    }[];
    diagnostics: Record<string, unknown>;
};
type RepairCodec = 'truehd' | 'mlp' | 'dts-hd';
export type CodecPreparation = Readonly<{
    providerId: string;
    folder: string;
    wasmPath: string;
    runtime: 'jspi' | 'asyncify';
    audioIndex?: number;
    videoIndex?: number;
}>;
export interface ProviderRuntimeAssets {
    module(path: string): Promise<WebAssembly.Module>;
    bytes(path: string): Promise<ArrayBuffer>;
    preparation?(file: File, runtime: 'pthread' | 'jspi' | 'asyncify', audioTrack?: number): CodecPreparation | undefined;
    prepareAudio?(file: File, signal: AbortSignal): Promise<ComponentPreparedAudio | undefined>;
}
/** Per-player deployment state. Only the maintained finite recipes are admitted;
 * packaging metadata cannot add compositions or confer build qualification. */
export declare class ProviderRuntime implements ProviderRuntimeAssets {
    private base;
    private qualified;
    private controller;
    private deployment?;
    private loading?;
    private assets?;
    private modules;
    private acquiredBytes;
    private readonly sources;
    private nextSource;
    private codecHints;
    private codecProbes;
    codecInspector(runtime: 'pthread' | 'jspi' | 'asyncify'): CodecPreparation | undefined;
    codecPreparation(source: object, probe: Probe | undefined, runtime: 'pthread' | 'jspi' | 'asyncify', aid?: string): CodecPreparation | undefined;
    preparation(file: File, runtime: 'pthread' | 'jspi' | 'asyncify', audioTrack?: number): CodecPreparation | undefined;
    private manifestIdentities;
    constructor(base: URL, qualified: Readonly<Record<string, string>>);
    load(): Promise<void>;
    /** Legacy role names can share the single mpv engine. Prefer an explicitly
     * deployed legacy artifact when both layouts are present. */
    private assetPath;
    has(path: string): boolean;
    hasOffer(providerId: string, profile: string): boolean;
    /** A bounded implementation choice inside the existing FLAC24 plan. This
     * does not admit new playback plans, tracks, subtitles or output policies. */
    audioRepairCandidate(source: object, probe?: Probe): {
        codec: RepairCodec;
        channels: 2 | 6 | 8;
    } | undefined;
    private audioProfileRejection;
    prepareAudio(file: File, signal: AbortSignal): Promise<ComponentPreparedAudio | undefined>;
    private evidence;
    /** The caller invokes this only after existing semantic/source admission.
     * Evidence is scoped to source identity, selected settings and runtime. It
     * binds to the core's reviewed implementation registry, never manifest offers. */
    rejection(planId: string, source: object, configuration: string, runtime?: 'pthread' | 'jspi' | 'asyncify', probe?: Probe, aid?: string): string | undefined;
    bytes(path: string): Promise<ArrayBuffer>;
    private acquire;
    module(path: string): Promise<WebAssembly.Module>;
    destroy(): Promise<void>;
}
export {};
