// SPDX-License-Identifier: Apache-2.0
import type { PreparationComponent, PreparationOptions, PreparationReport, PreparationProgress } from '../types.js';
export declare function preparationComponents(value: PreparationOptions): PreparationComponent[];
/** Per-player, bounded immutable assets. No media, workers or audio devices. */
export declare class EnginePreparation {
    private base;
    private software;
    private changed;
    private controller;
    private pending;
    private modules;
    private font?;
    private phases;
    constructor(base: URL, software?: string, changed?: () => void);
    get progress(): PreparationProgress[];
    private phase;
    module(name: string): WebAssembly.Module | undefined;
    fontCopy(): ArrayBuffer | undefined;
    readyModule(name: string): Promise<WebAssembly.Module | undefined>;
    readyEngine(name: string): Promise<{
        module: WebAssembly.Module | undefined;
        font: ArrayBuffer | undefined;
    }>;
    warm(value: PreparationOptions): Promise<PreparationReport>;
    private load;
    destroy(): void;
}
