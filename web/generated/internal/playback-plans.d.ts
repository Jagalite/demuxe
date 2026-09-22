// SPDX-License-Identifier: Apache-2.0
import type { PlaybackMode } from '../types.js';
/** Finite execution plans; qualification is local to a feature, not a browser claim. */
export declare const PLAYBACK_PLANS: readonly Readonly<{
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-direct";
    mode: "native";
    video: "browser";
    audio: "original";
    qualification: "existing";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-remux-mpv";
    mode: "native";
    video: "packet-copy";
    audio: "packet-copy";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-remux";
    mode: "native";
    video: "packet-copy";
    audio: "packet-copy";
    qualification: "existing";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-direct-gain";
    mode: "native";
    video: "browser";
    audio: "web-audio-gain";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "shaka-mse";
    mode: "native";
    video: "browser-mse";
    audio: "browser-mse";
    qualification: "runtime-verified";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "shaka-mse-gain";
    mode: "native";
    video: "browser-mse";
    audio: "browser-mse+web-audio-gain";
    qualification: "runtime-verified";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-remux-gain";
    mode: "native";
    video: "packet-copy";
    audio: "web-audio-gain";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-flac";
    mode: "native";
    video: "packet-copy";
    audio: "flac-lossless";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-flac-gain";
    mode: "native";
    video: "packet-copy";
    audio: "flac-lossless+web-audio-gain";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-direct-ass";
    mode: "native";
    video: "browser";
    audio: "original";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-direct-ass-gain";
    mode: "native";
    video: "browser";
    audio: "original+web-audio-gain";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-remux-ass";
    mode: "native";
    video: "packet-copy";
    audio: "packet-copy";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-remux-ass-gain";
    mode: "native";
    video: "packet-copy";
    audio: "packet-copy+web-audio-gain";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-flac-ass";
    mode: "native";
    video: "packet-copy";
    audio: "flac-lossless";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-flac-ass-gain";
    mode: "native";
    video: "packet-copy";
    audio: "flac-lossless+web-audio-gain";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-opus";
    mode: "native";
    video: "packet-copy";
    audio: "opus-lossy";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-opus-gain";
    mode: "native";
    video: "packet-copy";
    audio: "opus-lossy+web-audio-gain";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "hybrid";
    mode: "hybrid";
    video: "webcodecs";
    audio: "mpv";
    qualification: "existing";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "hybrid-audio-filter";
    mode: "hybrid";
    video: "webcodecs";
    audio: "mpv-filter";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "hybrid-gain";
    mode: "hybrid";
    video: "webcodecs";
    audio: "mpv+web-audio-gain";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "hybrid-audio-filter-gain";
    mode: "hybrid";
    video: "webcodecs";
    audio: "mpv-filter+web-audio-gain";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "software-gain";
    mode: "software";
    video: "ffmpeg";
    audio: "mpv+web-audio-gain";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "software";
    mode: "software";
    video: "ffmpeg";
    audio: "mpv";
    qualification: "existing";
}>[];
export declare function qualifiedAudioFilter(chain: string): boolean;
export declare function featureRejection(mode: PlaybackMode, features: {
    vf: string;
    af: string;
    toneMapping: string;
    hybridAudioFilters?: boolean;
}): string | undefined;
export declare function executionPlan(mode: PlaybackMode, packaging: unknown, audioFilter: string, gain?: number, nativeASS?: boolean): Readonly<{
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-direct";
    mode: "native";
    video: "browser";
    audio: "original";
    qualification: "existing";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-remux-mpv";
    mode: "native";
    video: "packet-copy";
    audio: "packet-copy";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-remux";
    mode: "native";
    video: "packet-copy";
    audio: "packet-copy";
    qualification: "existing";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-direct-gain";
    mode: "native";
    video: "browser";
    audio: "web-audio-gain";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "shaka-mse";
    mode: "native";
    video: "browser-mse";
    audio: "browser-mse";
    qualification: "runtime-verified";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "shaka-mse-gain";
    mode: "native";
    video: "browser-mse";
    audio: "browser-mse+web-audio-gain";
    qualification: "runtime-verified";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-remux-gain";
    mode: "native";
    video: "packet-copy";
    audio: "web-audio-gain";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-flac";
    mode: "native";
    video: "packet-copy";
    audio: "flac-lossless";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-flac-gain";
    mode: "native";
    video: "packet-copy";
    audio: "flac-lossless+web-audio-gain";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-direct-ass";
    mode: "native";
    video: "browser";
    audio: "original";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-direct-ass-gain";
    mode: "native";
    video: "browser";
    audio: "original+web-audio-gain";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-remux-ass";
    mode: "native";
    video: "packet-copy";
    audio: "packet-copy";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-remux-ass-gain";
    mode: "native";
    video: "packet-copy";
    audio: "packet-copy+web-audio-gain";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-flac-ass";
    mode: "native";
    video: "packet-copy";
    audio: "flac-lossless";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-flac-ass-gain";
    mode: "native";
    video: "packet-copy";
    audio: "flac-lossless+web-audio-gain";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-opus";
    mode: "native";
    video: "packet-copy";
    audio: "opus-lossy";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "native-opus-gain";
    mode: "native";
    video: "packet-copy";
    audio: "opus-lossy+web-audio-gain";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "hybrid";
    mode: "hybrid";
    video: "webcodecs";
    audio: "mpv";
    qualification: "existing";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "hybrid-audio-filter";
    mode: "hybrid";
    video: "webcodecs";
    audio: "mpv-filter";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "hybrid-gain";
    mode: "hybrid";
    video: "webcodecs";
    audio: "mpv+web-audio-gain";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "hybrid-audio-filter-gain";
    mode: "hybrid";
    video: "webcodecs";
    audio: "mpv-filter+web-audio-gain";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "software-gain";
    mode: "software";
    video: "ffmpeg";
    audio: "mpv+web-audio-gain";
    qualification: "experimental";
} | {
    owners: Readonly<{
        video: "ffmpeg" | "browser-media-element" | "browser-webcodecs";
        audio: "browser-media-element" | "mpv-pcm-worklet";
        subtitle: "mpv" | "mpv-subtitle-service" | "shaka-text" | "independent-libass" | "browser-text-track";
        demux: "browser" | "mpv" | "ffmpeg-preparation+mpv-subtitle-demux" | "shaka-manifest-segments-mse" | "ffmpeg-preparation";
        presentation: "browser-media-element" | "demuxe-retained-frame";
    }>;
    source: "inspected local Matroska with one embedded ASS/SSA track" | "authorized HLS/DASH adaptive source" | "qualified random-access file and selected codec packaging" | "browser-supported source and selected tracks" | "existing mpv source/track contract";
    prerequisites: string;
    subtitles: "embedded ASS/SSA via mpv; container presentation only" | "Shaka manifest text selection and rendering" | "external ASS/SSA via pinned libass; container presentation only" | "browser text tracks" | "mpv/libass";
    fidelity: "Explicitly permitted lossy audio; no resampling/downmix; video copied" | "Selected integer audio encoded losslessly as FLAC; video copied; no downmix/resample" | "No audio encoding, downmix or resampling added by route selection; existing backend output contracts apply";
    resources: "separate bounded remux and subtitle Wasm heaps, range reads and 2 MiB subtitle tile budget; browser allocations opaque" | "Shaka buffer/scheduling policy; bounded authorized responses; browser decoder allocations are opaque" | "existing bounded remux buffers when used; browser decoder allocations are opaque" | "existing mpv allocation, PCM ring and retained-frame limits";
    fallback: "terminal" | "existing diagnosed-path fallback with source and user intent preserved";
    id: "software";
    mode: "software";
    video: "ffmpeg";
    audio: "mpv";
    qualification: "existing";
}>;
export type PlanRejectionCode = 'FEATURE_UNSUPPORTED' | 'POLICY_PROHIBITS_TRANSFORM' | 'QUALIFICATION_REQUIRED' | 'SOURCE_UNSUPPORTED' | 'DEPLOYMENT_UNAVAILABLE' | 'PLAN_NOT_REQUESTED' | 'ISOLATION_REQUIRED';
export type PlanFacts = {
    mpvSubtitles?: boolean;
    mpvSubtitleSourceQualified?: boolean;
    mpvSubtitleAVRejection?: string;
    automatic: boolean;
    vf: string;
    af: string;
    gain: number;
    toneMapping: string;
    hybridAudioFilters: boolean;
    adaptation?: 'flac' | 'opus';
    allowLossy: boolean;
    nativeASS: boolean;
    externalFormats: string[];
    browserTextTracks: boolean;
    audioOutput: string;
    nativeRemux: 'auto' | 'never' | 'always';
    manifest: boolean;
    requiresRemux: boolean;
    isolated: boolean;
    mse: boolean;
    webCodecs: boolean;
    webAudio: boolean;
    nativeSourceRejection?: string;
    remuxSourceRejection?: string;
    hybridSourceRejection?: string;
    shakaSourceRejection?: string;
    streamingFallbackRejection?: string;
    automaticLossless?: boolean;
    adaptationSourceQualified?: boolean;
    adaptationSourceRejection?: string;
};
/** Admission is executable and deliberately finite. Runtime output verification
 * still owns acceptance; browser capability signals cannot prove presentation. */
export declare function planAdmission(f: PlanFacts): {
    code?: PlanRejectionCode | undefined;
    reason?: string | undefined;
    id: "hybrid" | "software" | "native-direct" | "native-remux-mpv" | "native-remux" | "native-direct-gain" | "shaka-mse" | "shaka-mse-gain" | "native-remux-gain" | "native-flac" | "native-flac-gain" | "native-direct-ass" | "native-direct-ass-gain" | "native-remux-ass" | "native-remux-ass-gain" | "native-flac-ass" | "native-flac-ass-gain" | "native-opus" | "native-opus-gain" | "hybrid-audio-filter" | "hybrid-gain" | "hybrid-audio-filter-gain" | "software-gain";
    mode: "native" | "hybrid" | "software";
    eligible: boolean;
}[];
