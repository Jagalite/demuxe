// SPDX-License-Identifier: Apache-2.0
import type { SessionError } from '../../types.js';
export type ElementControlsState = Readonly<{
    idle: boolean;
    seekPreview: boolean;
    playing: boolean;
    playbackIntent: 'play' | 'pause';
    playbackStatus: string;
    seeking: boolean;
    dragging: boolean;
    stageWasIdle: boolean;
    menuOpen: boolean;
    menuTrigger: 'open-menu' | 'settings-toggle';
    diagnostics: boolean;
    diagnosticsUpdated: number;
    openingOperation: number | null;
    openingStage: string;
    previewIdentity: string;
    announcement: string;
    failure: SessionError | undefined;
}>;
export type ElementControlFacts = Readonly<{
    playing: boolean;
    pending: boolean;
    connected: boolean;
    focusVisible: boolean;
}>;
export type ElementControlsCommand = Readonly<{
    type: 'reveal';
    playing: boolean;
    delay: number;
}> | Readonly<{
    type: 'hide';
}> | Readonly<{
    type: 'hide-elapsed';
} & ElementControlFacts> | Readonly<{
    type: 'pointer-leave';
    mouse: boolean;
    terminal: boolean;
    controls: boolean;
    hasSource: boolean;
} & ElementControlFacts> | Readonly<{
    type: 'screen-press';
}> | Readonly<{
    type: 'drag';
    active: boolean;
}> | Readonly<{
    type: 'menu';
    open: boolean;
    trigger: 'open-menu' | 'settings-toggle';
    sourceControls: boolean;
}> | Readonly<{
    type: 'preview';
    identity: string;
    pending: boolean;
    controls: boolean;
    seekable: boolean;
}> | Readonly<{
    type: 'seeking';
    seeking: boolean;
}> | Readonly<{
    type: 'seek-preview-expired';
}> | Readonly<{
    type: 'playing';
    playing: boolean;
    intent: 'play' | 'pause';
    status: string;
}> | Readonly<{
    type: 'opening';
    operation: number | null;
    initialStage: string;
}> | Readonly<{
    type: 'opening-stage';
    stage: string;
}> | Readonly<{
    type: 'diagnostics';
    show: boolean;
    enabled: boolean;
    controls: boolean;
}> | Readonly<{
    type: 'diagnostics-sample';
    now: number;
    force: boolean;
    hasOwner: boolean;
}> | Readonly<{
    type: 'announce';
    text: string;
}> | Readonly<{
    type: 'error';
    error: SessionError;
}> | Readonly<{
    type: 'clear-error';
}>;
export type ElementControlsDecision = Readonly<{
    state: ElementControlsState;
    accepted?: boolean;
    changed?: boolean;
    hideAfter?: number;
    reveal?: boolean;
    seekPreviewAfter?: number;
    resetPreview?: boolean;
}>;
export declare function initialElementControls(): ElementControlsState;
export declare function transitionElementControls(state: ElementControlsState, command: ElementControlsCommand): ElementControlsDecision;
