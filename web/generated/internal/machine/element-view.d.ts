// SPDX-License-Identifier: Apache-2.0
import type { PlayerState, PreparationProgress, MediaTrack, TrackTypePolicy } from '../../types.js';
import type { ElementQueueState } from './element-queue.js';
export type ElementViewState = Readonly<{
    sourceName: string;
    sourceId: number | null;
    dimensions: string;
    trackSignature: string;
    queueSignature: string;
    queueRenderSignature: string;
}>;
export declare function initialElementView(): ElementViewState;
export type ElementViewCommand = Readonly<{
    type: 'source';
    name: string;
    sourceId: number | null;
}> | Readonly<{
    type: 'observe-source';
    sourceId: number | null;
}> | Readonly<{
    type: 'reset-owner';
}> | Readonly<{
    type: 'geometry';
    ratio: number | null | undefined;
    pending: boolean;
    width: number;
    height: number;
}> | Readonly<{
    type: 'tracks';
    audio: PlayerState['audioTracks'];
    subtitles: PlayerState['subtitleTracks'];
    policy: PlayerState['trackPolicy'];
}> | Readonly<{
    type: 'queue';
    queue: ElementQueueState;
    pending: boolean;
    sourceControls: boolean;
    labels: Readonly<Record<string, string>>;
}>;
export type ElementViewDecision = Readonly<{
    state: ElementViewState;
    changed?: boolean;
    rebuild?: boolean;
    resize?: Readonly<{
        width: number;
        height: number;
    }>;
    clearAspect?: boolean;
    aspect?: number;
}>;
export declare function transitionElementView(state: ElementViewState, command: ElementViewCommand): ElementViewDecision;
export declare function elementTitle(state: ElementViewState, facts: Readonly<{
    mode: string;
    title: string;
    terminal: boolean;
    connected: boolean;
    hasSource: boolean;
    loadedLabel: string;
    emptyLabel: string;
}>): Readonly<{
    title: string;
    source: string;
}>;
export declare function elementTrackOptions(list: readonly MediaTrack[], policy: TrackTypePolicy | undefined, labels: Readonly<{
    automatic: string;
    off: string;
}>): Readonly<{
    options: readonly Readonly<{
        label: string;
        id: string;
    }>[];
    value: string;
    disabled: boolean;
}>;
export declare function elementActivity(state: PlayerState, preparation: readonly PreparationProgress[], openingStage: string, labels: Readonly<Record<string, string>>): Readonly<{
    activity: string;
    pill: string;
    complete: false;
    description: string;
    announcement: string;
}>;
