// SPDX-License-Identifier: Apache-2.0
import type { NativeControlRequest } from './native-controls.js';
export type NativeCaptionEffect = NativeCaptionRequest | NativeControlRequest;
export type NativeCaptionKind = 'browser-file' | 'browser-url' | 'overlay';
export type NativeCaptionRequest = Readonly<{
    id: number;
    epoch: number;
    kind: 'caption';
}>;
type Attachment = Readonly<{
    request: NativeCaptionRequest;
    kind: NativeCaptionKind;
    attachmentId: string | undefined;
    phase: 'pending' | 'accepted';
    deadline: number | null;
    index: number | null;
    publicId: string | null;
}>;
export type NativeCaptions = Readonly<{
    visible: boolean;
    selected: string;
    revision: number;
    selectionSerial: number;
    nextIndex: number;
    effect: NativeCaptionEffect | null;
    queued: readonly NativeCaptionEffect[];
    attachments: readonly Attachment[];
}>;
export declare function initialNativeCaptions(): NativeCaptions;
export declare function nativeCaptionCurrent(state: NativeCaptions, request: NativeCaptionRequest): boolean;
export declare function nativeCaptionAttachment(state: NativeCaptions, id: number): Attachment | undefined;
export declare function beginNativeCaption(state: NativeCaptions, request: NativeCaptionRequest, kind: NativeCaptionKind, attachmentId: string | undefined, now: number): NativeCaptions;
export declare function acceptNativeCaption(state: NativeCaptions, request: NativeCaptionRequest, publicId: string | null, select: boolean): NativeCaptions;
export declare function finishNativeCaption(state: NativeCaptions, request: NativeCaptionRequest): NativeCaptions;
export declare function retireNativeCaptions(state: NativeCaptions): NativeCaptions;
export declare function updateNativeCaptionSelection(state: NativeCaptions, change: Readonly<{
    selected?: string;
    visible?: boolean;
}>): NativeCaptions;
export declare function nativeCaptionRemaining(state: NativeCaptions, request: NativeCaptionRequest, now: number): number | undefined;
export declare function selectNativeCaptionPresentation(state: NativeCaptions, facts: Readonly<{
    overlaySelected: boolean;
    preferredIndex: number | null;
    tracks: readonly Readonly<{
        id: string;
        caption: boolean;
    }>[];
}>): Readonly<{
    overlay: boolean;
    modes: readonly ('showing' | 'disabled')[];
}>;
export declare function nativeOverlayAdmission(facts: Readonly<{
    adapted: boolean;
    adaptation: string | undefined;
    enabled: boolean;
    format: string;
}>): string | undefined;
export type NativeCaptionCue = Readonly<{
    start: number;
    end: number;
    text: string;
}>;
export declare function nativeCaptionFidelity(expected: readonly NativeCaptionCue[], actual: readonly NativeCaptionCue[], bias: number): boolean;
export declare function removeNativeCaption(state: NativeCaptions, request: NativeCaptionRequest): NativeCaptions;
export declare function nativeCaptionMaySelect(state: NativeCaptions, request: NativeCaptionRequest): boolean;
export declare function beginNativeCaptionSelection(state: NativeCaptions, id: number): NativeCaptions;
export declare function queueNativeCaptionEffect(state: NativeCaptions, request: NativeCaptionEffect, currentIds: readonly number[]): Readonly<{
    state: NativeCaptions;
    start?: NativeCaptionEffect;
}>;
export declare function finishNativeCaptionEffect(state: NativeCaptions, request: NativeCaptionEffect, currentIds: readonly number[]): Readonly<{
    state: NativeCaptions;
    start?: NativeCaptionEffect;
}>;
export {};
