// SPDX-License-Identifier: Apache-2.0
import type { PlayerPreview } from '../preview/player-preview.js';
/** UI-only hover owner. No decoder, media seek, or playback controls live here. */
export declare class ScrubberPreview {
    private timeline;
    private panel;
    private image;
    private label;
    private api;
    private targetLabel?;
    private control;
    private generators;
    private presentations;
    private ownerIds;
    private imageIds;
    private pendingApi?;
    private intentApi?;
    private displayedURL?;
    private settleTimer?;
    private cancelSettle;
    private transition;
    private identity;
    private abort;
    private applyClear;
    private readonly move;
    constructor(timeline: HTMLInputElement, panel: HTMLElement, image: HTMLImageElement, label: HTMLElement, api: () => PlayerPreview | undefined, targetLabel?: HTMLElement | undefined);
    /** The component publishes source identity and decoder eligibility after its
     * timeline attributes are current. Retain intent, never a stale DOM event. */
    observe(sourceId: number | null, eligible: boolean): void;
    private distance;
    private sample;
    private next;
    private show;
    private clearImage;
    readonly hide: () => void;
    destroy(): void;
}
