// SPDX-License-Identifier: Apache-2.0
import type { PreviewStrategyData } from '../../types.js';
export type ScrubberTarget = Readonly<{
    owner: number;
    time: number;
}>;
export type ScrubberState = Readonly<{
    terminal: boolean;
    hover: number;
    serial: number;
    nextResource: number;
    nextPresentation: number;
    pending: ScrubberTarget | null;
    generation: Readonly<{
        id: number;
    } & ScrubberTarget> | null;
    presentation: Readonly<{
        id: number;
        image: number;
    }> | null;
    displayedImage: number | null;
    visible: boolean;
}>;
export type ScrubberCommand = Readonly<{
    type: 'allocate' | 'hover' | 'generate' | 'clear' | 'hide' | 'destroy';
}> | Readonly<{
    type: 'cache';
    hover: number;
    target: ScrubberTarget;
    hit: boolean;
    refine: boolean;
    defer?: boolean;
}> | Readonly<{
    type: 'generated';
    id: number;
    aborted: boolean;
    hasFrame: boolean;
}> | Readonly<{
    type: 'generation-finished';
    id: number;
}> | Readonly<{
    type: 'show';
    image: number;
}> | Readonly<{
    type: 'decoded' | 'presented' | 'presentation-finished' | 'presentation-failed' | 'deadline';
    id: number;
}>;
export type ScrubberDecision = Readonly<{
    state: ScrubberState;
    accepted?: boolean;
    id?: number;
    placeholder?: boolean;
    show?: boolean;
    clear?: boolean;
    generate?: Readonly<{
        id: number;
    } & ScrubberTarget>;
    presentation?: Readonly<{
        id: number;
        needsImage: boolean;
    }>;
    abortGeneration?: number;
    abortPresentation?: number;
}>;
export declare function initialScrubber(): ScrubberState;
export declare function transitionScrubber(state: ScrubberState, command: ScrubberCommand): ScrubberDecision;
export declare function scrubberDistance(strategy: PreviewStrategyData | null | undefined, span: number, generation?: boolean): number;
export declare function scrubberPointer(facts: Readonly<{
    touch: boolean;
    disabled: boolean;
    left: number;
    width: number;
    thumbWidth?: number;
    step?: number;
    min: number;
    max: number;
    x: number;
    parentLeft: number;
    parentWidth: number;
}>): Readonly<{
    hide: boolean;
    time?: number;
    left?: number;
}>;
