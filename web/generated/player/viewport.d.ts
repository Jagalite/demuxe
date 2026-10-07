// SPDX-License-Identifier: Apache-2.0
/** Browser-viewport expansion keeps the existing composed player in the top layer. */
export declare class ViewportExpansion {
    private host;
    private shell;
    private changed;
    private restore?;
    constructor(host: HTMLElement, shell: HTMLElement, changed: () => void);
    get active(): boolean;
    open(): void;
    close(focus?: boolean): void;
}
export declare const viewportStyles = "\n#shell:popover-open{position:fixed;inset:0;margin:0;padding:0;width:100vw;height:100dvh;max-width:none;max-height:none;border:0;border-radius:0;overflow:hidden;overscroll-behavior:contain;background:var(--demuxe-stage-background);color:var(--demuxe-foreground)}\n#shell:popover-open .stage{height:100%;width:100%;max-height:none;min-height:0;aspect-ratio:auto}\n#shell:popover-open::backdrop{background:var(--demuxe-stage-background)}\n";
