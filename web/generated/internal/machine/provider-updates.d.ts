// SPDX-License-Identifier: Apache-2.0
export type ProviderUpdates = Readonly<{
    received: number;
    consumed: number;
}>;
export type ProviderUpdateChange = Readonly<{
    kind: 'notify';
}> | Readonly<{
    kind: 'consume';
    through: number;
}>;
export declare function initialProviderUpdates(): ProviderUpdates;
export declare function providerUpdatesPending(state: ProviderUpdates): boolean;
export declare function transitionProviderUpdates(state: ProviderUpdates, change: ProviderUpdateChange): ProviderUpdates;
