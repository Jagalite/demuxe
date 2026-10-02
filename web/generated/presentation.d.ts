import type { Player } from './unified-player.js';
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
        pictureInPicture: "video" | "document" | null;
        mediaSession: boolean;
    }>;
    get locksSurface(): boolean;
    requestFullscreen(): Promise<void>;
    exitFullscreen(): Promise<void>;
    requestPictureInPicture(kind?: 'video' | 'document'): Promise<void>;
    exitPictureInPicture(): Promise<void>;
    private mediaSession;
    setMediaSessionEnabled(enabled: boolean): void;
    private releaseMediaSession;
    destroy(): Promise<void>;
}
