// SPDX-License-Identifier: Apache-2.0
import type { BufferingPolicy, QualityPolicy, StreamingState } from '../../types.js';
export type ShakaLease = Readonly<{
    epoch: number;
    id: number;
    domain: 'load' | 'quality' | 'audio' | 'selection' | 'buffering' | 'attachment';
}>;
export type ShakaSourcePolicy = Readonly<{
    format: 'hls' | 'dash';
    live: boolean;
    maxBandwidth?: number;
    representation?: string;
}>;
export type ShakaBackendState = Readonly<{
    epoch: number;
    serial: number;
    phase: 'idle' | 'opening' | 'ready' | 'failed' | 'closed';
    allocated: boolean;
    effect: ShakaLease | null;
    requests: readonly ShakaLease[];
    source: ShakaSourcePolicy | null;
    failure: number | null;
    buffering: BufferingPolicy;
    bufferingDefaults: Readonly<Record<string, number>>;
    quality: QualityPolicy;
    runtimeQuality: boolean;
    observedQuality: StreamingState['observedQuality'];
    selectionSerial: number;
    visible: boolean;
    selectedSub: string;
    audioDisabled: boolean;
    attachmentIssued: readonly number[];
    attachmentUncertain: number;
    external: readonly Readonly<{
        id: number;
        index: number;
        request?: number;
        attachmentId?: string;
    }>[];
}>;
export declare function initialShakaBackend(buffering: BufferingPolicy): ShakaBackendState;
export declare function shakaLeaseCurrent(state: ShakaBackendState, lease: ShakaLease): boolean;
export type ShakaCommand = Readonly<{
    type: 'open';
    source: ShakaSourcePolicy;
}> | Readonly<{
    type: 'begin';
    domain: Exclude<ShakaLease['domain'], 'load'>;
}> | Readonly<{
    type: 'allocate' | 'enter' | 'leave';
    lease: ShakaLease;
}> | Readonly<{
    type: 'opened' | 'failed' | 'finish';
    lease: ShakaLease;
}> | Readonly<{
    type: 'failure';
    epoch: number;
}> | Readonly<{
    type: 'defaults';
    lease: ShakaLease;
    value: Readonly<Record<string, number>>;
}> | Readonly<{
    type: 'quality';
    lease: ShakaLease;
    value: QualityPolicy;
    runtime: boolean;
}> | Readonly<{
    type: 'buffering';
    lease: ShakaLease;
    value: BufferingPolicy;
}> | Readonly<{
    type: 'selection';
    lease: ShakaLease;
    audioDisabled?: boolean;
    selectedSub?: string;
    visible?: boolean;
}> | Readonly<{
    type: 'attachment.issued';
    lease: ShakaLease;
}> | Readonly<{
    type: 'attached';
    lease: ShakaLease;
    id: number;
    attachmentId?: string;
    select: boolean;
}> | Readonly<{
    type: 'observed';
    epoch: number;
    value: StreamingState['observedQuality'];
}> | Readonly<{
    type: 'close';
}>;
export declare function transitionShakaBackend(state: ShakaBackendState, command: ShakaCommand): Readonly<{
    state: ShakaBackendState;
    accepted: boolean;
    lease?: ShakaLease;
    reason?: 'capacity';
}>;
/** Normalized observations only; Shaka objects and selection methods stay in the adapter. */
export type ShakaVariantFacts = Readonly<{
    id: number;
    active: boolean;
    audioIdentity: string;
    videoCodec: string | null;
    originalVideoId: string | null;
    originalAudioId: string | null;
    bandwidth: number;
    height: number | null;
}>;
export declare function shakaRepresentationMatches(track: ShakaVariantFacts, pin: string): boolean;
export declare function shakaQualityCandidates(state: ShakaBackendState, tracks: readonly ShakaVariantFacts[]): readonly number[];
export declare function shakaQualityPlan(state: ShakaBackendState, tracks: readonly ShakaVariantFacts[], policy: QualityPolicy): Readonly<{
    failure?: 'source-pin' | 'no-quality';
    ids: readonly number[];
    abr: boolean;
    maxHeight: number;
    maxBandwidth: number;
}>;
export declare function shakaAttachmentSelect(state: ShakaBackendState, lease: ShakaLease): boolean;
