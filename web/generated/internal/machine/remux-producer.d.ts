// SPDX-License-Identifier: Apache-2.0
type Candidate = Readonly<{
    container: string;
    mime: string;
}>;
export type RemuxProducerOperation = Readonly<{
    id: number;
    epoch: number;
    kind: string;
    requestId: number | undefined;
}>;
type Negotiation = Readonly<{
    candidates: readonly Candidate[];
    duration: number;
    target: number;
    decodeTarget: number;
    windowed: boolean;
}>;
export type RemuxProducer = Readonly<{
    epoch: number;
    serial: number;
    active: RemuxProducerOperation | null;
    phase: 'new' | 'initializing' | 'probed' | 'negotiating' | 'starting' | 'ready' | 'closing' | 'closed' | 'failed';
    initialized: boolean;
    negotiation: Negotiation | null;
    fragmentDelivery: string;
    progressiveEnabled: boolean;
    batchBytes: number;
    emptyBatches: number;
}>;
export declare function initialRemuxProducer(): RemuxProducer;
export declare function remuxProducerCurrent(state: RemuxProducer, operation: RemuxProducerOperation): boolean;
export type RemuxProducerCommand = Readonly<{
    type: 'begin';
    kind: string;
    requestId?: number;
    fragmentDelivery?: string;
}> | Readonly<{
    type: 'close';
}> | Readonly<{
    type: 'engine';
    operation: RemuxProducerOperation;
}> | Readonly<{
    type: 'negotiate';
    operation: RemuxProducerOperation;
    value: Negotiation;
}> | Readonly<{
    type: 'select';
    operation: RemuxProducerOperation;
    container: string;
    preparationInterface: number | undefined;
}> | Readonly<{
    type: 'bytes';
    operation: RemuxProducerOperation;
    bytes: number;
}> | Readonly<{
    type: 'batch';
    operation: RemuxProducerOperation;
    progressive: boolean;
    chunks: number;
    more?: number;
}> | Readonly<{
    type: 'finish';
    operation: RemuxProducerOperation;
}> | Readonly<{
    type: 'failure';
    operation: RemuxProducerOperation;
}>;
export type RemuxProducerDecision = Readonly<{
    state: RemuxProducer;
    accepted: boolean;
    operation?: RemuxProducerOperation;
    error?: string;
    selected?: Candidate;
    negotiation?: Negotiation;
    mode?: 'gather' | 'separate' | 'progressive';
    bytes?: number;
    closeNative?: boolean;
}>;
export declare function transitionRemuxProducer(state: RemuxProducer, command: RemuxProducerCommand): RemuxProducerDecision;
export declare function remuxProducerTail(facts: Readonly<{
    adaptation: string | undefined;
    duration: number;
    target: number;
    videoEnd: number | undefined;
    audioEnd: number | undefined;
    pcmAudio: boolean;
    h264Video: boolean;
}>): Readonly<{
    duration: number;
    decodeTarget: number;
    windowed: boolean;
    error?: string;
}>;
export {};
