// SPDX-License-Identifier: Apache-2.0
import type { PlaybackMode, TrackTypePolicy } from '../../types.js';
import type { PlayerControlState } from './state.js';
import type { PlaybackSettings } from './settings.js';
import { type PolicyTrack } from './track-policy.js';
export type AttachmentKind = 'subtitle' | 'font' | 'text';
export type AttachmentEntry = Readonly<{
    id: string;
    kind: AttachmentKind;
    bytes: number;
    sourceId: number | null;
}>;
export type AttachmentCommand = Readonly<{
    kind: 'add';
    entry: AttachmentEntry;
    select: boolean;
}> | Readonly<{
    kind: 'remove';
    id: string;
    handleKind: string;
    sourceId: number | null;
    authentic: boolean;
    selected: boolean;
}>;
export type AttachmentFacts = Readonly<{
    sourceId: number | null;
    session: number | null;
    hasSource: boolean;
    hasBackend: boolean;
    surfaceLocked: boolean;
    nativeASS: boolean;
    plan: string | undefined;
    policy?: TrackTypePolicy;
    track?: PolicyTrack;
}>;
type AttachmentRoute = 'none' | 'select' | 'replace' | 'text';
export type AttachmentTransaction = Readonly<{
    id: number;
    operation: number;
    epoch: number;
    session: number | null;
    phase: 'reading' | 'applying' | 'accepted';
    entries: readonly AttachmentEntry[];
    added?: string;
    clearSelection: boolean;
    settingsPatch: Readonly<Partial<PlaybackSettings>>;
    route: AttachmentRoute;
}>;
export type AttachmentState = Readonly<{
    serial: number;
    requestSerial: number;
    entries: readonly AttachmentEntry[];
    pending: AttachmentTransaction | null;
}>;
export declare function initialAttachments(): AttachmentState;
export type AttachmentInput = Readonly<{
    type: 'attachment.allocate';
    kind: AttachmentKind;
    file?: Readonly<{
        valid: boolean;
        format: string;
        size: number;
    }>;
}> | Readonly<{
    type: 'attachment.begin';
    command: AttachmentCommand;
    facts: AttachmentFacts;
}> | Readonly<{
    type: 'attachment.ready';
    id: number;
    bytes: number;
}> | Readonly<{
    type: 'attachment.complete' | 'attachment.failed';
    id: number;
}>;
export type AttachmentEffect = Readonly<{
    kind: 'attachment.read' | 'attachment.text';
    attachmentId: string;
}> | Readonly<{
    kind: 'attachment.select' | 'attachment.replace';
    settings: Readonly<PlaybackSettings>;
    mode: PlaybackMode;
}>;
export declare function attachmentAuthority(state: PlayerControlState, id: number): boolean;
/** Pending membership is only used to configure a hidden candidate. Accepted
 * membership and selection stay unchanged until the same atomic commit. */
export declare function candidateAttachments(state: PlayerControlState): readonly AttachmentEntry[];
export declare function attachmentPreferences(state: PlayerControlState): Readonly<{
    publicSelections: Readonly<Partial<Record<"audio" | "sub", string>>>;
    muted: boolean;
    outputDeviceId: string;
    buffering: import("../../types.js").BufferingPolicy;
    toneMapping: import("../../types.js").ToneMapping;
    subtitleDelay: number;
    audioDelay: number;
    subtitleStyle: Readonly<import("../../types.js").SubtitleStyle>;
    playbackRange: Readonly<import("../../types.js").PlaybackRange> | null;
    loopPolicy: import("../../types.js").LoopPolicy;
    qualityPolicy: import("../../types.js").QualityPolicy | null;
}>;
export declare function transitionAttachment(state: PlayerControlState, input: AttachmentInput): Readonly<{
    state: Readonly<{
        revision: number;
        attachments: AttachmentState;
        boundary: import("./playback-boundary.js").BoundaryState;
        operations: import("./operations.js").OperationState;
        playback: import("./playback.js").PlaybackControl;
        settings: Readonly<PlaybackSettings>;
        preferences: import("./settings.js").PlayerPreferences;
        settingsTransactions: import("./settings.js").SettingsTransactions;
        source: import("./source.js").SourceControl;
    }>;
    accepted: boolean;
    id: number | undefined;
    effects: readonly AttachmentEffect[];
    message: string | undefined;
    reason: string | undefined;
    retire: readonly number[];
}>;
export {};
