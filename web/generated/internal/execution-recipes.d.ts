import type { PLAYBACK_PLANS } from './playback-plans.js';
import type { CapabilityRequest } from './execution-capabilities.js';
import type { CurrentProviderBinding } from './media-providers.js';
import type { ResolvableRecipe } from './provider-resolution.js';
export type PlaybackPlanId = typeof PLAYBACK_PLANS[number]['id'];
export type NativeExecutionProfile = Readonly<{
    transport: 'original' | 'prepared';
    adaptation?: 'flac' | 'opus' | 'flac24';
    selectedAudio: boolean;
    subtitles: 'none' | 'embedded' | 'external';
    mseOwner: 'auto' | 'window';
}>;
export type RecipeDescription = Readonly<{
    requirements: readonly CapabilityRequest[];
    backend: 'NativePlayer' | 'ShakaBackend' | 'WasmPlayer';
    native?: NativeExecutionProfile;
    /** Unordered catalog of current guarded alternatives. Never routing order. */
    bindings: readonly Readonly<{
        id: string;
        owner: string;
        providers: readonly CurrentProviderBinding[];
    }>[];
    synchronizationOwner: string;
    features: Readonly<{
        gain: boolean;
        audioFilter: boolean;
    }>;
}>;
/** Source-based inventory including the integrated mpv attachment migration.
 * NOT an admission list, resolver, asset
 * loader or evidence record. PLAYBACK_PLANS remains the ordered policy owner.
 * Runtime, presenter, selected tracks, source access, subtitles, filters and
 * actual output still require their existing per-source admission/verification.
 * Execution reads backend/native configuration; admission remains independent.
 * Record<> intentionally makes added/removed plan IDs a compile-time review
 * point whenever the ordered policy changes.
 */
export declare const EXECUTION_RECIPES: {
    readonly 'native-direct-mpv': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'native-direct': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'native-remux-mpv': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'native-remux': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'native-direct-gain': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'shaka-mse': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'shaka-mse-gain': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'native-remux-gain': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'native-flac': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'native-flac-gain': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'native-direct-ass': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'native-direct-ass-gain': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'native-remux-ass': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'native-remux-ass-gain': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'native-flac-ass': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'native-flac-ass-gain': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'native-opus': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'native-opus-gain': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'native-transcode-mpv': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'native-transcode-ass': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'native-transcode': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'native-video-mpv-audio': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'native-video-mpv-audio-subtitles': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly hybrid: Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'hybrid-audio-filter': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'hybrid-gain': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'hybrid-audio-filter-gain': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly 'software-gain': Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
    readonly software: Readonly<{
        requirements: readonly CapabilityRequest[];
        backend: "NativePlayer" | "ShakaBackend" | "WasmPlayer";
        native?: NativeExecutionProfile;
        /** Unordered catalog of current guarded alternatives. Never routing order. */
        bindings: readonly Readonly<{
            id: string;
            owner: string;
            providers: readonly CurrentProviderBinding[];
        }>[];
        synchronizationOwner: string;
        features: Readonly<{
            gain: boolean;
            audioFilter: boolean;
        }>;
    }>;
};
/** Total lookup for untrusted diagnostic strings; never accepts prototype keys. */
export declare function executionRecipe(planId: string | undefined): RecipeDescription | undefined;
/** Adapter for deployment/shadow resolution. Does not supply qualification:
 * source/runtime-specific evidence must still come from the admission owner.
 */
export declare function resolvableExecutionRecipe(planId: PlaybackPlanId, runtime?: 'pthread' | 'jspi' | 'asyncify'): ResolvableRecipe;
