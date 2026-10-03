// SPDX-License-Identifier: Apache-2.0
export declare function remuxPackaging(video: string | null | undefined, audio: string | null | undefined, preferred?: string): {
    container: string;
    mime: string;
}[];
