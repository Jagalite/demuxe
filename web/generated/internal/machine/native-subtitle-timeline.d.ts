// SPDX-License-Identifier: Apache-2.0
export type NativeSubtitleTrack = Readonly<{
    id: string;
    mpvId: number;
    'ff-index': number;
    type: string;
    selected?: boolean;
    default?: boolean;
    external?: boolean;
    'attachment-id'?: string;
    'external-index'?: number;
    title?: string;
    lang?: string;
    codec?: string;
}>;
export type SubtitleTimelineKind = 'select' | 'seek' | 'verify' | 'add';
export type SubtitleVerification = Readonly<{
    track: number;
    external: boolean;
    width: number;
    height: number;
    samples: readonly number[];
    cursor: number;
    visible: boolean;
    phase: 'samples' | 'restore' | 'finished';
}>;
export type NativeSubtitleTimeline = Readonly<{
    serial: number;
    tracks: readonly NativeSubtitleTrack[];
    verified: number | null;
    suspended: boolean;
    queue: readonly Readonly<{
        id: number;
        kind: SubtitleTimelineKind;
    }>[];
    active: number | null;
    selection: Readonly<{
        previous: number | null;
        target: number | null;
    }> | null;
    verification: SubtitleVerification | null;
}>;
export declare function initialNativeSubtitleTimeline(): NativeSubtitleTimeline;
export type SubtitleTimelineChange = Readonly<{
    kind: 'catalog';
    tracks: readonly NativeSubtitleTrack[];
    defaultStreamIndex?: number;
}> | Readonly<{
    kind: 'admit';
    operation: SubtitleTimelineKind;
}> | Readonly<{
    kind: 'start';
}> | Readonly<{
    kind: 'finish' | 'cancel';
    id: number;
}> | Readonly<{
    kind: 'suspend';
    value: boolean;
}> | Readonly<{
    kind: 'retire';
}> | Readonly<{
    kind: 'catalog.reset';
}> | Readonly<{
    kind: 'select.begin';
    id: number;
    requested: string;
}> | Readonly<{
    kind: 'select.accept' | 'select.rollback';
    id: number;
}> | Readonly<{
    kind: 'add';
    id: number;
    mpvId: number;
    attachmentId?: string;
    title?: string;
    language?: string;
    format?: string;
}> | Readonly<{
    kind: 'remove';
    id: number;
    track: number;
}> | Readonly<{
    kind: 'verify.begin';
    id: number;
    seconds: number;
    duration: number;
    width: number;
    height: number;
}> | Readonly<{
    kind: 'verify.sample';
    id: number;
    visible: boolean;
}> | Readonly<{
    kind: 'verify.restore' | 'verify.restored' | 'verify.accept';
    id: number;
}>;
export type SubtitleTimelineDecision = Readonly<{
    state: NativeSubtitleTimeline;
    accepted: boolean;
    id?: number;
    skip?: boolean;
    error?: 'track' | 'default' | 'output';
    track?: NativeSubtitleTrack;
    trackId?: number;
}>;
export declare function subtitleTimelineCurrent(state: NativeSubtitleTimeline, id: number): boolean;
export declare function subtitleTimelineChanging(state: NativeSubtitleTimeline): boolean;
export declare function subtitleSelection(state: NativeSubtitleTimeline, id: string): NativeSubtitleTrack | undefined;
export declare function subtitleVerificationNeeded(state: NativeSubtitleTimeline): boolean;
export declare function subtitleVerificationSample(state: NativeSubtitleTimeline, id: number): Readonly<{
    kind: 'sample';
    seconds: number;
    width: number;
    height: number;
} | {
    kind: 'restore';
    width: number;
    height: number;
} | {
    kind: 'complete';
}> | undefined;
export declare function transitionSubtitleTimeline(state: NativeSubtitleTimeline, input: SubtitleTimelineChange): SubtitleTimelineDecision;
