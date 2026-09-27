// SPDX-License-Identifier: Apache-2.0
import type { Player } from './unified-player.js';
/** Optional browser presentation controls. Calls requiring activation must come from a gesture. */
export declare class PlayerPresentation {
    private player;
    private host;
    private disposed;
    private pipRequest;
    private pipEpoch;
    private pendingVideo?;
    private pipWindow?;
    private restore?;
    private unsubscribe?;
    constructor(player: Player, host: () => HTMLElement);
    private active;
    get state(): Readonly<{
        fullscreen: boolean;
        pictureInPicture: "video" | "document" | null;
        mediaSession: boolean;
    }>;
    get locksSurface(): boolean;
    requestFullscreen(): Promise<void>;
    exitFullscreen(): Promise<void>;
    requestPictureInPicture(kind?: 'video' | 'document'): Promise<void>;
    exitPictureInPicture(): Promise<void>;
    setMediaSessionEnabled(enabled: boolean): void;
    private releaseMediaSession;
    destroy(): Promise<void>;
}
