// SPDX-License-Identifier: Apache-2.0
type Candidate = Readonly<{
    container: string;
    mime: string;
}>;
type Attempt = Candidate & Readonly<{
    rejected?: string;
    selected?: boolean;
}>;
type Track = Readonly<Record<string, string | number | boolean | null | undefined>>;
type WaitStage = 'sourceopen' | 'source-init' | 'target';
export type RemuxNegotiation = Readonly<{
    serial: number;
    id: number | null;
    index: number;
    selected: boolean;
    candidates: readonly Candidate[];
    lanes: readonly string[] | null;
    attempts: readonly Attempt[];
    mime: string | undefined;
    duration: number | undefined;
    tracks: readonly Track[] | undefined;
    apiHint: string | undefined;
    sourceBufferCreated: boolean;
    waitSerial: number;
    wait: Readonly<{
        id: number;
        stage: WaitStage;
        deadline: number;
    }> | null;
}>;
export declare function initialRemuxNegotiation(): RemuxNegotiation;
export declare function retireRemuxNegotiation(state: RemuxNegotiation): RemuxNegotiation;
export declare function resetRemuxNegotiation(state: RemuxNegotiation, sourceChanged?: boolean): RemuxNegotiation;
export type RemuxNegotiationCommand = Readonly<{
    type: 'start';
    candidates: readonly Candidate[];
    windowed: boolean;
    lanes?: readonly string[];
    browserSupported: boolean;
}> | Readonly<{
    type: 'candidate';
    id: number;
    rejected: readonly string[];
    support?: Readonly<{
        hint: boolean;
        type: boolean;
        lanes: boolean;
    }>;
}> | Readonly<{
    type: 'acquired';
    id: number;
}> | Readonly<{
    type: 'rejected';
    id: number;
    message: string;
}> | Readonly<{
    type: 'ready';
    target: number;
    duration: number;
    mime: string;
    tracks: readonly Track[];
    supported?: boolean;
}> | Readonly<{
    type: 'duration';
    duration: number;
}> | Readonly<{
    type: 'wait';
    stage: WaitStage;
    now: number;
}> | Readonly<{
    type: 'wait-check';
    id: number;
    now: number;
    complete: boolean;
}>;
export type RemuxNegotiationDecision = Readonly<{
    state: RemuxNegotiation;
    accepted: boolean;
    id?: number;
    action?: 'probe' | 'acquire' | 'skip' | 'selected' | 'waiting' | 'complete';
    candidate?: Candidate;
    mimes?: readonly string[];
    error?: string;
    code?: string;
    remaining?: number;
}>;
export declare function transitionRemuxNegotiation(state: RemuxNegotiation, command: RemuxNegotiationCommand): RemuxNegotiationDecision;
export {};
