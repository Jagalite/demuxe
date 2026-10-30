// SPDX-License-Identifier: Apache-2.0
import type {MediaBunnyPreviewOptions} from './index.js';
export function createMediaBunnyPreviewProvider(options: Omit<MediaBunnyPreviewOptions,'formats'|'load'>): ReturnType<typeof import('./index.js').createMediaBunnyPreviewProvider>;
