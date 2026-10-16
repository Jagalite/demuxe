// SPDX-License-Identifier: Apache-2.0
/** Presentation options belong to the element, never the playback engine. */
export declare const playerLayouts: readonly ["classic", "cinema", "rail", "studio", "focus", "deck"];
export type PlayerLayout = typeof playerLayouts[number];
export type { PlayerTheme } from './themes.js';
export declare function isPlayerLayout(value: unknown): value is PlayerLayout;
export declare const playerDocks: readonly ["off", "corner"];
export type PlayerDock = typeof playerDocks[number];
/** Recompose existing controls. The stage, media host, panels and listeners survive. */
/** compact: mobile controls are active, so Classic groups its times as the framed layouts do. */
export declare function applyLayout(root: ShadowRoot, layout: PlayerLayout, hasSource?: boolean, compact?: boolean): void;
export declare const presentationStyles: string;
