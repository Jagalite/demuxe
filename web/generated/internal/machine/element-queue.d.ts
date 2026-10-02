// SPDX-License-Identifier: Apache-2.0
/** Queue source objects belong to the shell; only opaque IDs and display metadata live here. */
export type ElementQueueItem = Readonly<{
    id: number;
    name: string;
}>;
export type ElementQueueState = Readonly<{
    items: readonly ElementQueueItem[];
    index: number;
    revision: number;
    nextItem: number;
    nextOperation: number;
    operation: number | null;
    playIntent: boolean | undefined;
    sourceId: number | null;
    endedId: number | null;
}>;
export type ElementQueueFacts = Readonly<{
    terminal: boolean;
    pending: boolean;
}>;
export type ElementQueueCommand = Readonly<{
    type: 'reset';
}> | Readonly<{
    type: 'append';
    names: readonly string[];
    terminal: boolean;
}> | Readonly<{
    type: 'start';
    index: number;
    terminal: boolean;
}> | Readonly<{
    type: 'opened';
    operation: number;
    sourceId: number | null;
    defaultPlay: boolean;
}> | Readonly<{
    type: 'settled';
    operation: number;
}> | Readonly<{
    type: 'intent';
    play: boolean;
}> | Readonly<{
    type: 'remove';
    index: number;
    sourceControls: boolean;
    pending: boolean;
}> | Readonly<{
    type: 'advance';
    status: string;
    sourceId: number | null;
} & ElementQueueFacts> | Readonly<{
    type: 'observe-source';
    sourceId: number | null;
}>;
export type ElementQueueDecision = Readonly<{
    state: ElementQueueState;
    accepted?: boolean;
    error?: 'destroyed' | 'superseded';
    operation?: number;
    itemId?: number;
    added?: readonly ElementQueueItem[];
    removedId?: number;
    activate?: number;
    play?: boolean;
    close?: boolean;
    reset?: boolean;
}>;
export declare function initialElementQueue(): ElementQueueState;
export declare function transitionElementQueue(state: ElementQueueState, command: ElementQueueCommand): ElementQueueDecision;
export declare function queueSelectionAllowed(state: ElementQueueState, facts: ElementQueueFacts): boolean;
export declare function queueClosesRollback(state: ElementQueueState, operation: number, closePreviousOnFailure: boolean): boolean;
