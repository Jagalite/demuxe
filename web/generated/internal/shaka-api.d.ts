// SPDX-License-Identifier: Apache-2.0
/** Structural contract used by the maintained Shaka adapter. Types only: core
 * builds do not install or execute Shaka. The optional provider pins its runtime. */
export declare namespace Shaka {
    namespace extern {
        type AudioTrack = {
            active: boolean;
            language: string;
            originalLanguage?: string | null;
            label: string | null;
            roles: string[];
            spatialAudio: boolean;
            accessibilityPurpose?: string | null;
            channelsCount: number | null;
            codecs: string | null;
        };
        type Track = AudioTrack & {
            id: number;
            audioLanguage?: string | null;
            audioRoles?: string[] | null;
            audioCodec: string | null;
            videoCodec: string | null;
            originalVideoId: string | null;
            originalAudioId: string | null;
            bandwidth: number;
            width: number | null;
            height: number | null;
            videoId: number | null;
            audioId?: number | null;
            frameRate: number | null;
            hdr: string | null;
        };
        type TextTrack = {
            id: number;
            active: boolean;
            codecs: string | null;
            mimeType: string | null;
            label: string | null;
            language: string;
        };
        type RetryParameters = {
            timeout: number;
            maxAttempts: number;
            [key: string]: unknown;
        };
        type Request = {
            uris: string[];
            headers: Record<string, string>;
            method: string;
            body: ArrayBuffer | ArrayBufferView | null;
            retryParameters: RetryParameters;
            drmInfo?: unknown;
            streamDataCallback?: ((data: ArrayBuffer | ArrayBufferView) => Promise<unknown>) | null;
        };
        type Response = {
            uri: string;
            originalUri: string;
            data: ArrayBuffer | ArrayBufferView;
            headers: Record<string, string>;
            status?: number;
            timeMs?: number;
            originalRequest?: Request;
        };
        interface NetworkingEngine extends EventTarget {
            registerRequestFilter(filter: RequestFilter): void;
            request(type: number, request: Request, context?: object): util.AbortableOperation<Response>;
        }
        type RequestFilter = (type: number, request: Request) => void | Promise<void>;
        type SchemePlugin = (uri: string, request: Request, type: number, progress: (elapsed: number, bytes: number, remaining: number) => void, received: (headers: Record<string, string>) => void, context: object) => util.AbortableOperation<Response>;
        type Configuration = {
            streaming: {
                bufferingGoal: number;
                rebufferingGoal: number;
                bufferBehind: number;
            };
            abr: Record<string, unknown>;
            restrictions: Record<string, unknown>;
        };
        type ImageStream = {
            id: number;
            encrypted: boolean;
            segmentIndex: object | null;
            mimeType: string;
            createSegmentIndex(): Promise<void>;
        };
        type Variant = {
            id: number;
            bandwidth: number;
            audio?: {
                id: number;
                encrypted?: boolean;
            } | null;
            video?: {
                id: number;
                encrypted?: boolean;
                segmentIndex?: {
                    find(time: number): number | null;
                    get(position: number): {
                        endTime: number;
                    } | null;
                } | null;
            } | null;
        };
        type SwitchCallback = (variant: Variant, clearBuffer?: boolean, safeMargin?: number) => void;
        type Thumbnail = {
            uris: string[];
            startByte: number;
            endByte: number | null;
            mimeType: string | null;
            positionX: number;
            positionY: number;
            width: number;
            height: number;
            startTime: number;
        };
    }
    class Player extends EventTarget {
        static version: string;
        static LoadMode: {
            MEDIA_SOURCE: number;
        };
        static isBrowserSupported(): boolean;
        constructor();
        attach(video: HTMLMediaElement): Promise<void>;
        load(uri: string, startTime?: number, mimeType?: string): Promise<void>;
        destroy(): Promise<void>;
        configure(configuration: object): boolean;
        getConfiguration(): extern.Configuration;
        getNetworkingEngine(): extern.NetworkingEngine | null;
        getLoadMode(): number;
        isDynamic(): boolean;
        isBuffering(): boolean;
        seekRange(): {
            start: number;
            end: number;
        };
        getPlayheadTimeAsDate(): Date | null;
        goToLive(): void;
        getAudioTracks(): extern.AudioTrack[];
        getVariantTracks(): extern.Track[];
        getTextTracks(): extern.TextTrack[];
        selectAudioTrack(track: extern.AudioTrack): void;
        selectVariantTrack(track: extern.Track, clearBuffer?: boolean, safeMargin?: number): void;
        selectTextTrack(track: extern.TextTrack | null): void;
        addTextTrackAsync(uri: string, language: string, kind: string, mimeType: string, codec?: string, label?: string): Promise<extern.TextTrack>;
        getManifest(): {
            imageStreams: extern.ImageStream[];
            variants?: extern.Variant[];
            presentationTimeline?: {
                getMaxSegmentDuration(): number;
            };
        } | null;
        getStats(): {
            estimatedBandwidth?: number;
        };
        getImageTracks(): {
            id: number;
            width: number | null;
        }[];
        getThumbnails(id: number, time: number): Promise<extern.Thumbnail | null>;
    }
    namespace polyfill {
        function installAll(): void;
    }
    namespace abr {
        class SimpleAbrManager {
            init(switchCallback: extern.SwitchCallback, disableStreamCallback: (...args: unknown[]) => unknown): void;
            chooseVariant(preferFastSwitching?: boolean): extern.Variant | null;
            setVariants(variants: extern.Variant[], isLowLatency?: boolean): boolean;
            getBandwidthEstimate(): number;
            stop(): void;
            release(): void;
        }
    }
    namespace net {
        namespace HttpFetchPlugin {
            const parse: extern.SchemePlugin;
        }
        namespace NetworkingEngine {
            const RequestType: {
                LICENSE: number;
                MANIFEST: number;
                SEGMENT: number;
            };
            function registerScheme(scheme: string, plugin: extern.SchemePlugin, priority?: number, progressSupport?: boolean): void;
            function defaultRetryParameters(): extern.RetryParameters;
            function makeRequest(uris: string[], retry: extern.RetryParameters): extern.Request;
        }
    }
    namespace util {
        class Error extends globalThis.Error {
            static Severity: {
                CRITICAL: number;
                RECOVERABLE: number;
            };
            static Category: {
                NETWORK: number;
            };
            static Code: {
                BAD_HTTP_STATUS: number;
                HTTP_ERROR: number;
                TIMEOUT: number;
                OPERATION_ABORTED: number;
            };
            constructor(severity: number, category: number, code: number, ...data: unknown[]);
        }
        class AbortableOperation<T> {
            constructor(promise: Promise<T>, onAbort: () => Promise<void>);
            readonly promise: Promise<T>;
            abort(): Promise<void>;
        }
    }
}
