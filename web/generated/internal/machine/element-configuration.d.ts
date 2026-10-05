// SPDX-License-Identifier: Apache-2.0
import type { PreviewOptionsData, TrackPolicy, WatchdogPolicy } from '../../types.js';
export type ElementConfiguration = Readonly<{
    sourceControls: boolean;
    diagnosticsControl: boolean;
    fileDrop: boolean;
    seekStep: number;
    autoHideDelay: number;
    trackPolicy: TrackPolicy;
    watchdogs: WatchdogPolicy;
    labels: Readonly<Record<string, string>>;
    audioPlayback: 'auto' | 'worklet';
    preview: PreviewOptionsData | false | undefined;
    configuredAsset: string | null;
    reflectionDepth: number;
}>;
export type ElementConfigurationCommand = Readonly<{
    type: 'source-controls' | 'diagnostics-control' | 'file-drop';
    value: boolean;
}> | Readonly<{
    type: 'seek-step' | 'auto-hide-delay';
    value: number;
}> | Readonly<{
    type: 'track-policy';
    value: TrackPolicy;
}> | Readonly<{
    type: 'watchdogs';
    value: WatchdogPolicy;
    terminal: boolean;
}> | Readonly<{
    type: 'labels';
    entries: readonly (readonly [string, unknown])[];
    keys: readonly string[];
}> | Readonly<{
    type: 'audio-playback';
    value: string;
    hasOwner: boolean;
}> | Readonly<{
    type: 'preview';
    value: PreviewOptionsData | false | undefined;
    hasOwner: boolean;
}> | Readonly<{
    type: 'asset-lock';
    value: string | null;
}> | Readonly<{
    type: 'reflection';
    enter: boolean;
}>;
export type ElementConfigurationDecision = Readonly<{
    state: ElementConfiguration;
    error?: Readonly<{
        code: 'INVALID_ARGUMENT' | 'ABORTED';
        message: string;
    }>;
}>;
export declare function initialElementConfiguration(watchdogs: WatchdogPolicy): ElementConfiguration;
export declare function transitionElementConfiguration(state: ElementConfiguration, command: ElementConfigurationCommand): ElementConfigurationDecision;
export declare function elementLabels(defaults: Readonly<Record<string, string>>, state: ElementConfiguration): Readonly<Record<string, string>>;
export declare function elementPreviewEnabled(state: ElementConfiguration, attributeEnabled: boolean): boolean;
