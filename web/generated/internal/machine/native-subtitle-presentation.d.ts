// SPDX-License-Identifier: Apache-2.0
export type SubtitleScheduler = 'deadline' | 'animated' | 'fallback';
export type SubtitlePlaybackFacts = Readonly<{
    paused: boolean;
    ended: boolean;
    hidden: boolean;
}>;
export type SubtitleRender = Readonly<{
    id: number;
    revision: number;
    key: string;
    seconds: number;
    width: number;
    height: number;
    sourceWidth: number;
    sourceHeight: number;
    force: boolean;
}>;
export type SubtitlePresentationStats = Readonly<{
    position: number;
    renders: number;
    bitmapUpdates: number;
    bytes: number;
    peakBytes: number;
    discarded: number;
    stateUpdates: number;
    scheduler: string;
}>;
export type NativeSubtitlePresentation = Readonly<{
    serial: number;
    revision: number;
    timingEpoch: number;
    deadlineEpoch: number;
    mode: SubtitleScheduler;
    enabled: boolean;
    changing: boolean;
    frame: number | null;
    interval: number | null;
    pump: Readonly<{
        id: number;
        revision: number;
    }> | null;
    render: SubtitleRender | null;
    last: string;
    lastRevision: number;
    stats: SubtitlePresentationStats;
}>;
export declare function initialNativeSubtitlePresentation(): NativeSubtitlePresentation;
export type SubtitlePresentationChange = Readonly<{
    kind: 'mode';
    mode: unknown;
}> | Readonly<{
    kind: 'enabled';
    value: boolean;
}> | Readonly<{
    kind: 'changing';
    value: boolean;
    revise: boolean;
}> | Readonly<{
    kind: 'invalidate';
}> | Readonly<{
    kind: 'timing';
    epoch: number;
}> | Readonly<{
    kind: 'deadline';
    epoch: number;
}> | Readonly<{
    kind: 'frame.request';
}> | Readonly<{
    kind: 'frame.take';
    id: number;
}> | Readonly<{
    kind: 'interval';
    facts: SubtitlePlaybackFacts;
}> | Readonly<{
    kind: 'pump.begin';
    facts: SubtitlePlaybackFacts;
}> | Readonly<{
    kind: 'pump.finish';
    id: number;
}> | Readonly<{
    kind: 'pump.accept';
    id: number;
    deadlineEpoch: number;
}> | Readonly<{
    kind: 'render.begin';
    seconds: number;
    width: number;
    height: number;
    sourceWidth: number;
    sourceHeight: number;
}> | Readonly<{
    kind: 'render.discard';
    id: number;
}> | Readonly<{
    kind: 'render.accept';
    id: number;
    unchanged: boolean;
    size: number;
}> | Readonly<{
    kind: 'render.finish';
    id: number;
}> | Readonly<{
    kind: 'retire';
}>;
export declare function subtitlePumpRunning(state: NativeSubtitlePresentation, facts: SubtitlePlaybackFacts): boolean;
export declare function subtitleTickAllowed(state: NativeSubtitlePresentation, hidden: boolean): boolean;
export declare function subtitleRenderCurrent(state: NativeSubtitlePresentation, id: number): boolean;
export declare function subtitlePumpCurrent(state: NativeSubtitlePresentation, id: number): boolean;
export declare function subtitleTimingStale(state: NativeSubtitlePresentation, revision: number, epoch: number, unstable: boolean): boolean;
export declare function subtitleFollowFrame(state: NativeSubtitlePresentation, paused: boolean, key: string): boolean;
export declare function subtitleRetryRender(state: NativeSubtitlePresentation, revision: number): boolean;
export declare function subtitleDeadlineActive(state: NativeSubtitlePresentation, epoch: number, facts: Readonly<{
    paused: boolean;
    hidden: boolean;
}>): boolean;
export declare function subtitleDeadlineDue(state: NativeSubtitlePresentation, epoch: number, facts: Readonly<{
    paused: boolean;
    hidden: boolean;
    seconds: number;
    target: number;
}>): 'ignore' | 'invalidate' | 'pump';
export declare function transitionSubtitlePresentation(state: NativeSubtitlePresentation, input: SubtitlePresentationChange): Readonly<{
    state: NativeSubtitlePresentation;
    accepted: boolean;
}>;
export type SubtitleLayoutFacts = Readonly<{
    left: number;
    top: number;
    width: number;
    height: number;
    parentLeft: number;
    parentTop: number;
    sourceWidth: number;
    sourceHeight: number;
}>;
export declare function subtitleLayout(facts: SubtitleLayoutFacts): Readonly<{
    left: number;
    top: number;
    width: number;
    height: number;
    renderWidth: number;
    renderHeight: number;
}> | null;
