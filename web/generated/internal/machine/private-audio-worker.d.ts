// SPDX-License-Identifier: Apache-2.0
type LoadStage = 'closing' | 'flushing' | 'flush-wait' | 'handles' | 'creating' | 'source' | 'opening' | 'loading' | 'load-wait' | 'chains' | 'loaded';
type AudioLoad = Readonly<{
    id: number;
    stage: LoadStage;
    flushPolls: number;
    loadPolls: number;
}>;
type AudioControl = Readonly<{
    id: number;
    kind: 'pause' | 'context';
    value: boolean;
}>;
export type PrivateAudioWorkerState = Readonly<{
    rpcSerial: number;
    rpcs: readonly Readonly<{
        id: number;
        bytes: number;
    }>[];
    phase: 'new' | 'initializing' | 'ready' | 'closing' | 'closed';
    initialized: boolean;
    configuredRate: number | null;
    contextRunning: boolean;
    userPaused: boolean;
    loadSerial: number;
    load: AudioLoad | null;
    controlSerial: number;
    control: AudioControl | null;
    closeStarted: boolean;
    refreshSerial: number;
    refreshes: readonly Readonly<{
        id: number;
        load: number;
        deadline: number;
    }>[];
}>;
export declare function createPrivateAudioWorker(): PrivateAudioWorkerState;
export declare function admitAudioWorkerInit(state: PrivateAudioWorkerState, rate: number, contextRunning: boolean): Readonly<{
    state: PrivateAudioWorkerState;
    error: string | null;
}>;
export declare function audioWorkerInitCurrent(state: PrivateAudioWorkerState): boolean;
export declare function finishAudioWorkerInit(state: PrivateAudioWorkerState): Readonly<{
    state: PrivateAudioWorkerState;
    accepted: boolean;
}>;
export declare function audioWorkerAccepts(state: PrivateAudioWorkerState, op: string): boolean;
export declare function retireAudioWorker(state: PrivateAudioWorkerState): Readonly<{
    state: PrivateAudioWorkerState;
    revoke: boolean;
    refreshes: readonly number[];
}>;
export declare function beginAudioWorkerClose(state: PrivateAudioWorkerState): Readonly<{
    state: PrivateAudioWorkerState;
    accepted: boolean;
}>;
export declare function finishAudioWorkerClose(state: PrivateAudioWorkerState): PrivateAudioWorkerState;
export type AudioWorkerControlEffect = Readonly<{
    kind: 'pump';
}> | Readonly<{
    kind: 'device';
    running: boolean;
}> | Readonly<{
    kind: 'native.pause';
    paused: boolean;
}>;
export declare function beginAudioWorkerControl(state: PrivateAudioWorkerState, kind: 'pause' | 'context', value: boolean): Readonly<{
    state: PrivateAudioWorkerState;
    id: number | null;
    effects: readonly AudioWorkerControlEffect[];
}>;
export declare function finishAudioWorkerControl(state: PrivateAudioWorkerState, id: number): Readonly<{
    state: PrivateAudioWorkerState;
    accepted: boolean;
    effects: readonly AudioWorkerControlEffect[];
}>;
export type AudioLoadEffect = Readonly<{
    kind: 'close' | 'sample.flush' | 'handles' | 'create' | 'source' | 'open' | 'loaded' | 'chains' | 'done';
}> | Readonly<{
    kind: 'wait';
    phase: 'flush' | 'loaded';
    ms: 5;
}> | Readonly<{
    kind: 'error';
    message: string;
}>;
export type AudioLoadInput = Readonly<{
    kind: 'closed' | 'created' | 'source.opened' | 'opened' | 'flush.waited' | 'load.waited' | 'chains';
}> | Readonly<{
    kind: 'flush';
    ack: boolean;
}> | Readonly<{
    kind: 'handles';
    live: boolean;
}> | Readonly<{
    kind: 'loaded';
    loaded: boolean;
}>;
type AudioLoadDecision = Readonly<{
    state: PrivateAudioWorkerState;
    id: number | null;
    effect: AudioLoadEffect;
    retire?: readonly number[];
}>;
export declare function beginAudioWorkerLoad(state: PrivateAudioWorkerState, replace: boolean): AudioLoadDecision;
export declare function audioWorkerLoadCurrent(state: PrivateAudioWorkerState, id: number): boolean;
export declare function advanceAudioWorkerLoad(state: PrivateAudioWorkerState, id: number, input: AudioLoadInput): AudioLoadDecision;
export declare function admitAudioWorkerRefresh(state: PrivateAudioWorkerState, load: number, now: number): Readonly<{
    state: PrivateAudioWorkerState;
    request: Readonly<{
        id: number;
        load: number;
        deadline: number;
    }> | null;
}>;
export declare function settleAudioWorkerRefresh(state: PrivateAudioWorkerState, id: number, input: Readonly<{
    kind: 'reply' | 'send-error';
} | {
    kind: 'deadline';
    now: number;
}>): Readonly<{
    state: PrivateAudioWorkerState;
    accepted: boolean;
}>;
/** RPC slots retain physical chain obligations until completion, even after retirement. */
export declare function admitAudioWorkerRPC(state: PrivateAudioWorkerState, bytes: number, closing?: boolean): Readonly<{
    state: PrivateAudioWorkerState;
    id?: number;
    error?: string;
}>;
export declare function finishAudioWorkerRPC(state: PrivateAudioWorkerState, id: number): PrivateAudioWorkerState;
export {};
