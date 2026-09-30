import type { PlayerPreview } from '../preview/player-preview.js';
/** UI-only hover owner. No decoder, media seek, or playback controls live here. */
export declare class ScrubberPreview {
    private timeline;
    private panel;
    private image;
    private label;
    private api;
    private controller?;
    private presentation?;
    private presentingImage?;
    private pending?;
    private displayedImage?;
    private serial;
    private url?;
    private readonly move;
    constructor(timeline: HTMLInputElement, panel: HTMLElement, image: HTMLImageElement, label: HTMLElement, api: () => PlayerPreview | undefined);
    private next;
    private show;
    private clearImage;
    readonly hide: () => void;
    destroy(): void;
}
