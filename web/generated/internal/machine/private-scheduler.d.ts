// SPDX-License-Identifier: Apache-2.0
export type CoopTask = Readonly<{
    id: number;
    slot: number | null;
    status: 'new' | 'running' | 'waiting' | 'ready' | 'done';
    root: boolean;
    detached: boolean;
    joined: boolean;
}>;
export type CoopWait = Readonly<{
    id: number;
    task: number;
    key: number | null;
    deadline: number | null;
    join: number | null;
}>;
export type CoopStats = Readonly<{
    created: number;
    completed: number;
    abandoned: number;
    suspensions: number;
    resumes: number;
    maxLive: number;
    timerWakes: number;
    signals: number;
    stackChecks: number;
}>;
export type CoopState = Readonly<{
    attachment: 'unattached' | 'attaching' | 'attached';
    slots: number;
    maxRetainedTasks: number;
    nextId: number;
    nextWait: number;
    tasks: readonly CoopTask[];
    waits: readonly CoopWait[];
    ready: readonly number[];
    free: readonly number[];
    active: number | null;
    pendingPump: boolean;
    stopped: boolean;
    stats: CoopStats;
}>;
export declare function initialCoopState(slots?: number, maxRetainedTasks?: number): CoopState;
export declare function coopTask(state: CoopState, id: number): CoopTask | undefined;
export declare function coopCanCreate(state: CoopState): boolean;
export declare function createCoopTask(state: CoopState, root: boolean): Readonly<{
    state: CoopState;
    task: CoopTask | null;
}>;
export declare function scheduleCoopPump(state: CoopState): Readonly<{
    state: CoopState;
    send: boolean;
}>;
export declare function consumeCoopPump(state: CoopState): CoopState;
export declare function startCoopTask(state: CoopState): Readonly<{
    state: CoopState;
    id: number | null;
    fresh: boolean;
}>;
export declare function parkCoopTask(state: CoopState): Readonly<{
    state: CoopState;
    wait: CoopWait | null;
}>;
export declare function bindCoopWait(state: CoopState, id: number, policy: Readonly<{
    key?: number;
    deadline?: number | null;
    join?: number;
}>): CoopState;
export declare function releaseCoopTask(state: CoopState, id: number): Readonly<{
    state: CoopState;
    accepted: boolean;
}>;
export declare function settleCoopWait(state: CoopState, id: number, kind?: 'ready' | 'signal' | 'timeout', now?: number): Readonly<{
    state: CoopState;
    accepted: boolean;
    task: number | null;
    remove: number | null;
    remaining: number | null;
    invalid: boolean;
}>;
export declare function coopConditionWaits(state: CoopState, key: number, all: boolean): readonly number[];
export declare function prepareCoopJoin(state: CoopState, id: number): Readonly<{
    state: CoopState;
    code: number;
    wait: boolean;
    remove: boolean;
}>;
export declare function detachCoopTask(state: CoopState, id: number): Readonly<{
    state: CoopState;
    code: number;
    remove: boolean;
}>;
export declare function completeCoopTask(state: CoopState, id: number): Readonly<{
    state: CoopState;
    accepted: boolean;
    wake: readonly number[];
    remove: readonly number[];
}>;
export declare function checkedCoopStack(state: CoopState): CoopState;
export declare function closeCoopState(state: CoopState): CoopState;
export declare function snapshotCoopState(state: CoopState): Readonly<CoopStats & {
    liveTasks: number;
    retainedTasks: number;
    waitKeys: number;
    freeSlots: number;
    stopped: boolean;
}>;
export declare function beginCoopAttachment(state: CoopState): Readonly<{
    state: CoopState;
    accepted: boolean;
}>;
export declare function finishCoopAttachment(state: CoopState): Readonly<{
    state: CoopState;
    accepted: boolean;
}>;
