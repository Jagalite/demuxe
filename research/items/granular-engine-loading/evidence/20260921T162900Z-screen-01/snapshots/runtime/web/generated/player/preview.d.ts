// SPDX-License-Identifier: GPL-3.0-or-later
import type { PreviewController } from '../preview/controller.js';
/** UI-only hover owner. No decoder, media seek, or playback controls live here. */
export declare class ScrubberPreview {
    private timeline;
    private panel;
    private image;
    private label;
    private api;
    private controller?;
    private serial;
    private url?;
    private readonly move;
    constructor(timeline: HTMLInputElement, panel: HTMLElement, image: HTMLImageElement, label: HTMLElement, api: () => PreviewController | undefined);
    private show;
    readonly hide: () => void;
    destroy(): void;
}
