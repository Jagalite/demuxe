// SPDX-License-Identifier: Apache-2.0
import type {InputFormat} from 'mediabunny';
import type {CustomSource, InspectionOptions, MediaInspection, PreviewProvider} from 'demuxe';

export type MediaBunnyInputRuntime = Pick<typeof import('mediabunny'), 'Input' | 'CustomSource'>;
export type MediaBunnyRuntime = MediaBunnyInputRuntime & Pick<typeof import('mediabunny'), 'CanvasSink'>;
export interface MediaBunnyOptions<Runtime = MediaBunnyInputRuntime> {
  /** Explicit parser set. Never defaults to all formats. */
  formats: readonly InputFormat[];
  /** Optional deployment loader, called only when work is requested. */
  load?: () => Promise<Runtime>;
}
/** Partial A/V inspection; does not establish subtitle absence. */
export function createMediaBunnyInspector(options: MediaBunnyOptions):
  (source: CustomSource, options?: InspectionOptions) => Promise<MediaInspection>;

export interface MediaBunnyPreviewOptions extends MediaBunnyOptions<MediaBunnyRuntime> {
  /** Resolve only the current source generation. Must perform no I/O. */
  getSource: (sourceId: string) => CustomSource | null | undefined;
  priority?: number;
  maxBytes?: number;
  maxReads?: number;
  timeoutMs?: number;
}
/** Register with player.preview.addProvider; independent decoding yields to playback. */
export function createMediaBunnyPreviewProvider(options: MediaBunnyPreviewOptions): PreviewProvider;
