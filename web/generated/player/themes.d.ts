// SPDX-License-Identifier: Apache-2.0
export declare const playerThemes: readonly ["demuxe", "light", "oled", "contrast", "paper", "terminal"];
export type PlayerTheme = typeof playerThemes[number];
export declare function isPlayerTheme(value: unknown): value is PlayerTheme;
/** Eased scrim gradient: solid behind controls, fading smoothly into the picture. */
export declare const scrimGradient: (direction: string, solid?: string) => string;
export declare const themeStyles: string;
