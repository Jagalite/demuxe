import type { PreviewController } from './controller.js';
/** Consumer operations on the preview lane owned by Player. */
export type PlayerPreview = Readonly<Pick<PreviewController, 'getFrame' | 'request' | 'prefetch' | 'addProvider' | 'setProviders' | 'clear'>> & {
    enabled: boolean;
    readonly diagnostics: Readonly<Omit<PreviewController['diagnostics'], 'lastFailure'> & {
        lastFailure?: Readonly<{
            provider: string;
            kind: string;
        }>;
    }>;
};
/** Keep owner controls and the controller itself out of the runtime facade. */
export declare function createPlayerPreview(controller: PreviewController): PlayerPreview;
