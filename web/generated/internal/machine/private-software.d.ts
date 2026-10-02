// SPDX-License-Identifier: Apache-2.0
import type { BufferingPolicy, AudioOutput } from '../../types.js';
export type PrivateSoftwareLoad = Readonly<{
    id: number;
    generation: number;
    phase: 'preparing' | 'loading' | 'ready';
}>;
export type PrivateSoftwareControl = Readonly<{
    id: number;
    generation: number;
    kind: 'play' | 'pause' | 'seek';
}>;
export type PrivateSoftwareAttachment = Readonly<{
    id: number;
    generation: number;
    attachmentId: string | undefined;
}>;
export type PrivateSoftwareState = Readonly<{
    stopped: boolean;
    serial: number;
    generation: number;
    load: PrivateSoftwareLoad | null;
    playback: PrivateSoftwareControl | null;
    seek: PrivateSoftwareControl | null;
    userPaused: boolean;
    gain: number;
    outputVerified: boolean;
    presentedDraws: number;
    attachments: readonly PrivateSoftwareAttachment[];
    buffering: BufferingPolicy | undefined;
}>;
export type PrivateSoftwareFacts = Readonly<{
    tracksKnown: boolean;
    trackCount: number;
    video: boolean;
    audio: boolean;
    audioCodec: boolean;
    audioWritten: number;
    audioConsumed: number;
    seeking: boolean;
    rendered: number;
    position: number;
}>;
export declare function initialPrivateSoftware(buffering?: BufferingPolicy): PrivateSoftwareState;
export declare function privateSoftwareSourceCurrent(state: PrivateSoftwareState, generation: number): boolean;
export declare function privateSoftwareLoadCurrent(state: PrivateSoftwareState, load: PrivateSoftwareLoad): boolean;
export declare function beginPrivateSoftwareLoad(state: PrivateSoftwareState): Readonly<{
    state: PrivateSoftwareState;
    load: PrivateSoftwareLoad | null;
}>;
export declare function startPrivateSoftwareLoad(state: PrivateSoftwareState, load: PrivateSoftwareLoad): PrivateSoftwareState;
export declare function finishPrivateSoftwareLoad(state: PrivateSoftwareState, load: PrivateSoftwareLoad): PrivateSoftwareState;
export declare function privateSoftwareControlCurrent(state: PrivateSoftwareState, control: PrivateSoftwareControl): boolean;
export declare function beginPrivateSoftwareControl(state: PrivateSoftwareState, kind: PrivateSoftwareControl['kind']): Readonly<{
    state: PrivateSoftwareState;
    control: PrivateSoftwareControl | null;
}>;
export declare function startPrivateSoftwareControl(state: PrivateSoftwareState, control: PrivateSoftwareControl): PrivateSoftwareState;
export declare function finishPrivateSoftwareControl(state: PrivateSoftwareState, control: PrivateSoftwareControl): PrivateSoftwareState;
export declare function acceptPrivateSoftwarePicture(state: PrivateSoftwareState, generation: number, rendered: number): PrivateSoftwareState;
export declare function privateSoftwareEvidence(state: PrivateSoftwareState, facts: PrivateSoftwareFacts): Readonly<{
    metadata: boolean;
    audioDecoderConfigured: boolean;
    audioDecoded: boolean;
    audioProgress: boolean;
    videoPresented: boolean;
    decoderOutput: boolean;
}>;
export declare function privateSoftwareReady(state: PrivateSoftwareState, facts: PrivateSoftwareFacts, kind: 'load' | 'output' | 'seek', target?: number): boolean;
export declare function acceptPrivateSoftwareOutput(state: PrivateSoftwareState, generation: number): PrivateSoftwareState;
export declare function privateSoftwareWait(state: PrivateSoftwareState, generation: number, now: number, deadline: number, ready: boolean): 'wait' | 'ready' | 'retired' | 'closed' | 'timeout';
export declare function beginPrivateSoftwareAttachment(state: PrivateSoftwareState, attachmentId: string | undefined): Readonly<{
    state: PrivateSoftwareState;
    attachment: PrivateSoftwareAttachment | null;
    previous: number;
}>;
export declare function removePrivateSoftwareAttachment(state: PrivateSoftwareState, attachment: PrivateSoftwareAttachment): PrivateSoftwareState;
export declare function acceptPrivateSoftwareSettings(state: PrivateSoftwareState, generation: number, settings: Readonly<{
    gain?: number;
    buffering?: BufferingPolicy;
}>): PrivateSoftwareState;
export declare function retirePrivateSoftware(state: PrivateSoftwareState): PrivateSoftwareState;
export declare function privateSoftwareAudioLayout(requested: AudioOutput, deviceChannels: number, rejectFallback: boolean): Readonly<{
    channels: 2 | 6 | 8;
    reject: boolean;
}>;
