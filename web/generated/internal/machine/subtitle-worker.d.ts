// SPDX-License-Identifier: Apache-2.0
export type SubtitleWorkerRequest = Readonly<{
    id: number;
    epoch: number;
    method: string;
    clientId: number | string | null;
}>;
export type SubtitleWorkerRefresh = Readonly<{
    id: string;
    epoch: number;
    deadline: number;
}>;
export type SubtitleWorkerOpenWait = Readonly<{
    id: number;
    epoch: number;
    deadline: number;
}>;
export type SubtitleVisualSchedule = Readonly<{
    mode: 'deadline' | 'animated' | 'fallback';
    unstable: boolean;
    next: number | null;
    epoch: number;
}>;
export type SubtitleDeadline = Readonly<{
    epoch: number;
    lifetime: number;
    target: number;
    due: number;
}>;
export type SubtitleAttachment = Readonly<{
    id: number;
    path: string;
    bytes: number;
}>;
export type SubtitleWorkerTimeline = Readonly<{
    selected: boolean;
    lastTime: number;
    continuousFromStart: boolean;
    deadlineEpoch: number;
    deadline: SubtitleDeadline | null;
    lastTimingEpoch: number;
    nextRenderBoundary: number | null;
    scheduler: Readonly<{
        stateUpdates: number;
        nativeUpdateCalls: number;
        fullRenders: number;
        deadlineWakes: number;
    }>;
}>;
export type SubtitleAttachmentCatalog = Readonly<{
    sequence: number;
    bytes: number;
    entries: readonly SubtitleAttachment[];
    pending: Readonly<{
        request: number;
        path: string;
        bytes: number;
    }> | null;
}>;
export type SubtitleWorkerState = Readonly<{
    timeline: SubtitleWorkerTimeline;
    attachments: SubtitleAttachmentCatalog;
    phase: 'active' | 'closing' | 'closed';
    epoch: number;
    serial: number;
    initialized: boolean;
    failed: boolean;
    queue: readonly SubtitleWorkerRequest[];
    active: SubtitleWorkerRequest | null;
    openWait: SubtitleWorkerOpenWait | null;
    refreshSerial: number;
    refreshes: readonly SubtitleWorkerRefresh[];
}>;
export declare function initialSubtitleWorker(): SubtitleWorkerState;
export declare function subtitleWorkerAlive(state: SubtitleWorkerState, epoch: number): boolean;
export declare function subtitleWorkerCurrent(state: SubtitleWorkerState, request: SubtitleWorkerRequest): boolean;
export declare function admitSubtitleWorker(state: SubtitleWorkerState, method: string, clientId: number | string | null): Readonly<{
    state: SubtitleWorkerState;
    request?: SubtitleWorkerRequest;
    error?: 'capacity' | 'invalid';
}>;
export declare function startSubtitleWorker(state: SubtitleWorkerState, request: SubtitleWorkerRequest): Readonly<{
    state: SubtitleWorkerState;
    accepted: boolean;
    error?: 'initialized';
}>;
export declare function finishSubtitleWorker(state: SubtitleWorkerState, request: SubtitleWorkerRequest): SubtitleWorkerState;
export declare function failSubtitleWorker(state: SubtitleWorkerState, request: SubtitleWorkerRequest): SubtitleWorkerState;
export declare function closeSubtitleWorker(state: SubtitleWorkerState): Readonly<{
    state: SubtitleWorkerState;
    accepted: boolean;
    refreshes: readonly SubtitleWorkerRefresh[];
}>;
export declare function closedSubtitleWorker(state: SubtitleWorkerState): SubtitleWorkerState;
export declare function admitSubtitleRefresh(state: SubtitleWorkerState, epoch: number, now: number): Readonly<{
    state: SubtitleWorkerState;
    request?: SubtitleWorkerRefresh;
    error?: 'capacity';
}>;
export declare function subtitleRefreshCurrent(state: SubtitleWorkerState, request: SubtitleWorkerRefresh): boolean;
export declare function settleSubtitleRefresh(state: SubtitleWorkerState, id: string, now?: number): Readonly<{
    state: SubtitleWorkerState;
    request?: SubtitleWorkerRefresh;
    remaining?: number;
}>;
export declare function beginSubtitleOpenWait(state: SubtitleWorkerState, request: SubtitleWorkerRequest, now: number): SubtitleWorkerState;
export declare function settleSubtitleOpenWait(state: SubtitleWorkerState, id: number, now?: number): Readonly<{
    state: SubtitleWorkerState;
    accepted: boolean;
    remaining?: number;
}>;
export declare function failSubtitleWorkerLifetime(state: SubtitleWorkerState, epoch: number): SubtitleWorkerState;
/** Native status and memory observations are captured scalars; no views enter the core. */
export declare function subtitleRawTiming(status: number, next: number, epoch: number): Readonly<{
    supported: boolean;
    unstable: boolean;
    next: number | null;
    epoch: number;
}>;
export declare function subtitleVisualTiming(status: number, next: number, epoch: number, seconds: number): SubtitleVisualSchedule;
export declare function subtitleRecoverClock(state: SubtitleWorkerState, seconds: number): boolean;
export declare function subtitleSeekStart(seconds: number, recovery: number): number;
export declare function subtitleMayLearnProfile(state: SubtitleWorkerState): boolean;
export type SubtitleTimelineChange = Readonly<{
    type: 'reset';
}> | Readonly<{
    type: 'select-begin';
}> | Readonly<{
    type: 'selected';
    trackId: number;
}> | Readonly<{
    type: 'seeked';
    start: number;
}> | Readonly<{
    type: 'time';
    seconds: number;
}> | Readonly<{
    type: 'count';
    counter: 'nativeUpdateCalls' | 'stateUpdates' | 'fullRenders';
}> | Readonly<{
    type: 'rendered';
    next: number | null;
    epoch: number;
}>;
export declare function changeSubtitleTimeline(state: SubtitleWorkerState, request: SubtitleWorkerRequest, change: SubtitleTimelineChange): SubtitleWorkerState;
export declare function cancelSubtitleDeadline(state: SubtitleWorkerState): SubtitleWorkerState;
export declare function armSubtitleDeadline(state: SubtitleWorkerState, request: SubtitleWorkerRequest, snapshot: SubtitleVisualSchedule, seconds: number, rate: number, running: boolean, now: number): Readonly<{
    state: Readonly<{
        timeline: SubtitleWorkerTimeline;
        attachments: SubtitleAttachmentCatalog;
        phase: "active" | "closing" | "closed";
        epoch: number;
        serial: number;
        initialized: boolean;
        failed: boolean;
        queue: readonly SubtitleWorkerRequest[];
        active: SubtitleWorkerRequest | null;
        openWait: SubtitleWorkerOpenWait | null;
        refreshSerial: number;
        refreshes: readonly SubtitleWorkerRefresh[];
    }>;
    schedule: Readonly<{
        mode: "deadline" | "fallback" | "animated";
        unstable: boolean;
        next: number | null;
        timingEpoch: number;
        epoch: number;
    }>;
    deadline: null;
}> | Readonly<{
    state: Readonly<{
        timeline: Readonly<{
            deadline: Readonly<{
                epoch: number;
                lifetime: number;
                target: number;
                due: number;
            }>;
            selected: boolean;
            lastTime: number;
            continuousFromStart: boolean;
            deadlineEpoch: number;
            lastTimingEpoch: number;
            nextRenderBoundary: number | null;
            scheduler: Readonly<{
                stateUpdates: number;
                nativeUpdateCalls: number;
                fullRenders: number;
                deadlineWakes: number;
            }>;
        }>;
        attachments: SubtitleAttachmentCatalog;
        phase: "active" | "closing" | "closed";
        epoch: number;
        serial: number;
        initialized: boolean;
        failed: boolean;
        queue: readonly SubtitleWorkerRequest[];
        active: SubtitleWorkerRequest | null;
        openWait: SubtitleWorkerOpenWait | null;
        refreshSerial: number;
        refreshes: readonly SubtitleWorkerRefresh[];
    }>;
    schedule: Readonly<{
        mode: "deadline" | "fallback" | "animated";
        unstable: boolean;
        next: number | null;
        timingEpoch: number;
        epoch: number;
    }>;
    deadline: Readonly<{
        epoch: number;
        lifetime: number;
        target: number;
        due: number;
    }>;
}>;
export declare function subtitleDeadlineCurrent(state: SubtitleWorkerState, deadline: SubtitleDeadline): boolean;
export declare function settleSubtitleDeadline(state: SubtitleWorkerState, deadline: SubtitleDeadline, now: number): Readonly<{
    state: SubtitleWorkerState;
    accepted: boolean;
    remaining?: number;
}>;
export declare function completeSubtitlePump(state: SubtitleWorkerState, request: SubtitleWorkerRequest, seconds: number, timingEpoch: number, recoveredClock: boolean): Readonly<{
    state: Readonly<{
        timeline: Readonly<{
            nextRenderBoundary: number | null;
            lastTimingEpoch: number;
            selected: boolean;
            lastTime: number;
            continuousFromStart: boolean;
            deadlineEpoch: number;
            deadline: SubtitleDeadline | null;
            scheduler: Readonly<{
                stateUpdates: number;
                nativeUpdateCalls: number;
                fullRenders: number;
                deadlineWakes: number;
            }>;
        }>;
        attachments: SubtitleAttachmentCatalog;
        phase: "active" | "closing" | "closed";
        epoch: number;
        serial: number;
        initialized: boolean;
        failed: boolean;
        queue: readonly SubtitleWorkerRequest[];
        active: SubtitleWorkerRequest | null;
        openWait: SubtitleWorkerOpenWait | null;
        refreshSerial: number;
        refreshes: readonly SubtitleWorkerRefresh[];
    }>;
    timingChanged: boolean;
}>;
export declare function admitSubtitleAttachment(state: SubtitleWorkerState, request: SubtitleWorkerRequest, format: string, bytes: number, arrayBuffer: boolean): Readonly<{
    state: SubtitleWorkerState;
    path?: string;
    error?: 'invalid' | 'budget';
}>;
export declare function commitSubtitleAttachment(state: SubtitleWorkerState, request: SubtitleWorkerRequest, id: number): SubtitleWorkerState;
export declare function subtitleAttachment(state: SubtitleWorkerState, id: number): SubtitleAttachment | undefined;
export declare function removeSubtitleAttachment(state: SubtitleWorkerState, request: SubtitleWorkerRequest, id: number): SubtitleWorkerState;
