// SPDX-License-Identifier: Apache-2.0
import type { Player } from './unified-player.js';
import { projectPresentation } from './internal/machine/presentation.js';
/** Host-owned complete-player expansion. It must preserve the composed surface. */
export interface PlayerViewportExpansionAdapter {
    readonly available: boolean;
    readonly active: boolean;
    open(): void;
    close(focus?: boolean): void;
    subscribe(listener: () => void): () => void;
}
export type PlayerPresentationSnapshot = ReturnType<typeof projectPresentation>;
/** Optional browser presentation controls. Calls requiring activation must come from a gesture. */
export declare class PlayerPresentation {
    private player;
    private host;
    private control;
    private fullscreenTarget?;
    private pipWindow?;
    private restore?;
    private subscription?;
    private leaseValue?;
    private ownerValue?;
    private documentValue?;
    private destruction?;
    private pipClose?;
    private viewport?;
    private stopViewport?;
    private observers;
    private observerCleanup;
    private metadataValue?;
    constructor(player: Player, host: () => HTMLElement);
    private get ownerDocument();
    private get lease();
    private get owner();
    private transition;
    private accept;
    private containsHost;
    /** Explicit complete-container target, including shadow-DOM composition. */
    setFullscreenTarget(target: HTMLElement | null): void;
    private fullscreenHost;
    private videoPiP;
    get state(): Readonly<{
        fullscreen: boolean;
        viewportExpanded: boolean;
        pictureInPicture: "video" | "document" | null;
        mediaSession: boolean;
    }>;
    private notify;
    private requireAlive;
    /** Immediate observation, then changes; unsubscribe never destroys the player. */
    subscribe(listener: (state: PlayerPresentationSnapshot) => void): () => void;
    get canExpandViewport(): boolean;
    /** Configure at the host boundary; standalone players have no expansion adapter. */
    setViewportExpansionAdapter(adapter: PlayerViewportExpansionAdapter | null): void;
    requestViewportExpansion(): void;
    exitViewportExpansion(): void;
    get locksSurface(): boolean;
    requestFullscreen(): Promise<void>;
    exitFullscreen(): Promise<void>;
    requestPictureInPicture(kind?: 'video' | 'document'): Promise<void>;
    exitPictureInPicture(): Promise<void>;
    /** A source ID is mandatory so asynchronous metadata from retired media is rejected. */
    setMediaSessionMetadata(metadata: MediaMetadataInit | null, sourceId: number): void;
    private mediaSession;
    setMediaSessionEnabled(enabled: boolean): void;
    private releaseMediaSession;
    destroy(): Promise<void>;
}
