// SPDX-License-Identifier: Apache-2.0
import type { PlayerErrorCode } from '../../types.js';
type Request = Readonly<{
    id: number;
    retired: boolean;
}>;
export type PresentationState = Readonly<{
    disposed: boolean;
    nextRequest: number;
    targetOverride: boolean;
    fullscreen: Request | null;
    pip: (Request & Readonly<{
        kind: 'video' | 'document';
    }>) | null;
}>;
export type PresentationCommand = Readonly<{
    type: 'target';
    override: boolean;
    fullscreen: boolean;
    containsHost: boolean;
}> | Readonly<{
    type: 'fullscreen.request';
    containsHost: boolean;
    supported: boolean;
}> | Readonly<{
    type: 'fullscreen.check';
    id: number;
    containsHost: boolean;
}> | Readonly<{
    type: 'fullscreen.settled';
    id: number;
}> | Readonly<{
    type: 'fullscreen.exit';
}> | Readonly<{
    type: 'pip.request';
    kind: string;
    supported: boolean;
    eligible: boolean;
    documentOpen: boolean;
}> | Readonly<{
    type: 'pip.check';
    id: number;
    sameSurface: boolean;
    subtitles: boolean;
}> | Readonly<{
    type: 'pip.settled';
    id: number;
}> | Readonly<{
    type: 'pip.exit';
}> | Readonly<{
    type: 'destroy';
}>;
export type PresentationDecision = Readonly<{
    state: PresentationState;
    requestId?: number;
    retired?: boolean;
    error?: Readonly<{
        code: PlayerErrorCode;
        message: string;
    }>;
}>;
export declare function initialPresentationState(): PresentationState;
/** Browser observations are sampled by the caller immediately before admission
 * or completion. Requests stay pending after retirement until physical settlement. */
export declare function transitionPresentation(state: PresentationState, command: PresentationCommand): PresentationDecision;
export type PresentationObservation = Readonly<{
    fullscreen: boolean;
    documentPiP: boolean;
    videoPiP: boolean;
    mediaSession: boolean;
}>;
export declare function projectPresentation(observation: PresentationObservation): Readonly<{
    fullscreen: boolean;
    pictureInPicture: "video" | "document" | null;
    mediaSession: boolean;
}>;
export declare function presentationLocksSurface(state: PresentationState, videoPiP: boolean): boolean;
/** One lease state per owning document; actual browser resources stay in shell.
 * Installation IDs fence release/reacquisition by the same Player instance. */
export type MediaSessionLease = Readonly<{
    nextOwner: number;
    serial: number;
    owner: number | null;
    phase: 'idle' | 'installing' | 'active';
}>;
export declare function initialMediaSessionLease(): MediaSessionLease;
export declare function allocateMediaSessionOwner(state: MediaSessionLease): Readonly<{
    state: Readonly<{
        nextOwner: number;
        serial: number;
        owner: number | null;
        phase: "idle" | "installing" | "active";
    }>;
    owner: number;
}>;
export declare function ownsMediaSession(state: MediaSessionLease, owner: number, serial?: number): boolean;
export declare function transitionMediaSession(state: MediaSessionLease, command: Readonly<{
    type: 'acquire' | 'activate' | 'release';
    owner: number;
    serial?: number;
}>): Readonly<{
    state: Readonly<{
        nextOwner: number;
        serial: number;
        owner: number | null;
        phase: "idle" | "installing" | "active";
    }>;
    outcome: "retained" | "denied";
}> | Readonly<{
    state: Readonly<{
        serial: number;
        owner: number;
        phase: "installing";
        nextOwner: number;
    }>;
    outcome: "acquired";
}> | Readonly<{
    state: Readonly<{
        nextOwner: number;
        serial: number;
        owner: number | null;
        phase: "idle" | "installing" | "active";
    }>;
    outcome: "ignored";
}> | Readonly<{
    state: Readonly<{
        phase: "active";
        nextOwner: number;
        serial: number;
        owner: number | null;
    }>;
    outcome: "activated";
}> | Readonly<{
    state: Readonly<{
        owner: null;
        phase: "idle";
        nextOwner: number;
        serial: number;
    }>;
    outcome: "released";
}>;
export {};
