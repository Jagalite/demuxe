// SPDX-License-Identifier: Apache-2.0
import { type DecodeInput, type DecodePolicy } from './decode-policy.js';
export type LegacyAdaptiveDecode = Readonly<{
    input: Readonly<DecodeInput>;
    policy: Readonly<DecodePolicy>;
    enabled: boolean;
    retired: boolean;
    reason: string;
    sampleAt: number;
    sampleDecoderDrops: number;
    sampleFrameDrops: number;
    samplePosition: number;
    streak: number;
    direction: string;
    cooldown: number;
    serial: number;
    decoderDrops: number;
    frameDrops: number;
    avsync: number;
    pausedForCache: boolean;
    speed: number;
    switching: Readonly<{
        id: number;
        policy: Readonly<DecodePolicy>;
        reason: string;
    }> | null;
}>;
export declare function initialLegacyAdaptiveDecode(input: DecodeInput, enabled?: boolean, value?: DecodePolicy): LegacyAdaptiveDecode;
export type LegacyAdaptiveInput = Readonly<{
    type: 'observe';
    name: string;
    value: string | number | boolean | null;
    now: number;
    position: number;
}> | Readonly<{
    type: 'sample';
    now: number;
    position: number;
    paused: boolean;
    pendingTarget: number | null;
}> | Readonly<{
    type: 'finish';
    id: number;
    success: boolean;
}> | Readonly<{
    type: 'reset';
    now: number;
    position: number;
}> | Readonly<{
    type: 'retire';
}>;
export declare function transitionLegacyAdaptiveDecode(state: LegacyAdaptiveDecode, input: LegacyAdaptiveInput): Readonly<{
    request?: Readonly<{
        id: number;
        options: string;
    }> | undefined;
    state: Readonly<{
        input: Readonly<DecodeInput>;
        policy: Readonly<DecodePolicy>;
        enabled: boolean;
        retired: boolean;
        reason: string;
        sampleAt: number;
        sampleDecoderDrops: number;
        sampleFrameDrops: number;
        samplePosition: number;
        streak: number;
        direction: string;
        cooldown: number;
        serial: number;
        decoderDrops: number;
        frameDrops: number;
        avsync: number;
        pausedForCache: boolean;
        speed: number;
        switching: Readonly<{
            id: number;
            policy: Readonly<DecodePolicy>;
            reason: string;
        }> | null;
    }>;
    accepted: boolean;
}>;
