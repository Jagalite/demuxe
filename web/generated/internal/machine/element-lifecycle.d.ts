// SPDX-License-Identifier: Apache-2.0
/** DOM connectivity and cancellation are observations; source/connection authority is pure. */
export type ElementLifecycleState = Readonly<{
    terminal: boolean;
    connection: number;
    source: number;
    attributeScheduled: boolean;
}>;
export type ElementLifecycleCommand = Readonly<{
    type: 'connect' | 'disconnect' | 'source-retire' | 'destroy' | 'schedule-attribute';
}> | Readonly<{
    type: 'connect-ready';
    connection: number;
    connected: boolean;
}> | Readonly<{
    type: 'owner-ready';
    connected: boolean;
    sameOwner: boolean;
}> | Readonly<{
    type: 'disconnect-ready';
    connection: number;
    connected: boolean;
}> | Readonly<{
    type: 'source-start';
}> | Readonly<{
    type: 'flush-attribute';
    hasOwner: boolean;
}>;
export type ElementLifecycleDecision = Readonly<{
    state: ElementLifecycleState;
    accepted: boolean;
    connection?: number;
    source?: number;
}>;
export declare function initialElementLifecycle(): ElementLifecycleState;
export declare function transitionElementLifecycle(state: ElementLifecycleState, command: ElementLifecycleCommand): ElementLifecycleDecision;
export declare function elementSourceCurrent(state: ElementLifecycleState, source: number, facts: Readonly<{
    aborted: boolean;
    sameOwner: boolean;
}>): boolean;
export type MediaElementBindingState = Readonly<{
    generation: number;
    bound: boolean;
    connection: number;
}>;
export type MediaElementBindingCommand = Readonly<{
    type: 'bind' | 'dispose' | 'connect' | 'disconnect';
}> | Readonly<{
    type: 'disconnect-ready';
    connection: number;
    connected: boolean;
}>;
export declare function initialMediaElementBinding(): MediaElementBindingState;
export declare function transitionMediaElementBinding(state: MediaElementBindingState, command: MediaElementBindingCommand): Readonly<{
    state: MediaElementBindingState;
    accepted: boolean;
}>;
export declare function mediaElementBindingCurrent(state: MediaElementBindingState, generation: number): boolean;
