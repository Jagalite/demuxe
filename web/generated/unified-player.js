// SPDX-License-Identifier: Apache-2.0
import { privatePlaybackRejection, readPrivatePlaybackAssets } from './internal/private-playback-admission.js';
import { providerDeploymentEnabled, qualifiedProviderIdentities } from './internal/provider-build.js';
import { ProviderRuntime } from './internal/provider-runtime.js';
import { loadProviderModule } from './internal/provider-modules.js';
import { routingRequirements, missingRoutingFacts } from './internal/probe-requirements.js';
import { bufferingPolicy, resolveBuffering } from './internal/buffering.js';
import { PlayerPresentation } from './presentation.js';
import { isCustomSource, materializeSource } from './sources.js';
import { PlaybackStatistics } from './internal/playback-statistics.js';
import { watchdogPolicy, NativeProgressWatchdog } from './internal/watchdogs.js';
import { normalizeTrackPolicy, trackAllowed, defaultTrack, assertTrackSelection, capturePolicyTrack, captureTrackPolicy } from './internal/track-policy.js';
import { plainVTT, BrowserCaptionUnsupported } from './internal/plain-vtt.js';
import { RuntimeCapabilities, compatibilityFailure, evidenceInterrupted, NativeLoadTimeout, StartupEvidenceTimeout } from './internal/runtime-capability.js';
import { MediaCapabilityQueries } from './internal/media-capabilities.js';
import { nativeBrowserCapabilities } from './internal/browser-media-capability.js';
import { featureRejection, executionPlan, qualifiedAudioFilter, planAdmission } from './internal/playback-plans.js';
import { executionRecipe } from './internal/execution-recipes.js';
import { deploymentRejectionError } from './internal/provider-deployment-errors.js';
import { EnginePreparation, preparationComponents } from './internal/engine-preparation.js';
import { TierAttempts, preferredPlans } from './internal/tier-policy.js';
import { runtimeBase } from './internal/assets.js';
import { selectRemuxRuntime, deployedRemuxRuntime } from './internal/remux-runtime.js';
import { webgpuDecoderSupported, hasQualifiedWebGPUCodecs } from './internal/webgpu-codecs.js';
import { PlayerError, playerError, redact } from './internal/errors.js';
import { freeze, tracks, trackKey, usesRemuxTracks } from './internal/state.js';
import { capturePlayerObservation } from './internal/effects/observations.js';
import { projectPlayer } from './internal/machine/selectors.js';
import { selectCapabilities } from './internal/machine/capabilities.js';
import { copyData } from './internal/machine/data.js';
import { initialPlayerControl } from './internal/machine/state.js';
import { transitionPlayer, sessionAuthority } from './internal/machine/transition.js';
import { activeOperation, pendingOperation } from './internal/machine/operations.js';
import { sourceDesiredSettings } from './internal/machine/source.js';
import { PLAYBACK_MODES } from './types.js';
import { nativeRejection, nativeManifestRejection, losslessAdaptationRejection, audioTranscodeRejection, remuxRejection } from './internal/selection.js';
import { backendPlan } from './internal/backend.js';
import { PreviewController } from './preview/controller.js';
import { createPlayerPreview } from './preview/player-preview.js';
import { SoftwarePreviewProvider } from './preview/software.js';
import { LocalVideoPreviewProvider, LocalRemuxPreviewProvider } from './preview/providers.js';
import { NativePlayer as PreviewNativePlayer } from './internal/native-player.js';
class SeekPresentationBoundary extends PlayerError {
    constructor(target, boundary) { super('INVALID_ARGUMENT', `Seek target ${target} is beyond the backend's audiovisual presentation end (${boundary}); subtitle-only seeking is not available on this plan`); }
}
import { boundaryAuthority } from './internal/machine/playback-boundary.js';
import { settingAuthority, effectiveVideoFilters } from './internal/machine/settings.js';
import { createTrace, tracePlayerTransition, selectTrace } from './internal/machine/trace.js';
const filterChain = (value) => {
    if (typeof value !== 'string' || value.length > 4096 || value.includes('\0'))
        throw new PlayerError('INVALID_ARGUMENT', 'Invalid filter chain');
    return value.trim();
};
const terminalSourceFailure = (error) => /Source transport:|representation changed|changed length|origin is not allowed|integrity|source identity|Authorization refresh|HTTP (?:401|403)|received (?:401|403)/i.test(String(error));
const modeValue = (mode) => {
    if (!PLAYBACK_MODES.includes(mode))
        throw new PlayerError('INVALID_ARGUMENT', 'Mode must be native, hybrid or software');
    return mode;
};
const dimensions = (width, height) => {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 1920 || height > 1080)
        throw new PlayerError('INVALID_ARGUMENT', 'Output dimensions must be within 1920×1080');
};
/** Three explicit playback modes. Mode/filter changes reopen transactionally. */
export class Player extends EventTarget {
    #previewController;
    #preview;
    get preview() { return this.#preview; }
    previewSource;
    ready = Promise.resolve();
    assetBase;
    providerRuntime;
    get buffering() { return this.control.preferences.buffering; }
    set buffering(value) { this.updatePreferences({ buffering: value }); }
    stateSnapshot;
    subscribers = new Set();
    publishQueued = false;
    publicationSerial = 0;
    presentation = new PlayerPresentation(this, () => this.root);
    get outputDeviceId() { return this.control.preferences.outputDeviceId; }
    set outputDeviceId(value) { this.updatePreferences({ outputDeviceId: value }); }
    get sourceSerial() { return this.control.source.serial; }
    seekRequests = new Map();
    playRequests = new Map();
    get playbackRange() { return this.control.preferences.playbackRange; }
    set playbackRange(value) { this.updatePreferences({ playbackRange: value }); }
    get loopPolicy() { return this.control.preferences.loopPolicy; }
    set loopPolicy(value) { this.updatePreferences({ loopPolicy: value }); }
    get qualityPolicy() { return this.control.preferences.qualityPolicy; }
    set qualityPolicy(value) { this.updatePreferences({ qualityPolicy: value }); }
    attachmentSerial = 0;
    attachmentHandles = new WeakSet();
    get subtitleDelay() { return this.control.preferences.subtitleDelay; }
    set subtitleDelay(value) { this.updatePreferences({ subtitleDelay: value }); }
    get audioDelay() { return this.control.preferences.audioDelay; }
    set audioDelay(value) { this.updatePreferences({ audioDelay: value }); }
    get subtitleStyle() { return this.control.preferences.subtitleStyle; }
    set subtitleStyle(value) { this.updatePreferences({ subtitleStyle: value }); }
    statistics = new PlaybackStatistics();
    operationStarted = 0;
    get publicSelections() { return new Map(Object.entries(this.candidatePreferences.publicSelections)); }
    setPublicSelection(type, key) { const selections = { ...this.control.preferences.publicSelections }; if (key === undefined)
        delete selections[type];
    else
        selections[type] = key; this.updatePreferences({ publicSelections: selections }); }
    control = initialPlayerControl();
    controlTrace = createTrace(256);
    get transitionTrace() { return selectTrace(this.controlTrace); }
    operationResources = new Map();
    dispatchControl(input) { const before = this.control, decision = transitionPlayer(before, input); this.control = decision.state; this.controlTrace = tracePlayerTransition(this.controlTrace ?? createTrace(256), input, before, decision, decision.state.revision); return decision; }
    get operationEpoch() { return this.control.operations.epoch; }
    get activeOperation() { const entry = activeOperation(this.control.operations), resources = entry && this.operationResources.get(entry.id); return entry && resources ? { ...entry, ...resources } : undefined; }
    get pendingOperation() { return pendingOperation(this.control.operations); }
    sessionError = null;
    get observedPlaying() { return this.control.playback.observedPlaying; }
    get observedWaiting() { return this.control.playback.observedWaiting; }
    get muted() { return this.control.preferences.muted; }
    set muted(value) { this.updatePreferences({ muted: value }); }
    closing;
    get currentMode() { return this.control.source.mode; }
    set currentMode(mode) { this.dispatchControl({ type: 'source.configure', mode }); }
    get automatic() { return this.control.source.automatic; }
    set automatic(automatic) { this.dispatchControl({ type: 'source.configure', automatic }); }
    attempts = [];
    runtimeCapabilities = new RuntimeCapabilities();
    tierAttempts = new TierAttempts();
    promotionTimer;
    promotionEpoch = 0;
    promotionRunning = false;
    promotionController;
    backgroundPromotion;
    tierConfiguration(settings = this.settings) { return JSON.stringify([settings.aid, settings.sid, settings.subtitles, settings.vf, settings.af, settings.gain, this.candidatePreferences.toneMapping, this.audioOutput, this.audioPlayback, this.nativeRemux, this.remuxRuntime, this.mpvSubtitles, this.nativeASS, this.fonts.length, this.subtitleAssets.length, [...this.publicSelections]]); }
    cancelPromotion() { clearTimeout(this.promotionTimer); this.promotionEpoch++; this.promotionController?.abort(); if (this.promotionRunning) {
        this.activeOperation?.controller.abort();
        this.inspection?.abort();
        void this.candidate?.backend.destroy().catch(() => { });
    } }
    schedulePromotion() {
        clearTimeout(this.promotionTimer);
        if (!this.automatic || !this.source || !this.current || this.current.error || this.destroyed)
            return;
        const epoch = this.promotionEpoch;
        this.promotionTimer = setTimeout(() => {
            if (epoch !== this.promotionEpoch || this.queued || !this.automatic || !this.source || !this.current || this.current.error || (!this.settings.pause && !this.backgroundPromotion) || this.observedWaiting)
                return;
            const controller = this.promotionController = new AbortController();
            void this.enqueue(async () => {
                if (epoch !== this.promotionEpoch || !this.source || !this.current || !this.automatic)
                    return;
                const current = this.diagnostics.plan?.id, source = this.source, settings = { ...this.settings };
                if (this.sourceInspection?.source !== source)
                    await this.select(source, settings, true, this.nativeTracks, 0, undefined, [], true);
                const inspected = this.sourceInspection;
                if (!current || !inspected || inspected.source !== source)
                    return;
                const nativeReason = nativeRejection(inspected.probe, { ...inspected.settings, subtitles: settings.subtitles, sid: settings.sid === 'no' ? 'no' : inspected.settings.sid });
                const plans = this.admissible(source, settings, this.subtitleAssets, this.nativeTracks, nativeReason, true);
                this.admissionContext = { nativeReason, automatic: true };
                this.promotionRunning = true;
                try {
                    for (const plan of preferredPlans(plans, current)) {
                        if (!settings.pause && plan.mode !== 'native')
                            continue;
                        if (this.tierAttempts.reason(source, this.tierConfiguration(settings), plan.id))
                            continue;
                        this.assertOperation();
                        try {
                            await this.replace(source, plan.mode, settings, true, this.nativeTracks, undefined, true, plan.id);
                            return;
                        }
                        catch (error) {
                            if (compatibilityFailure(error))
                                this.tierAttempts.failure(source, this.tierConfiguration(settings), plan.id, String(error));
                            else
                                return;
                        }
                    }
                }
                finally {
                    this.promotionRunning = false;
                }
                // Inspection and a no-op preference check keep the accepted session paused.
                // replace() publishes switching only when an actual handoff begins.
            }, null, controller.signal, true).catch(() => { }).finally(() => { if (this.promotionController === controller)
                this.promotionController = undefined; });
        }, 200);
    }
    mediaCapabilityQueries = new MediaCapabilityQueries(typeof navigator === 'undefined' || !navigator.mediaCapabilities?.decodingInfo ? undefined : config => navigator.mediaCapabilities.decodingInfo(config), 150, () => {
        if (this.destroyed)
            return;
        const inspected = this.sourceInspection;
        if (!inspected || inspected.source !== this.source)
            return;
        for (const plan of this.planDecisions)
            if (plan.browserCapability)
                plan.browserCapability.decodingInfo = this.mediaCapabilityQueries.cached(plan.browserCapability, inspected.probe);
        this.schedulePublish();
        if (!this.settings.pause || this.backgroundPromotion)
            this.schedulePromotion();
    });
    sourceInspection;
    fastInspectedSource;
    mpvSubtitleAssetsAvailable = false;
    selectiveAudioAssetsAvailable = false;
    selectiveAudioAssetsChecked = false;
    inspection;
    recovering = false;
    lifetime = new AbortController();
    preparation;
    preparationTask = Promise.resolve({ milliseconds: 0, assets: [] });
    recoveredSessions = new WeakSet();
    failedStreamingPlans = new WeakMap();
    audioAdaptation;
    automaticLossless = false;
    audioPlayback;
    privatePlaybackAssetsAvailable = false;
    privatePlaybackAssets;
    privatePlaybackAssetsFailure;
    transcodeAssetsAvailable = false;
    transcodeAssetsChecked = false;
    losslessInspection;
    bufferedNativeSeeks;
    hybridAudioFilters;
    nativeASS;
    mpvSubtitles;
    allowLossy = false;
    planDecisions = [];
    admissionContext = { automatic: false };
    nativeRemux;
    remuxSelection;
    remuxRuntime;
    get privateRemux() { return this.remuxRuntime !== 'pthread'; }
    selectDeployedRuntime() {
        if (!this.providerRuntime)
            return;
        this.remuxSelection = deployedRemuxRuntime(this.remuxSelection, runtime => {
            const suffix = runtime === 'pthread' ? '' : '-' + runtime;
            return this.providerRuntime.hasOffer('ffmpeg-file-preparation' + suffix, 'packet-copy') && this.providerRuntime.has(`web/engine-remux${suffix}/remux.wasm`) || !!this.providerRuntime.codecInspector(runtime);
        });
        this.remuxRuntime = this.remuxSelection.runtime;
    }
    get preparationProviderId() { return 'ffmpeg-file-preparation' + (this.privateRemux ? '-' + this.remuxRuntime : ''); }
    get canInspectFFmpeg() { return (globalThis.crossOriginIsolated === true || this.privateRemux) && (!this.providerRuntime || this.providerRuntime.hasOffer(this.preparationProviderId, 'packet-copy') && this.providerRuntime.has(`web/engine-remux${this.privateRemux ? '-' + this.remuxRuntime : ''}/remux.wasm`) || !!this.providerRuntime.codecInspector(this.remuxRuntime)); }
    softwarePresenter;
    decodeQuality;
    adaptiveFrameDrop;
    get settings() { return this.control.settings; }
    set settings(value) { this.dispatchControl({ type: 'settings.accept', value }); }
    updateSettings(value) { this.dispatchControl({ type: 'settings.change', value }); }
    updatePreferences(value) { this.dispatchControl({ type: 'preferences.change', value }); }
    get candidatePreferences() { const pending = this.control.settingsTransactions.pending; return pending?.reconfigure && pending.phase === 'applying' ? pending.preferences : this.control.preferences; }
    configuredTrackPolicy;
    get trackPolicy() { return this.source?.trackPolicy ?? this.configuredTrackPolicy; }
    audioOutput;
    audioFallback;
    get toneMapping() { return this.control.preferences.toneMapping; }
    set toneMapping(value) { this.updatePreferences({ toneMapping: value }); }
    resourceLimits;
    fonts = [];
    subtitleAssets = [];
    root;
    width;
    height;
    current;
    candidate;
    source;
    nativeTracks = [];
    queue = Promise.resolve();
    get queued() { return this.control.operations.entries.length; }
    get destroyed() { return this.control.operations.terminal; }
    destruction;
    get busy() { return this.control.source.candidate !== null; }
    empty = new Map();
    monitor;
    monitorSession;
    monitorPolicy;
    watchdogConfiguration;
    watchdogEpoch = 0;
    get watchdogs() { return this.watchdogConfiguration; }
    /** Replaces the watchdog policy immediately; omitted object fields use defaults. */
    setWatchdogs(options) {
        if (this.destroyed)
            throw new PlayerError('ABORTED', 'Player is destroyed');
        const policy = watchdogPolicy(options);
        this.watchdogConfiguration = policy;
        this.current?.backend.setWatchdogs?.(policy);
        this.candidate?.backend.setWatchdogs?.(policy);
        this.startWatchdogs();
    }
    startWatchdogs() {
        const session = this.current, mode = this.mode, policy = this.watchdogConfiguration;
        const enabled = mode === 'native' ? policy.nativeProgress : mode === 'hybrid' && policy.hybridDecoder;
        if (!session || session.error || this.destroyed || this.closing || !enabled || this.settings.pause || session.backend.properties.get('pause') === true || session.backend.properties.get('eof-reached') === true || this.root.ownerDocument.hidden) {
            this.stopWatchdogs();
            return;
        }
        if (this.monitor !== undefined && this.monitorSession === session && this.monitorPolicy === policy)
            return;
        this.stopWatchdogs();
        this.monitorSession = session;
        this.monitorPolicy = policy;
        const progress = new NativeProgressWatchdog();
        let inactiveSamples = 0, epoch = this.watchdogEpoch;
        this.monitor = setInterval(() => {
            if (epoch !== this.watchdogEpoch) {
                epoch = this.watchdogEpoch;
                progress.reset();
                inactiveSamples = 0;
            }
            const eligible = this.current === session && !session.retired && !session.error && !this.destroyed && !this.busy && !this.activeOperation && this.queued === 0 && !this.settings.pause && !this.root.ownerDocument.hidden;
            if (!eligible) {
                progress.reset();
                inactiveSamples = 0;
                return;
            }
            let error;
            if (mode === 'native') {
                const sample = session.backend.nativeProgressSample?.();
                if (!sample) {
                    progress.reset();
                    return;
                }
                sample.eligible = sample.eligible && eligible;
                const timing = this.sourceInspection?.probe.tracks.find(t => t.type === 'video' && !t.attachedPicture)?.frameTiming;
                // A declared maximum presentation gap accounts for VFR holds and
                // composition reordering; an average frame rate cannot establish this.
                if (timing && sample.time >= timing.startTime && sample.time < timing.endTime - .25)
                    sample.frameIntervalMs = 1000 * timing.maxIntervalSeconds / (sample.rate ?? 1);
                else
                    sample.frames = undefined;
                const stalled = progress.sample(performance.now(), sample, policy.nativeProgressTimeoutMs);
                if (stalled)
                    error = new PlayerError('PLAYBACK_STALLED', `Native ${stalled === 'clock' ? 'playback clock' : 'video frame counter'} stopped progressing despite buffered media`, null, null, 'session', true);
            }
            else {
                const hasVideo = session.backend.properties.get('track-list')?.some(t => t.type === 'video' && t.selected);
                const decoder = session.backend.diagnostics?.decoder;
                inactiveSamples = eligible && hasVideo && decoder === 'software' ? inactiveSamples + 1 : 0;
                if (inactiveSamples >= 4)
                    error = new PlayerError('DECODE_FAILED', 'Hybrid browser decoder became inactive for four consecutive checks');
            }
            if (!error)
                return;
            this.stopWatchdogs();
            session.error = error;
            if (this.automatic)
                this.recover(session);
            else {
                this.updateSettings({ pause: true });
                void session.backend.pause().catch(() => { });
                this.emit('error', error);
            }
        }, mode === 'native' ? 500 : 250);
    }
    stopWatchdogs() { clearInterval(this.monitor); this.monitor = undefined; this.monitorSession = undefined; this.monitorPolicy = undefined; }
    constructor(container, options = {}) {
        super();
        this.watchdogConfiguration = watchdogPolicy(options.watchdogs);
        this.configuredTrackPolicy = normalizeTrackPolicy(options.trackPolicy);
        const prepare = preparationComponents(options.prepare ?? []);
        if (typeof HTMLElement === 'undefined')
            throw new PlayerError('INVALID_ARGUMENT', 'Player construction requires a browser');
        this.buffering = bufferingPolicy(options.buffering);
        this.assetBase = runtimeBase(options.assetBase);
        if (providerDeploymentEnabled)
            this.providerRuntime = new ProviderRuntime(this.assetBase, qualifiedProviderIdentities);
        if (!(container instanceof HTMLElement) || container instanceof HTMLCanvasElement || container instanceof HTMLVideoElement)
            throw new PlayerError('INVALID_ARGUMENT', 'Pass a container element; Player owns its video/canvas surface');
        this.#previewController = new PreviewController([
            { id: 'shaka', priority: 20, canHandle: () => !!this.current?.backend.previewFrame,
                getFrame: request => this.current?.backend.previewFrame?.(request) ?? Promise.resolve(null) },
            new LocalVideoPreviewProvider(() => this.busy || this.queued > 0 || this.previewBuffering() ? undefined : this.previewSource, container.ownerDocument, options.resourceLimits?.maxDecodePixels),
            new LocalRemuxPreviewProvider(() => {
                if (this.busy || this.queued > 0 || this.previewBuffering() || !['remux', 'remux-mpv'].includes(backendPlan(this.current?.backend) ?? ''))
                    return undefined;
                return this.previewSource;
            }, container.ownerDocument, video => new PreviewNativePlayer(video, 'always', this.assetBase, false, undefined, undefined, false, [], 'native-remux', bufferingPolicy({ preload: 'auto', profile: 'low-latency', memoryBudget: 8 * 1024 * 1024 }), 2500, undefined, this.remuxRuntime, this.providerRuntime), options.resourceLimits?.maxDecodePixels),
            new SoftwarePreviewProvider(() => {
                if (this.busy || this.queued > 0 || this.previewBuffering())
                    return undefined;
                if (this.previewSource)
                    return { file: this.previewSource, input: this.source?.kind === 'local' ? this.source.input : undefined };
                if (this.source?.kind === 'remote' && !this.source.options.streaming?.live && this.stateSnapshot.streamType !== 'live')
                    return { remote: this.source.options };
                return undefined;
            }, container.ownerDocument, this.assetBase, options.resourceLimits),
        ], options.preview === false ? { enabled: false } : options.preview);
        this.#preview = createPlayerPreview(this.#previewController);
        this.currentMode = modeValue(options.mode ?? 'native');
        this.automatic = options.automaticSelection ?? options.mode === undefined;
        if (typeof this.automatic !== 'boolean')
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid automatic selection policy');
        this.audioOutput = options.audioOutput ?? 'stereo';
        this.audioFallback = options.audioFallback ?? 'stereo';
        this.toneMapping = options.toneMapping ?? 'off';
        if (!['stereo', '5.1', '7.1', 'auto'].includes(this.audioOutput) || !['stereo', 'reject'].includes(this.audioFallback))
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid audio output policy');
        if (!['off', 'hdr-to-sdr'].includes(this.toneMapping))
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid tone mapping policy');
        this.resourceLimits = { maxDecodePixels: options.resourceLimits?.maxDecodePixels ?? 8294400, maxAllocationBytes: options.resourceLimits?.maxAllocationBytes ?? 134217728 };
        if (!Number.isInteger(this.resourceLimits.maxDecodePixels) || this.resourceLimits.maxDecodePixels < 1 || this.resourceLimits.maxDecodePixels > 8294400 || !Number.isInteger(this.resourceLimits.maxAllocationBytes) || this.resourceLimits.maxAllocationBytes < 33554432 || this.resourceLimits.maxAllocationBytes > 268435456)
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid decode resource limits');
        this.audioPlayback = options.audioPlayback ?? 'auto';
        if (!['auto', 'worklet'].includes(this.audioPlayback))
            throw new PlayerError('INVALID_ARGUMENT', 'audioPlayback must be auto or worklet');
        this.audioAdaptation = options.experimentalAudioAdaptation;
        if (options.automaticAudioAdaptation !== undefined && options.automaticAudioAdaptation !== 'lossless')
            throw new PlayerError('INVALID_ARGUMENT', 'Unsupported automatic audio adaptation policy');
        this.automaticLossless = options.automaticAudioAdaptation === 'lossless';
        if (this.audioAdaptation !== undefined && this.audioAdaptation !== 'flac' && this.audioAdaptation !== 'opus')
            throw new PlayerError('INVALID_ARGUMENT', 'Unsupported audio adaptation policy');
        this.bufferedNativeSeeks = options.experimentalBufferedNativeSeeks ?? false;
        if (typeof this.bufferedNativeSeeks !== 'boolean')
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid buffered seek policy');
        this.hybridAudioFilters = options.experimentalHybridAudioFilters ?? false;
        if (typeof this.hybridAudioFilters !== 'boolean')
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid Hybrid audio filter policy');
        this.backgroundPromotion = options.experimentalBackgroundPromotion ? { ...options.experimentalBackgroundPromotion } : undefined;
        if (this.backgroundPromotion && (!Number.isSafeInteger(this.backgroundPromotion.maxKnownBytes) || this.backgroundPromotion.maxKnownBytes < 256 * 1024 * 1024))
            throw new PlayerError('INVALID_ARGUMENT', 'Background promotion needs at least 256 MiB of known-allocation budget');
        this.mpvSubtitles = options.experimentalMpvSubtitles ?? true;
        if (typeof this.mpvSubtitles !== 'boolean')
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid mpv subtitle policy');
        this.nativeASS = options.experimentalNativeASS ?? this.automatic;
        if (typeof this.nativeASS !== 'boolean')
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid Native ASS policy');
        this.allowLossy = options.allowLossyAudio ?? false;
        if (options.allowLossyAudio !== undefined && typeof options.allowLossyAudio !== 'boolean')
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid lossy audio permission');
        if (this.audioAdaptation === 'opus' && options.allowLossyAudio !== true)
            throw new PlayerError('INVALID_ARGUMENT', 'Opus adaptation requires allowLossyAudio: true');
        this.nativeRemux = options.nativeRemux ?? 'auto';
        this.remuxSelection = selectRemuxRuntime(options);
        this.remuxRuntime = this.remuxSelection.runtime;
        this.softwarePresenter = options.softwarePresenter ?? 'auto';
        this.decodeQuality = options.decodeQuality ?? 'exact';
        this.adaptiveFrameDrop = options.adaptiveFrameDrop ?? false;
        if (!['exact', 'balanced', 'performance'].includes(this.decodeQuality) || typeof this.adaptiveFrameDrop !== 'boolean')
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid Software decode policy');
        if (!['auto', 'rgb', 'experimental-yuv'].includes(this.softwarePresenter))
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid software presenter');
        if (!['auto', 'never', 'always'].includes(this.nativeRemux))
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid native remux policy');
        this.width = options.width ?? 640;
        this.height = options.height ?? 360;
        dimensions(this.width, this.height);
        this.settings = { pause: true, volume: 100, speed: 1, aid: 'auto', sid: 'auto', subtitles: true, vf: filterChain(options.videoFilters ?? ''), af: filterChain(options.audioFilters ?? ''), gain: options.audioGain ?? 1 };
        if (!Number.isFinite(this.settings.gain) || this.settings.gain < 0 || this.settings.gain > 1)
            throw new PlayerError('INVALID_ARGUMENT', 'Gain must be between 0 and 1');
        if (this.automatic && (this.settings.vf || this.settings.af || this.toneMapping !== 'off'))
            this.currentMode = this.settings.vf || this.toneMapping !== 'off' || !this.hybridAudioFilters || !qualifiedAudioFilter(this.settings.af) ? 'software' : 'hybrid';
        this.validateFilters(this.currentMode, this.settings);
        this.root = document.createElement('div');
        this.root.className = 'demuxe-player';
        container.append(this.root);
        this.root.ownerDocument.addEventListener('visibilitychange', () => { this.watchdogEpoch++; this.startWatchdogs(); }, { signal: this.lifetime.signal });
        this.publish();
        if (prepare.length)
            void this.prepare(prepare);
    }
    /** Stable composition host; internal surfaces may change between routes. */
    get host() { return this.root; }
    get isDestroyed() { return this.destroyed; }
    get state() { return this.stateSnapshot; }
    get mediaInfo() { return this.stateSnapshot.mediaInfo; }
    subscribe(listener) {
        this.subscribers.add(listener);
        this.notifySubscriber(listener, this.stateSnapshot);
        return () => { this.subscribers.delete(listener); };
    }
    addEventListener(type, listener, options) { super.addEventListener(type, listener, options); }
    removeEventListener(type, listener, options) { super.removeEventListener(type, listener, options); }
    schedulePublish() {
        if (this.publishQueued)
            return;
        this.publishQueued = true;
        queueMicrotask(() => { this.publishQueued = false; if (!this.busy)
            this.publish(); });
    }
    sessionTracks(session = this.current, source = this.source, mode = this.mode, settings = this.settings) {
        let raw = (session?.backend.properties.get('track-list') ?? []);
        if (mode === 'native' && this.sourceInspection?.source === source && this.sourceInspection) {
            const plan = backendPlan(session?.backend);
            raw = raw.map(track => {
                const key = trackKey(track, mode, plan), match = /^(audio|sub|video):stream:(\d+)$/.exec(key);
                const metadata = match ? this.sourceInspection.probe.tracks.find(t => t.type === match[1] && t.index === Number(match[2])) : undefined;
                return metadata ? { ...metadata, ...track, title: track.title || metadata.title, lang: track.lang || metadata.lang } : track;
            });
        }
        if (this.automatic && mode === 'native' && this.sourceInspection && this.sourceInspection.source === source) {
            const embedded = this.sourceInspection.probe.tracks.filter(t => t.type === 'sub' && !raw.some(r => r.type === 'sub' && r['ff-index'] === t.index));
            raw = [...raw, ...embedded.map(t => ({ ...t, id: String(t.index + 1), type: 'sub', 'ff-index': t.index, selected: false }))];
        }
        if (!this.sourceInspection || mode !== 'native' || usesRemuxTracks(backendPlan(session?.backend)) || this.sourceInspection?.source !== source)
            return raw;
        const audio = this.sourceInspection.probe.tracks.filter(t => t.type === 'audio');
        const fallback = audio.find(t => t.default) ?? audio[0];
        // Expose demux source identities even if HTMLMediaElement has no track API.
        // These are selectable requirements, not a claim of in-place browser support.
        return [...raw.filter(t => t.type !== 'audio'), ...audio.map(t => ({ ...t, id: t.id, 'ff-index': t.index, selected: settings.aid !== 'no' && t === fallback }))];
    }
    sourceTracks() { return this.sessionTracks(); }
    assertSubtitleAddition(title, language, codec) {
        const track = tracks([{ id: 'external', type: 'sub', title, lang: language, codec, external: true }], this.sourceSerial, this.mode)[0];
        assertTrackSelection(this.trackPolicy.subtitles, track.id, track);
    }
    confirmTrackSelection(session, source, mode, settings, type, id) {
        const matches = () => { const raw = this.sessionTracks(session, source, mode, settings).filter(t => t.type === type); return id === 'no' ? !raw.some(t => t.selected) : id === 'auto' || raw.some(t => String(t.id) === id && t.selected); };
        if (matches())
            return Promise.resolve();
        return new Promise((resolve, reject) => {
            const signal = this.activeOperation?.controller.signal;
            const finish = (error) => { clearTimeout(timer); session.backend.removeEventListener('mpv', check); signal?.removeEventListener('abort', abort); error ? reject(error) : resolve(); };
            const check = () => { if (matches())
                finish(); };
            const abort = () => finish(new PlayerError('ABORTED', 'Track selection aborted'));
            const timer = setTimeout(() => finish(new PlayerError('UNSUPPORTED_FEATURE', 'Backend did not apply the required track selection')), 5000);
            session.backend.addEventListener('mpv', check);
            signal?.addEventListener('abort', abort, { once: true });
            if (signal?.aborted)
                abort();
            else
                check();
        });
    }
    async applyTrackPolicy(session, source, mode, settings, preserve) {
        const policy = source.trackPolicy;
        if (!policy)
            return;
        for (const type of ['audio', 'sub']) {
            const rule = type === 'audio' ? policy.audio : policy.subtitles;
            if (!rule)
                continue;
            const raw = this.sessionTracks(session, source, mode, settings), plan = backendPlan(session.backend);
            const inventory = tracks(raw, this.sourceSerial, mode, plan).filter(t => t.type === (type === 'audio' ? 'audio' : 'subtitle'));
            const current = inventory.find(t => t.selected), key = type === 'audio' ? 'aid' : 'sid';
            if (preserve && (current ? trackAllowed(current, rule) : settings[key] === 'no' && rule.allowOff !== false))
                continue;
            const chosen = defaultTrack(inventory, rule);
            if (chosen && type === 'sub' && !settings.subtitles) {
                await session.backend.subtitleVisible(true);
                settings.subtitles = true;
            }
            if (chosen?.id === current?.id && chosen) {
                settings[key] = String(raw.find(t => `${this.sourceSerial}:${trackKey(t, mode, plan)}` === chosen.id).id);
                continue;
            }
            const selected = chosen ? raw.find(t => `${this.sourceSerial}:${trackKey(t, mode, plan)}` === chosen.id) : undefined;
            const id = selected ? String(selected.id) : 'no';
            await session.backend.selectTrack(type, id);
            settings[key] = id;
            await this.confirmTrackSelection(session, source, mode, settings, type, id);
        }
    }
    previewBuffering() {
        return !this.settings.pause && (this.observedWaiting || this.properties.get('paused-for-cache') === true || this.properties.get('native-waiting') === true);
    }
    notifySubscriber(listener, state) {
        try {
            listener(state);
        }
        catch (error) {
            try {
                globalThis.reportError?.(error);
            }
            catch { /* Reporting cannot change playback or stop other observers. */ }
        }
    }
    publish() {
        const serial = ++this.publicationSerial, previous = this.stateSnapshot, session = this.current, source = this.source, acceptedControl = this.control;
        const sourceId = this.sourceSerial, epoch = this.operationEpoch, mode = this.mode, settings = { ...this.settings };
        const current = () => acceptedControl === this.control && serial === this.publicationSerial && previous === this.stateSnapshot && session === this.current && source === this.source && sourceId === this.sourceSerial && epoch === this.operationEpoch && mode === this.mode;
        const controls = {
            sourceId: session ? sourceId : null, sourcePresent: !!source, requestedLive: source?.kind === 'remote' && source.options.streaming?.live === true,
            mode, automaticSelection: this.automatic, pause: settings.pause, subtitlesVisible: settings.subtitles, volumePercent: settings.volume, muted: this.muted, playbackRate: settings.speed,
            pendingOperation: this.pendingOperation, error: this.sessionError, observedPlaying: this.observedPlaying, observedWaiting: this.observedWaiting, busy: this.busy, operationActive: !!this.activeOperation,
            timing: this.getTimingSettings(), loop: this.getLoop(), playbackRange: this.getPlaybackRange(), audioOutputDevice: this.outputDeviceId, trackPolicy: this.trackPolicy,
        };
        let raw = this.sessionTracks(session, source, mode, settings);
        if (mode === 'native' && session?.surface?.videoWidth && !raw.some(t => t.type === 'video'))
            raw = [...raw, { id: '1', type: 'video', selected: true }];
        const list = session ? tracks(raw, sourceId, mode, backendPlan(session.backend)).filter(t => trackAllowed(t, t.type === 'audio' ? controls.trackPolicy.audio : t.type === 'subtitle' ? controls.trackPolicy.subtitles : undefined)) : [];
        const input = capturePlayerObservation({ ...controls, tracks: list, streaming: this.captureStreamingState(session, sourceId), capabilityFacts: this.capabilityFacts(session, source), properties: session?.backend.properties ?? this.empty, surface: session?.surface });
        // Host reads can invoke application code. Never install a sample from a
        // retired tuple, or overwrite a publication made by that application code.
        if (!current()) {
            this.schedulePublish();
            return;
        }
        const projection = projectPlayer(previous, input), preview = projection.preview;
        for (const apply of [() => this.#previewController.setPlaybackActive(preview.playbackActive), () => this.#previewController.setSuspended(preview.suspended), () => this.#previewController.setDuration(preview.duration), () => this.#previewController.setPlaybackPosition(preview.position)]) {
            apply();
            if (!current()) {
                this.schedulePublish();
                return;
            }
        }
        if (!projection.changed)
            return;
        const next = projection.state;
        this.statistics.observe(next);
        this.stateSnapshot = next;
        const stillCurrent = () => serial === this.publicationSerial && this.stateSnapshot === next && this.operationEpoch === epoch;
        // A reentrant publication supersedes the rest of this batch. Every delivered
        // event carries the exact committed snapshot that selected its event name.
        for (const listener of [...this.subscribers]) {
            if (!stillCurrent())
                return;
            this.notifySubscriber(listener, next);
        }
        for (const event of projection.notifications) {
            if (!stillCurrent())
                return;
            this.dispatchEvent(new CustomEvent(event, { detail: next }));
        }
        if (stillCurrent() && projection.enforceBoundary)
            this.enforceBoundary();
    }
    capabilityFacts(session = this.current, source = this.source) {
        const resolution = this.bufferingResolution();
        return {
            backendPlan: backendPlan(session?.backend) ?? null, nativeASS: this.nativeASS, privateRemux: this.privateRemux, privateFull: this.privatePlaybackAssets?.codecProfile === 'playback-full', providerRuntime: !!this.providerRuntime,
            hybridAudioFilters: this.hybridAudioFilters, nativeRemux: this.nativeRemux, canInspectFFmpeg: this.canInspectFFmpeg, remoteFormat: source?.kind === 'remote' ? source.options.format ?? null : null,
            backendMpvSubtitles: !!session?.backend.diagnostics?.mpvSubtitles, backendSetQuality: !!session?.backend.setQuality, backendSeekToLive: !!session?.backend.seekToLive,
            isolated: globalThis.crossOriginIsolated === true, webCodecs: typeof VideoDecoder !== 'undefined', mediaSource: typeof MediaSource !== 'undefined', webAudio: typeof AudioContext !== 'undefined',
            bufferingBackend: resolution.backend, bufferingControl: resolution.control,
        };
    }
    featureCapabilities(seekable, audio, sub) {
        return selectCapabilities({ ...this.capabilityFacts(), mode: this.mode, hasSession: !!this.current, automaticSelection: this.automatic, previousDuration: this.stateSnapshot?.duration, backendNativeLive: this.current?.backend.properties.get('native-live') === true }, seekable, audio, sub);
    }
    get mode() { return this.currentMode; }
    get automaticSelection() { return this.automatic; }
    get surface() { return this.current?.surface; }
    get properties() { return this.current?.backend.properties ?? this.empty; }
    get capabilities() { return this.stateSnapshot?.capabilities ?? this.featureCapabilities(null, 0, 0); }
    /** Replace the buffering policy without reopening the source. Omitted fields use defaults. */
    setBuffering(options) {
        let next;
        try {
            next = bufferingPolicy(options);
        }
        catch (error) {
            return Promise.reject(error);
        }
        return this.enqueue(async () => {
            const backend = this.current?.backend;
            if (backend && (!backend.setBuffering || backend.bufferingUpdateSupported === false))
                throw new PlayerError('UNSUPPORTED_FEATURE', 'This backend cannot update buffering at runtime');
            await this.applySetting({ kind: 'buffering', value: next });
        });
    }
    getBuffering() {
        const effective = this.bufferingResolution(), backend = effective.backend;
        return freeze({ active: !!this.current, requested: { ...this.buffering }, effective: structuredClone(effective), capabilities: { runtimeUpdate: !this.current || (!!this.current.backend.setBuffering && this.current.backend.bufferingUpdateSupported !== false), timeTargets: backend === 'remux' || backend === 'shaka', memoryBudget: backend === 'remux' || backend === 'mpv', manualRanges: false }, buffered: this.stateSnapshot?.buffered?.map(range => ({ ...range })) ?? null, cached: this.stateSnapshot?.cached?.map(range => ({ ...range })) ?? null });
    }
    bufferingResolution() {
        const cheap = this.current?.backend.bufferingDiagnostics;
        if (cheap)
            return cheap;
        const diagnostics = this.current?.backend.diagnostics;
        return diagnostics?.buffering ?? resolveBuffering(this.buffering, this.mode !== 'native' ? 'mpv' : diagnostics?.plan === 'shaka-mse' ? 'shaka' : usesRemuxTracks(diagnostics?.plan) ? 'remux' : 'browser');
    }
    get diagnostics() {
        const backend = this.current?.backend.diagnostics;
        return redact({ remuxRuntime: this.remuxSelection, watchdogs: this.watchdogConfiguration, preview: this.preview.diagnostics, buffering: this.bufferingResolution(), mode: this.mode, plan: this.current ? executionPlan(this.mode, backend?.plan, this.settings.af, this.settings.gain, !!backend?.subtitleOverlay) : undefined, planAdmission: this.planDecisions, runtimeCapabilities: this.runtimeCapabilities.snapshot(), selection: { automatic: this.automatic, attempts: this.attempts.map(a => ({ ...a })) }, switching: this.busy, videoFilters: this.settings.vf, audioFilters: this.settings.af, audioGain: this.settings.gain, toneMapping: this.toneMapping, resourceLimits: { ...this.resourceLimits }, decodeQuality: this.decodeQuality, adaptiveFrameDrop: this.adaptiveFrameDrop, backend });
    }
    getStreamingState() { return this.captureStreamingState(this.current, this.sourceSerial); }
    captureStreamingState(session, sourceId) {
        const raw = session?.backend.streamingState?.();
        if (!raw)
            return null;
        const prefix = `${sourceId}:`;
        return copyData({ ...raw, qualities: raw.qualities.map(q => ({ ...q, id: prefix + q.id })), selectedId: raw.selectedId ? prefix + raw.selectedId : null, presentedId: raw.presentedId ? prefix + raw.presentedId : null, requested: raw.requested.mode === 'manual' ? { ...raw.requested, id: prefix + raw.requested.id } : { ...raw.requested } });
    }
    setQuality(policy) {
        if (!policy || !['auto', 'manual'].includes(policy.mode) || policy.mode === 'manual' && typeof policy.id !== 'string' || policy.mode === 'auto' && [policy.maxHeight, policy.maxBandwidth].some(v => v !== undefined && (!Number.isFinite(v) || v <= 0)))
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid quality policy');
        const requested = { ...policy };
        return this.enqueue(async () => {
            const backend = this.current?.backend;
            if (!backend?.setQuality)
                throw new PlayerError('UNSUPPORTED_FEATURE', 'This route has no adaptive quality control');
            const prefix = `${this.sourceSerial}:`;
            if (requested.mode === 'manual' && !requested.id.startsWith(prefix))
                throw new PlayerError('INVALID_ARGUMENT', 'Quality belongs to a different source');
            const raw = requested.mode === 'manual' ? { ...requested, id: requested.id.slice(prefix.length) } : requested;
            await this.applySetting({ kind: 'quality', value: raw, previous: backend.streamingState?.().requested ?? { mode: 'auto' } });
        });
    }
    seekToLive() { return this.enqueue(async () => { if (!this.current?.backend.seekToLive)
        throw new PlayerError('UNSUPPORTED_FEATURE', 'This route has no live navigation'); await this.current.backend.seekToLive(); }, 'seeking'); }
    getAudioOutputDevice() { return this.outputDeviceId; }
    setAudioOutputDevice(id) {
        if (typeof id !== 'string' || id.length > 1024)
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid output device ID');
        return this.enqueue(async () => {
            if (!this.current?.backend.setAudioOutputDevice)
                throw new PlayerError('UNSUPPORTED_FEATURE', 'Open a source with output-device support first');
            try {
                await this.applySetting({ kind: 'output', value: id });
            }
            catch (error) {
                if (error.name === 'NotAllowedError')
                    throw new PlayerError('SOURCE_PERMISSION', 'Audio output permission denied');
                throw error;
            }
        });
    }
    getStats() { return this.statistics.snapshot(); }
    getPlaybackExplanation() {
        const diagnostics = this.diagnostics, plan = diagnostics.plan;
        const backend = this.current?.backend.diagnostics;
        const observed = this.mode === 'software' ? backend?.decodePolicy : undefined;
        const effective = observed && ['exact', 'balanced', 'performance'].includes(String(observed.effective)) ? observed.effective : null;
        return freeze({ sourceId: this.state.sourceId, mode: this.state.activeMode, planId: plan?.id ?? null, video: plan?.video ?? null, audio: plan?.audio ?? null,
            subtitle: this.state.mediaInfo.subtitle ? (backend?.subtitleOverlay?.component ?? (backend?.mpvSubtitles ? 'mpv' : this.mode === 'native' ? 'browser' : 'mpv')) : null,
            automatic: this.automatic, decodeQuality: this.decodeQuality, fidelity: { effective, observation: effective ? 'backend-reported' : 'unavailable', shortcuts: effective && Array.isArray(observed?.shortcuts) ? observed.shortcuts.filter((v) => typeof v === 'string').slice(0, 16) : [] },
            admission: this.planDecisions.map(p => ({ planId: p.id, mode: p.mode, eligible: p.eligible, code: p.code ?? null, reason: p.reason ? redact(p.reason) : null })), attempts: redact(this.attempts.slice(-64).map(a => ({ ...a }))) });
    }
    audioDiagnostics() { return this.current?.backend.audioDiagnostics(); }
    emit(type, detail) {
        if (type === 'error') {
            const error = playerError(detail, this.activeOperation?.id ?? null, this.activeOperation?.kind ?? null, 'session');
            this.sessionError = error.toJSON();
            this.publish();
            detail = this.sessionError;
        }
        this.dispatchEvent(new CustomEvent(type, { detail: redact(detail) }));
    }
    assertOperation() { if (this.destroyed || this.activeOperation?.controller.signal.aborted)
        throw new PlayerError('ABORTED', this.destroyed ? 'Player is destroyed' : 'Operation aborted'); }
    validateFilters(mode, settings) {
        const reason = featureRejection(mode, { ...settings, toneMapping: this.candidatePreferences.toneMapping, hybridAudioFilters: this.hybridAudioFilters });
        if (reason)
            throw new PlayerError('UNSUPPORTED_FEATURE', reason);
    }
    enqueue(operation, kind = null, signal, optimization = false) {
        if (!optimization)
            this.cancelPromotion();
        const admission = this.dispatchControl({ type: 'operation.admit', kind }), id = admission.id;
        if (!admission.accepted)
            return Promise.reject(new PlayerError(admission.reason === 'full' ? 'INVALID_ARGUMENT' : 'ABORTED', admission.reason === 'full' ? 'Player operation queue is full' : 'Player is destroyed', id, kind));
        const controller = new AbortController();
        controller.signal.addEventListener('abort', () => { this.dispatchControl({ type: 'operation.cancel', id }); }, { once: true });
        const cancel = () => { controller.abort(); if (this.activeOperation?.id === id) {
            this.inspection?.abort();
            void this.candidate?.backend.destroy().catch(() => { });
        } };
        this.operationResources.set(id, { controller, detachCallerAbort: () => signal?.removeEventListener('abort', cancel) });
        signal?.addEventListener('abort', cancel, { once: true });
        if (signal?.aborted)
            cancel();
        const result = this.queue.then(async () => {
            if (!this.dispatchControl({ type: 'operation.start', id }).accepted)
                throw new PlayerError('ABORTED', this.destroyed ? 'Player is destroyed' : 'Operation aborted', id, kind);
            this.operationStarted = performance.now();
            this.publish();
            if (kind === 'seeking')
                this.dispatchEvent(new CustomEvent('seeking', { detail: this.state }));
            try {
                await operation();
                this.assertOperation();
                if (kind === 'seeking')
                    this.statistics.seek(performance.now() - this.operationStarted);
            }
            catch (error) {
                if (optimization)
                    return;
                const structured = playerError(controller.signal.aborted ? new PlayerError('ABORTED', this.destroyed ? 'Player is destroyed' : 'Operation aborted') : error, id, kind);
                if (!this.current && kind === 'opening' && structured.code !== 'ABORTED')
                    this.sessionError = { ...structured.toJSON(), scope: 'session' };
                this.publish();
                this.dispatchEvent(new CustomEvent('error', { detail: freeze(structured.toJSON()) }));
                throw structured;
            }
            finally {
                this.dispatchControl({ type: 'operation.finish', id });
                this.startWatchdogs();
                this.publish();
            }
            if (kind === 'seeking')
                this.dispatchEvent(new CustomEvent('seeked', { detail: this.state }));
        }).finally(() => signal?.removeEventListener('abort', cancel));
        this.queue = result.catch(() => { }).finally(() => { this.dispatchControl({ type: 'operation.release', id }); this.operationResources.delete(id); });
        return result;
    }
    async interruptible(work) {
        // An effect's synchronous prefix may retire this operation before returning
        // a rejecting promise. Always observe physical completion before admission.
        const observed = Promise.resolve(work);
        void observed.catch(() => { });
        const signal = this.activeOperation?.controller.signal ?? this.lifetime.signal;
        this.assertOperation();
        let cancel;
        try {
            return await Promise.race([observed, new Promise((_, reject) => {
                    cancel = () => reject(new PlayerError('ABORTED', this.destroyed ? 'Player is destroyed' : 'Operation aborted'));
                    signal.addEventListener('abort', cancel, { once: true });
                })]);
        }
        finally {
            signal.removeEventListener('abort', cancel);
        }
    }
    async dispose(session) {
        if (!session)
            return;
        session.retired = true;
        try {
            await session.backend.destroy();
        }
        finally {
            session.surface.remove();
        }
    }
    /** Prepare immutable engine code and fonts without opening media or audio devices. */
    get preparationReady() { return this.preparationTask; }
    get preparationProgress() { return this.preparation?.progress ?? []; }
    prepare(components = 'all') {
        const selected = preparationComponents(components);
        if (this.promotionRunning)
            this.cancelPromotion();
        if (this.destroyed || this.activeOperation)
            return this.preparationTask;
        const warm = () => {
            if (this.destroyed)
                return Promise.resolve({ milliseconds: 0, assets: [] });
            this.selectDeployedRuntime();
            this.preparation ??= new EnginePreparation(this.assetBase, this.softwarePresenter === 'rgb' ? 'engine-software-full' : 'engine-software-yuv', () => { if (!this.destroyed)
                this.dispatchEvent(new CustomEvent('preparationchange', { detail: freeze(this.preparationProgress) })); }, this.remuxRuntime, this.providerRuntime);
            return this.preparation.warm(selected);
        };
        // EnginePreparation turns the retained deployment error into per-asset
        // failure reports, just like fetch/compile errors. Constructor-started
        // preparation must never leave a rejected promise unobserved.
        return this.preparationTask = this.providerRuntime ? this.providerRuntime.load().then(warm, warm) : warm();
    }
    async create(mode, aid = 'auto', adaptation, forcePreparation = false, planId, loadTimeoutMs) {
        let backend;
        const recipe = executionRecipe(planId);
        const backendKind = recipe?.backend ?? (mode === 'native' ? 'NativePlayer' : 'WasmPlayer');
        const surface = document.createElement(mode === 'native' ? 'video' : 'canvas');
        surface.width = this.width;
        surface.height = this.height;
        surface.style.cssText = 'display:none;width:100%;background:#000';
        // Import before allocating workers; destroy during import cannot orphan an engine.
        const module = backendKind === 'PrivateSoftwarePlayer' ? await this.interruptible(loadProviderModule('mpv-private-player', this.assetBase)) : backendKind === 'ShakaBackend' ? await this.interruptible(import('./internal/shaka-backend.js')) : backendKind === 'NativePlayer' ? await this.interruptible(import('./internal/native-player.js')) : await this.interruptible(loadProviderModule('mpv-player', this.assetBase));
        const engine = mode === 'hybrid' ? 'engine-hybrid' : this.softwarePresenter === 'rgb' ? 'engine-software-full' : 'engine-software-yuv';
        const prepared = mode === 'native' || backendKind === 'PrivateSoftwarePlayer' ? undefined : await this.interruptible(this.providerRuntime ? Promise.all([mode === 'software' ? Promise.resolve(undefined) : this.providerRuntime.module(`web/${engine}/player.wasm`), this.providerRuntime.bytes('fixtures/DejaVuSans.ttf')]).then(([module, font]) => ({ module, font })) : this.preparation?.readyEngine(engine) ?? Promise.resolve(undefined));
        this.assertOperation();
        this.root.append(surface);
        try {
            const subtitleTracks = this.sourceInspection?.probe.tracks.filter(t => t.type === 'sub') ?? [];
            const defaultSubtitleStreamIndex = (subtitleTracks.find(t => t.default) ?? subtitleTracks[0])?.index;
            backend = 'PrivateSoftwarePlayer' in module ? new module.PrivateSoftwarePlayer(surface, { providerAssets: this.providerRuntime, mode: mode, decodeQuality: this.decodeQuality, adaptiveFrameDrop: this.adaptiveFrameDrop, videoTrack: this.sourceInspection?.probe.tracks.find(t => t.type === 'video' && !t.attachedPicture), buffering: this.buffering, audioOutput: this.audioOutput, audioFallback: this.audioFallback, runtime: this.remuxRuntime, assetBase: this.assetBase, duration: this.sourceInspection?.probe.duration, resourceLimits: this.resourceLimits, fonts: this.fonts }) : 'ShakaBackend' in module ? new module.ShakaBackend(surface, this.assetBase, this.buffering) : 'NativePlayer' in module ? new module.NativePlayer(surface, forcePreparation ? 'always' : this.nativeRemux, this.assetBase, this.bufferedNativeSeeks, adaptation, ['auto', 'no'].includes(aid) ? (this.privateRemux && recipe?.native?.selectedAudio ? this.sourceInspection?.probe.tracks.find(t => t.type === 'audio')?.index : undefined) : Number(aid) - 1, this.nativeASS, this.fonts, planId, this.buffering, loadTimeoutMs, defaultSubtitleStreamIndex, this.remuxRuntime, this.providerRuntime) : new module.WasmPlayer(surface, { buffering: this.buffering, mode: mode, softwarePresenter: this.softwarePresenter, audioOutput: this.audioOutput, audioFallback: this.audioFallback, resourceLimits: this.resourceLimits, fonts: this.fonts, assetBase: this.assetBase, prepared, providerAssets: this.providerRuntime, decodeQuality: this.decodeQuality, adaptiveFrameDrop: this.adaptiveFrameDrop, videoTrack: this.sourceInspection?.probe.tracks.find(t => t.type === 'video' && !t.attachedPicture) });
        }
        catch (error) {
            surface.remove();
            throw error;
        }
        backend.setWatchdogs?.(this.watchdogConfiguration);
        const session = { backend, surface };
        this.observeBackend(session, this.control.source.candidate.session);
        return session;
    }
    observeBackend(session, sessionEpoch) {
        const backend = session.backend;
        let observationSequence = 0;
        for (const type of ['mpv', 'error', 'log', 'output', 'source', 'activity'])
            backend.addEventListener(type, event => {
                if (session.retired || sessionAuthority(this.control, sessionEpoch) === 'retired')
                    return;
                const detail = event.detail;
                if (this.current === session && type === 'activity' && ['seeking', 'seeked', 'play', 'pause', 'ratechange', 'waiting', 'playing', 'ended'].includes(detail))
                    this.watchdogEpoch++;
                if (this.current === session && this.promotionRunning && ((type === 'activity' && detail === 'waiting') || (type === 'mpv' && detail.event === 'property-change' && detail.name === 'paused-for-cache' && detail.data === true)))
                    this.cancelPromotion();
                if (sessionAuthority(this.control, sessionEpoch) === 'retired')
                    return;
                if (type === 'error')
                    session.error = detail instanceof Error ? detail : new Error(String(detail));
                if (type === 'mpv' && detail.event === 'end-file' && detail.reason === 'error')
                    session.error = new Error(String(detail.file_error));
                if (this.current === session && (session.error || type === 'activity' && ['play', 'pause', 'playing', 'ended'].includes(detail) || type === 'mpv' && detail.event === 'property-change' && ['pause', 'eof-reached'].includes(detail.name)))
                    this.startWatchdogs();
                if (this.current === session && sessionAuthority(this.control, sessionEpoch) === 'accepted' && !this.busy && !this.destroyed) {
                    if (session.error && (type === 'error' || (type === 'mpv' && detail.event === 'end-file')) && this.automatic && this.mode !== 'software') {
                        this.recover(session);
                        return;
                    }
                    if (type === 'mpv' && detail.event === 'end-file' && detail.reason === 'error')
                        this.emit('error', session.error);
                    if (this.current !== session || sessionAuthority(this.control, sessionEpoch) !== 'accepted')
                        return;
                    if (type === 'activity') {
                        if (detail === 'waiting')
                            this.dispatchControl({ type: 'playback.sample', session: sessionEpoch, sequence: ++observationSequence, observation: 'waiting' });
                        if (detail === 'playing')
                            this.dispatchControl({ type: 'playback.sample', session: sessionEpoch, sequence: ++observationSequence, observation: 'playing' });
                        this.schedulePublish();
                        return;
                    }
                    if (type === 'mpv') {
                        if (detail.event === 'property-change' && detail.name === 'track-list' && !this.sessionError) {
                            const inventory = tracks(this.sourceTracks(), this.sourceSerial, this.mode, backendPlan(session.backend));
                            if (this.current !== session || sessionAuthority(this.control, sessionEpoch) !== 'accepted')
                                return;
                            const forbidden = inventory.some(t => t.selected && !trackAllowed(t, t.type === 'audio' ? this.trackPolicy.audio : t.type === 'subtitle' ? this.trackPolicy.subtitles : undefined));
                            if (forbidden) {
                                this.updateSettings({ pause: true });
                                void backend.pause().catch(() => { });
                                this.emit('error', new PlayerError('UNSUPPORTED_FEATURE', 'Backend selected a track excluded by the host policy'));
                                return;
                            }
                        }
                        if (detail.event === 'property-change' && detail.name === 'time-pos')
                            this.dispatchControl({ type: 'playback.sample', session: sessionEpoch, sequence: ++observationSequence, observation: 'time', value: Number(detail.data), publishedTime: this.state.currentTime });
                        if (detail.event === 'property-change' && detail.name === 'pause')
                            this.dispatchControl({ type: 'playback.sample', session: sessionEpoch, sequence: ++observationSequence, observation: 'pause', value: detail.data === true });
                        this.schedulePublish();
                    }
                    if (this.current === session && sessionAuthority(this.control, sessionEpoch) === 'accepted')
                        this.emit(type, detail);
                }
            });
    }
    async settled(session, mode, target) {
        if (mode === 'native') {
            const probe = this.sourceInspection?.probe;
            await session.backend.verifyStartup(probe ? { video: probe.tracks.some(t => t.type === 'video' && !t.attachedPicture), audio: this.sourceInspection.settings.aid !== 'no' && probe.tracks.some(t => t.type === 'audio') } : undefined);
            return;
        }
        const deadline = performance.now() + 25000;
        while (performance.now() < deadline) {
            this.assertOperation();
            if (session.error)
                throw session.error;
            const boundary = session.backend.seekBoundary?.(target);
            if (boundary !== undefined)
                throw new SeekPresentationBoundary(target, boundary);
            const d = session.backend.diagnostics;
            const tracks = session.backend.properties.get('track-list');
            // Selection is transiently empty while mpv initializes a video track.
            const hasVideo = tracks?.some(t => t.type === 'video');
            if (hasVideo === false && tracks?.length && (!tracks.some(t => t.type === 'audio' && t.selected) || session.backend.startupEvidence?.().audioDecoderConfigured))
                return;
            if (mode === 'hybrid' && tracks?.some(t => t.type === 'video' && t.selected && !['h264', 'hevc', 'vp8', 'vp9', 'av1'].includes(t.codec ?? '') && !webgpuDecoderSupported(t.codec ?? '')))
                throw new Error('Hybrid mode has no external decoder for this video codec. Choose software mode for this source.');
            const position = mode === 'hybrid' ? d?.presentation?.position : d?.presentedPosition;
            if (d?.rendered && (mode !== 'hybrid' || d.decoder === 'webcodecs' || d.decoder === 'webgpu') && !d.seeking && position !== undefined && Math.abs(position - target) < .15 && await session.backend.confirmSeek?.(target) !== false)
                return;
            await new Promise(resolve => setTimeout(resolve, 25));
        }
        throw new Error(`${mode} mode did not present the requested position`);
    }
    fileServicesSource(source) {
        // Every URL consumer uses the inspected representation through RangeReader.
        // Manifests and explicit demuxer overrides retain their existing routes.
        return source.kind === 'local' || (!source.options.demuxer && (!source.options.format || source.options.format === 'file') && !!source.options.identity);
    }
    privateSourceDemuxer(source) {
        const suffix = source.kind === 'local' && source.file instanceof File ? source.file.name.split('.').at(-1)?.toLowerCase() : undefined;
        const hint = source.kind === 'local' ? source.input?.demuxer : source.options.demuxer;
        const demuxer = hint ?? (suffix === 'sbc' || suffix === 'msbc' ? 'sbc' : undefined);
        if (demuxer !== undefined && (typeof demuxer !== 'string' || demuxer !== '' && !/^[a-z0-9_]{1,64}$/.test(demuxer)))
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid demuxer hint');
        return demuxer || undefined;
    }
    privateFiniteSource(source) {
        return source.kind === 'local' || (!source.options.format || source.options.format === 'file') && !!source.options.identity;
    }
    admissible(source, settings, attachments, textTracks, nativeSourceRejection, automatic = this.automatic) {
        const remote = source.kind === 'remote' ? source.options : undefined;
        const inspected = this.sourceInspection?.source === source ? this.sourceInspection : undefined;
        const video = inspected?.probe.tracks.find(t => t.type === 'video' && !t.attachedPicture);
        const subs = inspected?.probe.tracks.filter(t => t.type === 'sub') ?? [];
        const explicit = inspected?.probe.tracks.find(t => t.type === 'audio' && t.id === inspected.settings.aid);
        const selected = settings.aid === 'no' ? undefined : (source === this.source ? this.publicSelections.get('audio') : undefined) ?? (explicit ? `audio:stream:${explicit.index}` : undefined);
        const selectedAudio = selected?.startsWith('audio:stream:') ? inspected?.probe.tracks.find(t => t.type === 'audio' && `audio:stream:${t.index}` === selected) : undefined;
        const inspectedSettings = inspected ? { ...inspected.settings, aid: settings.aid === 'no' ? 'no' : selectedAudio?.id ?? (settings.aid === 'auto' ? 'auto' : inspected.settings.aid) } : undefined;
        const audioTracks = inspected?.probe.tracks.filter(t => t.type === 'audio') ?? [];
        const selectiveAudio = inspectedSettings?.aid === 'no' ? undefined : inspectedSettings?.aid === 'auto' ? (audioTracks.find(t => t.default) ?? audioTracks[0]) : audioTracks.find(t => t.id === inspectedSettings?.aid);
        const selectiveVideo = inspected?.probe.tracks.find(t => t.type === 'video' && !t.attachedPicture);
        const selectiveSubtitle = inspected?.probe.tracks.find(t => t.type === 'sub' && (inspectedSettings?.sid === 'auto' ? t.default || subs[0] === t : t.id === inspectedSettings?.sid));
        const selectiveVideoCapability = inspected ? nativeBrowserCapabilities(inspected.probe, 'no', { canPlayType: mime => document.createElement('video').canPlayType(mime), isTypeSupported: typeof MediaSource === 'undefined' ? undefined : mime => MediaSource.isTypeSupported(mime) }).remux : undefined;
        const selectiveAudioReason = !this.fileServicesSource(source) ? 'Selective audio requires an inspected random-access file' : !inspected ? 'Source inspection required' :
            !Number.isFinite(inspected.probe.duration) || inspected.probe.duration <= 0 ? 'Selective audio requires finite media' :
                !selectiveVideo ? 'Selected video is unavailable' :
                    !selectiveAudio ? 'Selected audio is unavailable' :
                        this.privateRemux && (audioTracks.length !== 1 || selectiveAudio.codec !== 'pcm_s16le' || selectiveAudio.channels !== 2 || selectiveAudio.sampleRate !== 48000) ? 'Private mpv audio requires one 48 kHz stereo PCM16 stream' :
                            !this.selectiveAudioAssetsAvailable ? 'Selective audio engine or worklet assets are unavailable' :
                                undefined;
        const decisions = planAdmission({ automatic, ...settings,
            privatePlaybackFull: this.privatePlaybackAssets?.codecProfile === 'playback-full', privatePlaybackAssetsAvailable: this.privatePlaybackAssetsAvailable, offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
            privatePlaybackSourceRejection: privatePlaybackRejection(inspected?.probe, { finite: this.privateFiniteSource(source), bytes: source.kind === 'local' ? source.file instanceof File ? source.file.size : source.file.byteLength : Number(source.options.identity?.size) }, { ...settings, toneMapping: this.candidatePreferences.toneMapping, audioOutput: this.audioOutput, externalSubtitles: !!attachments.length || !!textTracks.length, customFonts: !!this.fonts.length, subtitleStyle: !!Object.keys(this.candidatePreferences.subtitleStyle).length }, this.privatePlaybackAssets),
            privateHybridAssetsAvailable: !!this.privatePlaybackAssets?.retainedDecoder,
            privateHybridSourceRejection: privatePlaybackRejection(inspected?.probe, { finite: this.privateFiniteSource(source), bytes: source.kind === 'local' ? source.file instanceof File ? source.file.size : source.file.byteLength : Number(source.options.identity?.size) }, { ...settings, toneMapping: this.candidatePreferences.toneMapping, audioOutput: this.audioOutput, externalSubtitles: !!attachments.length || !!textTracks.length, customFonts: !!this.fonts.length, subtitleStyle: !!Object.keys(this.candidatePreferences.subtitleStyle).length }, this.privatePlaybackAssets, 'hybrid'),
            audioPlayback: this.audioPlayback, transcodeAssetsAvailable: this.transcodeAssetsAvailable || !!this.providerRuntime?.codecPreparation(source, inspected?.probe, this.remuxRuntime, inspectedSettings?.aid) || !!this.providerRuntime?.audioRepairCandidate(source, inspected?.probe),
            transcodeSourceRejection: !this.fileServicesSource(source) || !inspected ? 'Audio transcoding requires an inspected random-access file' : audioTranscodeRejection(inspected.probe, inspectedSettings),
            selectiveAudioQualified: !selectiveAudioReason, selectiveAudioReason,
            mpvSubtitles: this.mpvSubtitles, selectedEmbeddedSubtitle: !!(settings.subtitles && selectiveSubtitle),
            mpvSubtitleSourceQualified: this.mpvSubtitleAssetsAvailable && this.fileServicesSource(source) && !!inspected && Number.isFinite(inspected.probe.duration) && inspected.probe.duration > 0 && !!selectiveSubtitle && (!this.privateRemux || ['ass', 'ssa', 'subrip', 'mov_text', 'hdmv_pgs_subtitle', 'dvd_subtitle'].includes(selectiveSubtitle.codec)) && settings.subtitles && settings.sid !== 'no',
            mpvSubtitleAVRejection: inspected ? nativeRejection(inspected.probe, { ...inspectedSettings, subtitles: false }) : 'Source inspection required',
            shakaSourceRejection: remote?.demuxer ? 'Explicit demuxer hints require FFmpeg' : undefined,
            streamingFallbackRejection: remote?.streaming?.maxBandwidth !== undefined || remote?.streaming?.representation !== undefined ? 'FFmpeg fallback cannot preserve an explicit adaptive quality constraint' : undefined,
            remuxSourceRejection: inspected ? remuxRejection(inspected.probe, inspectedSettings) : undefined,
            hybridSourceRejection: video && !['h264', 'hevc', 'vp8', 'vp9', 'av1'].includes(video.codec) && !webgpuDecoderSupported(video.codec) ? `Demuxe has no external decoder contract for ${video.codec}` : undefined, webGPUCodecQualified: webgpuDecoderSupported(video?.codec ?? ''), toneMapping: this.candidatePreferences.toneMapping, hybridAudioFilters: this.hybridAudioFilters,
            adaptation: this.audioAdaptation, allowLossy: this.allowLossy, nativeASS: this.nativeASS, externalFormats: attachments.map(a => plainVTT(a) ? 'browser-vtt' : a.format), browserTextTracks: !!textTracks.length,
            automaticLossless: this.automaticLossless, adaptationSourceRejection: source.kind !== 'local' ? 'Automatic FLAC is qualified only for local files' : this.losslessInspection?.source === source ? this.losslessInspection.reason : 'Automatic FLAC source has not been qualified',
            adaptationSourceQualified: source.kind === 'local' && this.losslessInspection?.source === source && !this.losslessInspection.reason,
            audioOutput: this.audioOutput, nativeRemux: this.nativeRemux, manifest: !!remote?.format && remote.format !== 'file',
            requiresRemux: !!(remote && (remote.headers || remote.refreshAuthorization || remote.allowedOrigins || remote.immutable !== undefined || remote.credentials === 'omit' || !!(settings.subtitles && selectiveSubtitle))),
            privateRemux: this.privateRemux, atomicMpvProviders: !!this.providerRuntime, isolated: globalThis.crossOriginIsolated === true, mse: typeof MediaSource !== 'undefined', webCodecs: typeof VideoDecoder !== 'undefined', webAudio: typeof AudioContext !== 'undefined',
            nativeSourceRejection: remote?.format && remote.format !== 'file' ? nativeManifestRejection(remote, settings, !!document.createElement('video').canPlayType('application/vnd.apple.mpegurl')) : nativeSourceRejection });
        if (inspected) {
            const element = document.createElement('video');
            const capabilities = nativeBrowserCapabilities(inspected.probe, inspectedSettings.aid, { canPlayType: mime => element.canPlayType(mime), isTypeSupported: typeof MediaSource === 'undefined' ? undefined : mime => MediaSource.isTypeSupported(mime) });
            for (const plan of decisions) {
                if (plan.mode === 'hybrid' && plan.eligible && inspected.probe.hybridRejection) {
                    plan.eligible = false;
                    plan.code = 'FEATURE_UNSUPPORTED';
                    plan.reason = inspected.probe.hybridRejection;
                }
                if (!plan.id.startsWith('native-'))
                    continue;
                const capability = plan.browserCapability = plan.id.startsWith('native-video-mpv-audio') ? selectiveVideoCapability : capabilities[plan.id.startsWith('native-direct') ? 'direct' : (plan.id.startsWith('native-flac') || plan.id.startsWith('native-transcode')) ? 'flac' : plan.id.startsWith('native-opus') ? 'opus' : 'remux'];
                // A browser may silently skip an unsupported default audio stream and
                // decode another one. Decoded-byte progress cannot prove its identity.
                // Inconclusive multi-audio Direct trials need selected-stream packaging.
                if (plan.eligible && plan.id.startsWith('native-direct') && audioTracks.length > 1 && inspectedSettings.aid !== 'no' && capability.status !== 'supported') {
                    plan.eligible = false;
                    plan.code = 'SOURCE_UNSUPPORTED';
                    plan.reason = 'Multiple audio streams require controlled selection when browser support is inconclusive';
                }
                capability.decodingInfo = this.mediaCapabilityQueries.cached(capability, inspected.probe);
                if (plan.eligible && capability.status === 'unsupported') {
                    plan.eligible = false;
                    plan.code = 'FEATURE_UNSUPPORTED';
                    plan.reason = capability.reason;
                }
            }
        }
        else {
            for (const plan of decisions)
                if (plan.id.startsWith('native-'))
                    plan.browserCapability = { status: 'unknown', api: plan.id.startsWith('native-direct') ? 'canPlayType' : 'isTypeSupported', tracks: [], queries: [], reason: 'Source track inspection is unavailable; codec support has not been established' };
        }
        if (selected?.startsWith('audio:stream:')) {
            const audio = inspected?.probe.tracks.filter(t => t.type === 'audio') ?? [];
            const defaultTrack = audio.find(t => t.default) ?? audio[0];
            if (!defaultTrack || selected !== `audio:stream:${defaultTrack.index}`)
                for (const plan of decisions)
                    if (plan.id.startsWith('native-direct') && plan.eligible) {
                        plan.eligible = false;
                        plan.code = 'SOURCE_UNSUPPORTED';
                        plan.reason = 'Original Native has no proven source-stream identity selection contract for the requested alternate audio';
                    }
        }
        for (const plan of decisions)
            if (plan.eligible && this.failedStreamingPlans.get(source)?.has(plan.id)) {
                plan.eligible = false;
                plan.code = 'QUALIFICATION_REQUIRED';
                plan.reason = 'This execution plan already failed for the current streaming source';
            }
        if (this.candidatePreferences.subtitleDelay !== 0 || this.candidatePreferences.audioDelay !== 0 || Object.keys(this.candidatePreferences.subtitleStyle).length)
            for (const plan of decisions)
                if (plan.mode === 'native') {
                    plan.eligible = false;
                    plan.code = 'FEATURE_UNSUPPORTED';
                    plan.reason = 'Requested timing/style controls require the mpv playback clock';
                }
        if (this.outputDeviceId && (typeof AudioContext === 'undefined' || !('setSinkId' in AudioContext.prototype)))
            for (const plan of decisions)
                if (plan.eligible && (plan.mode !== 'native' || plan.id.startsWith('native-video-mpv-audio') || plan.id.endsWith('-gain'))) {
                    plan.eligible = false;
                    plan.code = 'FEATURE_UNSUPPORTED';
                    plan.reason = 'The requested output device requires AudioContext sink selection on this route';
                }
        if (this.providerRuntime)
            for (const plan of decisions)
                if (plan.eligible) {
                    const reason = this.providerRuntime.rejection(plan.id, source, JSON.stringify([this.tierConfiguration(settings), this.remuxRuntime, this.softwarePresenter, inspected?.probe.tracks]), this.remuxRuntime, inspected?.probe, inspectedSettings?.aid);
                    if (reason) {
                        plan.eligible = false;
                        plan.code = 'DEPLOYMENT_UNAVAILABLE';
                        plan.reason = reason;
                    }
                }
        return decisions;
    }
    failedStreamingPlan(session) {
        if (this.source?.kind !== 'remote' || !['hls', 'dash'].includes(this.source.options.format ?? ''))
            return false;
        const plan = executionPlan(this.mode, backendPlan(session.backend), this.settings.af, this.settings.gain);
        const rejected = this.failedStreamingPlans.get(this.source) ?? new Set();
        rejected.add(plan.id);
        this.failedStreamingPlans.set(this.source, rejected);
        return true;
    }
    async replace(source, mode, settings, preserve, nativeTracks, requestedTarget, automaticAdmission = this.automatic, planId, directLoadBudget) {
        if (this.presentation.locksSurface)
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Exit video Picture-in-Picture before replacing the playback surface');
        if (!planId)
            return this.discover(source, settings, preserve, nativeTracks, requestedTarget, automaticAdmission, mode);
        if (this.sourceInspection?.source !== source)
            this.sourceInspection = undefined;
        this.validateFilters(mode, settings);
        const attachments = preserve ? this.subtitleAssets : [];
        const admitted = this.admissible(source, settings, attachments, nativeTracks, automaticAdmission ? this.admissionContext.nativeReason : undefined, automaticAdmission);
        if (!automaticAdmission)
            this.admissionContext = { automatic: false };
        if (!admitted.some(p => p.id === planId && p.eligible)) {
            const candidates = admitted.filter(p => p.mode === mode);
            const rejection = candidates.find(p => p.code === 'ISOLATION_REQUIRED') ?? admitted.find(p => p.id === planId) ?? candidates.find(p => p.code !== 'PLAN_NOT_REQUESTED');
            const deployment = deploymentRejectionError(admitted.filter(p => p.id === planId));
            if (rejection?.code !== 'ISOLATION_REQUIRED' && deployment)
                throw deployment;
            throw new PlayerError(rejection?.code === 'ISOLATION_REQUIRED' ? 'ISOLATION_REQUIRED' : 'UNSUPPORTED_FEATURE', rejection?.reason ?? 'No qualified complete playback plan');
        }
        const queried = admitted.find(p => p.id === planId)?.browserCapability;
        if (queried && this.sourceInspection?.source === source) {
            queried.decodingInfo = await this.mediaCapabilityQueries.inspect(queried, this.sourceInspection.probe);
            this.assertOperation();
        }
        if (mode === 'native' && attachments.length && !attachments.every(a => !!plainVTT(a)) && (!this.nativeASS || attachments.some(a => !['ass', 'ssa', 'srt', 'vtt'].includes(a.format))))
            throw Error('External mpv subtitles require Hybrid or Software');
        if (mode === 'native' && this.audioOutput !== 'stereo')
            throw Error('Explicit PCM output layout requires Hybrid or Software');
        if (source.kind === 'local' && source.file instanceof ArrayBuffer && source.file.byteLength > 32 * 1024 * 1024)
            throw new Error('ArrayBuffer sources are limited to 32 MiB');
        const old = this.current;
        const wasPaused = this.settings.pause;
        const desired = { ...sourceDesiredSettings(settings, { preserve, previousPause: !!wasPaused, previousSession: !!old, previousMode: this.mode, mode }) };
        let target = requestedTarget ?? (preserve ? Math.max(0, Number(old?.backend.properties.get('time-pos')) || 0) : 0);
        // Public stream identities are known before Native preparation starts.
        // Select that stream at open rather than adapting the default track first.
        const publicAudio = preserve && mode === 'native' ? /^audio:stream:(\d+)$/.exec(this.publicSelections.get('audio') ?? '') : null;
        const initialAudio = !preserve && !old && !['auto', 'no'].includes(settings.aid) ? this.sourceInspection?.probe.tracks.find(t => t.type === 'audio' && t.id === settings.aid) : undefined;
        const initialSubtitle = !preserve && !old && !['auto', 'no'].includes(settings.sid) ? this.sourceInspection?.probe.tracks.find(t => t.type === 'sub' && t.id === settings.sid) : undefined;
        if (initialSubtitle && (planId === 'native-remux-mpv' || planId === 'native-transcode-mpv' || planId === 'native-direct-mpv' || planId === 'native-video-mpv-audio-subtitles'))
            desired.sid = String(initialSubtitle.index + 1);
        if (publicAudio || initialAudio)
            desired.aid = planId.startsWith('native-direct') ? 'auto' : String((publicAudio ? Number(publicAudio[1]) : initialAudio.index) + 1);
        if (mode !== 'native' && initialAudio)
            desired.aid = initialAudio.id;
        const crossing = preserve && this.automatic && (mode === 'native') !== (this.mode === 'native');
        const trackIndexes = new Map();
        let externalSubtitleKey;
        if (crossing) {
            for (const type of ['audio', 'sub']) {
                if (type === 'sub' && !desired.subtitles)
                    continue;
                if (this.publicSelections.has(type))
                    continue;
                const id = settings[type === 'audio' ? 'aid' : 'sid'];
                if (['auto', 'no'].includes(id))
                    continue;
                const list = old?.backend.properties.get('track-list');
                const track = list?.find(t => t.type === type && String(t.id) === id);
                if (type === 'sub' && track?.external) {
                    externalSubtitleKey = trackKey(track, this.mode);
                    desired.sid = 'auto';
                    continue;
                }
                const index = this.mode === 'native' && usesRemuxTracks(backendPlan(old?.backend)) ? Number(id) - 1 : track?.['ff-index'];
                if (index === undefined)
                    throw Error('Cannot preserve selected track across playback modes');
                trackIndexes.set(type, index);
            }
        }
        if (preserve && this.publicSelections.has('sub') && desired.sid !== 'no')
            desired.sid = 'auto';
        if (this.activeOperation && !this.pendingOperation)
            this.dispatchControl({ type: 'operation.name', id: this.activeOperation.id, kind: 'switching' });
        const beginning = this.dispatchControl({ type: 'source.begin', operationEpoch: this.operationEpoch, mode, preserve, planId });
        if (!beginning.accepted)
            throw new PlayerError('ABORTED', 'Source transaction is already active');
        const attempt = beginning.id, attemptSession = this.control.source.candidate.session;
        const advance = (type) => { if (!this.dispatchControl({ type, attempt }).accepted)
            throw new PlayerError('ABORTED', 'Source transaction was retired'); };
        this.publish();
        this.emit('modechange', { phase: 'loading', mode });
        let candidate;
        const overlapping = !!(old && !old.error && this.promotionRunning && this.backgroundPromotion && !wasPaused && mode === 'native');
        // Reserve maximum explicit Wasm heaps plus configured packet queues. Browser
        // decoder/GPU allocations remain opaque and are not represented as a cap.
        const knownBytes = (session) => { const d = session.backend.diagnostics; return (d.heapBytes ?? 0) + (d.remux?.remux?.heapBytes ?? 0) + (d.mpvAudio ? Math.max(d.mpvAudio.worker?.heapBytes ?? 0, 128 * 1024 * 1024) : 0) + (d.mpvSubtitles?.heapBytes ?? 0) + 40 * 1024 * 1024; };
        const reserve = ((planId.startsWith('software-private') || planId.startsWith('hybrid-private')) ? (this.privatePlaybackAssets?.maxHeapBytes ?? 134217728) / 1048576 : planId === 'native-video-mpv-audio-subtitles' ? 384 : planId === 'native-remux-mpv' || planId === 'native-transcode-mpv' || planId === 'native-direct-mpv' || planId === 'native-video-mpv-audio' ? 256 : 128) * 1024 * 1024 + 40 * 1024 * 1024;
        let resourceMonitor;
        try {
            if (overlapping && knownBytes(old) + reserve > this.backgroundPromotion.maxKnownBytes)
                throw new PlayerError('ABORTED', 'Background candidate exceeds known-allocation budget');
            if (old && !old.error && !overlapping)
                await old.backend.pause();
            if (overlapping) {
                const drops = () => Number(old.backend.diagnostics.dropped ?? 0) + Number(old.backend.properties.get('frame-drop-count') ?? 0) + Number(old.backend.properties.get('decoder-frame-drop-count') ?? 0);
                const initialDrops = drops();
                resourceMonitor = setInterval(() => {
                    if (old.error || this.observedWaiting || drops() > initialDrops || knownBytes(old) + reserve > this.backgroundPromotion.maxKnownBytes)
                        this.cancelPromotion();
                }, 100);
            }
            const recipe = executionRecipe(planId);
            const adaptation = recipe?.native?.adaptation;
            candidate = this.candidate = await this.create(mode, desired.aid, adaptation, recipe?.native?.transport !== 'original', planId, directLoadBudget);
            this.assertOperation();
            advance('source.created');
            const p = candidate.backend;
            await this.interruptible(p.ready);
            this.assertOperation();
            const vf = effectiveVideoFilters(desired, this.candidatePreferences);
            if (vf)
                await p.command('set', 'vf', vf);
            if (mode !== 'native' && desired.af)
                await p.command('set', 'af', desired.af);
            if (mode !== 'native') {
                await p.command('set', 'sub-delay', String(this.candidatePreferences.subtitleDelay));
                await p.command('set', 'audio-delay', String(this.candidatePreferences.audioDelay));
                for (const [key, value] of Object.entries(this.candidatePreferences.subtitleStyle))
                    await p.command('set', { fontSize: 'sub-font-size', color: 'sub-color', borderSize: 'sub-border-size', fontFamily: 'sub-font' }[key], String(value));
            }
            await p.gain(desired.gain);
            await p.volume(overlapping || this.muted ? 0 : desired.volume);
            await p.rate(desired.speed);
            // Native numeric track IDs only exist after metadata/text-track loading.
            if (mode !== 'native') {
                await p.selectTrack('audio', desired.aid);
                await p.selectTrack('sub', desired.sid);
                await p.subtitleVisible(desired.subtitles);
            }
            advance('source.configured');
            if (source.kind === 'local')
                await this.interruptible(p.open(source.file, source.input));
            else
                await this.interruptible(p.openRemote(source.options));
            advance('source.opened');
            if (!preserve && requestedTarget !== undefined) {
                const duration = p.properties.get('duration');
                if (p.properties.get('native-live') === true || !Number.isFinite(duration) || Number(duration) <= 0 || requestedTarget >= Number(duration))
                    throw new PlayerError('INVALID_ARGUMENT', 'startTime requires a target within finite VOD duration');
            }
            if (preserve && this.qualityPolicy) {
                if (this.qualityPolicy.mode === 'manual')
                    throw new PlayerError('UNSUPPORTED_FEATURE', 'A manual quality pin cannot be mapped across a replacement backend');
                if (!p.setQuality)
                    throw new PlayerError('UNSUPPORTED_FEATURE', 'Fallback cannot preserve runtime quality policy');
                await p.setQuality(this.qualityPolicy);
            }
            if (this.outputDeviceId) {
                if (!p.setAudioOutputDevice)
                    throw new PlayerError('UNSUPPORTED_FEATURE', 'Output device cannot be preserved');
                await p.setAudioOutputDevice(this.outputDeviceId);
            }
            if ('inspectMetadata' in p)
                await p.inspectMetadata();
            this.assertOperation();
            for (const subtitle of attachments)
                await p.addSubtitle(subtitle);
            if (mode !== 'native' && attachments.length && desired.sid !== 'auto')
                await p.selectTrack('sub', desired.sid);
            if (mode === 'native') {
                for (const track of nativeTracks)
                    await p.addTextTrack(track, track.attachmentId);
                await p.selectTrack('audio', desired.aid);
                await p.selectTrack('sub', desired.sid);
                await p.subtitleVisible(desired.subtitles);
            }
            for (const [type, index] of trackIndexes) {
                const list = p.properties.get('track-list');
                const track = list?.find(t => t.type === type && (mode === 'native' ? usesRemuxTracks(backendPlan(p)) && Number(t.id) - 1 === index : t['ff-index'] === index));
                if (!track)
                    throw Error('Cannot preserve selected track across playback modes');
                const id = String(track.id);
                await p.selectTrack(type, id);
                desired[type === 'audio' ? 'aid' : 'sid'] = id;
            }
            if (externalSubtitleKey) {
                const track = (p.properties.get('track-list') ?? []).find(t => trackKey(t, mode) === externalSubtitleKey);
                if (!track)
                    throw Error('Cannot preserve external subtitle identity');
                desired.sid = String(track.id);
                await p.selectTrack('sub', desired.sid);
            }
            if (preserve)
                for (const [type, key] of this.publicSelections) {
                    if (type === 'sub' && !desired.subtitles)
                        continue;
                    if (type === 'audio' && planId.startsWith('native-direct')) {
                        desired.aid = 'auto';
                        continue;
                    }
                    const raw = (p.properties.get('track-list') ?? []);
                    const plan = backendPlan(p);
                    const track = raw.find(t => t.type === type && trackKey(t, mode, plan) === key);
                    if (!track)
                        throw new PlayerError('UNSUPPORTED_FEATURE', `Cannot preserve explicit public track selection across playback modes (${key}; available ${raw.map(t => trackKey(t, mode, plan)).join(', ')})`);
                    const id = String(track.id);
                    await p.selectTrack(type, id);
                    desired[type === 'audio' ? 'aid' : 'sid'] = id;
                }
            await this.applyTrackPolicy(candidate, source, mode, desired, preserve);
            advance('source.applied');
            await this.settled(candidate, mode, 0);
            if (overlapping) {
                this.assertOperation();
                await old.backend.pause();
                target = Math.max(0, Number(old.backend.properties.get('time-pos')) || 0);
                clearInterval(resourceMonitor);
            }
            if (target > 0) {
                await p.seek(target);
                await this.settled(candidate, mode, target);
            }
            advance('source.positioned');
            if (candidate.error)
                throw candidate.error;
            const actual = executionPlan(mode, backendPlan(p), desired.af, desired.gain, !!p.diagnostics?.subtitleOverlay);
            if (!actual || actual.id !== planId || !admitted.some(plan => plan.id === actual.id && plan.eligible))
                throw new PlayerError('UNSUPPORTED_FEATURE', 'The prepared components do not match an admitted complete playback plan');
            if (!desired.pause) {
                if (mode === 'native')
                    await this.playNativeVerified(p);
                else
                    await p.play();
            }
            this.assertOperation();
            if (overlapping)
                await p.volume(this.muted ? 0 : desired.volume);
            this.assertOperation();
            const acceptance = this.dispatchControl({ type: 'source.accept', attempt, operationEpoch: this.operationEpoch, settings: desired, planMatches: !!actual && actual.id === planId && admitted.some(plan => plan.id === actual.id && plan.eligible), ...(!preserve ? { publicSelections: { ...(initialAudio ? { audio: `audio:stream:${initialAudio.index}` } : {}), ...(initialSubtitle ? { sub: `sub:stream:${initialSubtitle.index}` } : {}) } } : {}) });
            if (!acceptance.accepted)
                throw new PlayerError('ABORTED', 'Source acceptance was retired');
            this.current = candidate;
            this.candidate = undefined;
            this.source = source;
            this.nativeTracks = nativeTracks;
            this.activeOperation?.detachCallerAbort();
            this.statistics.accept(this.sourceSerial, preserve, performance.now() - this.operationStarted);
            this.sessionError = null;
            if (queried && this.sourceInspection?.source === source)
                queried.decodingInfo = this.mediaCapabilityQueries.cached(queried, this.sourceInspection.probe);
            this.planDecisions = admitted;
            this.runtimeCapabilities.admission(admitted);
            this.acceptEvidence(planId, candidate);
            this.#previewController.setSourceIdentity(`${this.sourceSerial}:${mode}`);
            this.previewSource = source.kind === 'local' ? (source.file instanceof Blob ? source.file : new Blob([source.file])) : undefined;
            if (!preserve)
                this.subtitleAssets = [];
            // Physical handles and composed control state are accepted before observers.
            this.publish();
            const stillAccepted = () => this.current === candidate && sessionAuthority(this.control, attemptSession) === 'accepted';
            if (stillAccepted()) {
                candidate.surface.style.display = 'block';
                if (old)
                    old.surface.style.display = 'none';
                this.startWatchdogs();
            }
            // The new session is committed. Cleanup failures must not pretend to roll it back.
            try {
                await this.dispose(old);
            }
            catch (error) {
                this.dispatchEvent(new CustomEvent('error', { detail: freeze(playerError(error, this.activeOperation?.id ?? null, this.activeOperation?.kind ?? null, 'operation').toJSON()) }));
            }
            for (const [name, data] of p.properties) {
                if (!stillAccepted())
                    return;
                this.emit('mpv', { event: 'property-change', name, data });
            }
            if (!stillAccepted())
                return;
            this.emit('mpv', { event: 'file-loaded' });
            if (stillAccepted())
                this.emit('modechange', { phase: 'ready', mode, position: target });
        }
        catch (error) {
            if (candidate)
                this.runtimeCapabilities.update(planId, 'probing', this.evidence(candidate));
            if (candidate && candidate !== this.current)
                await this.dispose(candidate).catch(() => { });
            this.candidate = undefined;
            if (old && !old.error && this.current === old && !wasPaused && !this.destroyed && !this.closing)
                await old.backend.play().catch(() => { });
            this.emit('modechange', { phase: 'failed', mode, rolledBack: this.current === old, message: String(error) });
            throw error;
        }
        finally {
            clearInterval(resourceMonitor);
            this.dispatchControl({ type: 'source.finished', attempt });
            this.publish();
        }
    }
    record(attempt) {
        this.attempts.push(attempt);
        if (this.attempts.length > 32)
            this.attempts.shift();
        this.emit('selectionchange', { ...attempt });
    }
    async inspectForQualifiedWebGPU(source, settings) {
        if (!hasQualifiedWebGPUCodecs() || this.providerRuntime && !this.canInspectFFmpeg)
            return;
        if (this.sourceInspection?.source === source) {
            const video = this.sourceInspection.probe.tracks.find(track => track.type === 'video' && !track.attachedPicture);
            if (!video || !webgpuDecoderSupported(video.codec) || video.webCodecsSupported !== undefined)
                return;
        }
        const controller = this.inspection = new AbortController();
        try {
            const { probeSource } = await this.interruptible(import(new URL('web/source-probe.js', this.assetBase).href));
            const transport = source.kind === 'local' ? { file: source.file instanceof File ? source.file : new File([source.file], 'media') } : (() => { const { refreshAuthorization, ...options } = source.options; return { options: { ...options, url: new URL(options.url, location.href).href }, refreshAuthorization }; })();
            const compiledWasm = await this.interruptible(this.providerRuntime ? this.providerRuntime.module(`web/engine-remux${this.privateRemux ? '-' + this.remuxRuntime : ''}/remux.wasm`) : this.preparation?.readyModule('engine-remux') ?? Promise.resolve(undefined));
            const probe = await probeSource(transport, controller.signal, undefined, compiledWasm, this.remuxRuntime);
            this.assertOperation();
            this.sourceInspection = { source, probe, settings: { aid: settings.aid, sid: settings.sid, subtitles: settings.subtitles } };
        }
        catch (error) {
            if (this.destroyed || this.activeOperation?.controller.signal.aborted || controller.signal.aborted || terminalSourceFailure(error) || this.providerRuntime && ['ASSET_LOAD_FAILED', 'DEPLOYMENT_UNAVAILABLE'].includes(playerError(error).code))
                throw error;
            // Unknown inspection still permits the existing WebCodecs trial.
        }
        finally {
            if (this.inspection === controller)
                this.inspection = undefined;
        }
    }
    async inspectWithFFmpeg(source, controller) {
        this.emit('inspectionchange', { phase: 'inspecting' });
        const codecInspector = this.providerRuntime?.codecInspector(this.remuxRuntime);
        const { probeSource } = await this.interruptible(import(new URL(codecInspector ? codecInspector.folder + 'source-probe.js' : 'web/source-probe.js', this.assetBase).href));
        const transport = source.kind === 'local' ? { file: source.file instanceof File ? source.file : new File([source.file], 'media') } : (() => { const { refreshAuthorization, ...options } = source.options; return { options: { ...options, url: new URL(options.url, location.href).href }, refreshAuthorization }; })();
        const compiledWasm = await this.interruptible(this.providerRuntime ? this.providerRuntime.module(codecInspector?.wasmPath ?? `web/engine-remux${this.privateRemux ? '-' + this.remuxRuntime : ''}/remux.wasm`) : this.preparation?.readyModule('engine-remux') ?? Promise.resolve(undefined));
        this.assertOperation();
        const probe = await probeSource({ ...transport, ...(this.privateRemux ? { demuxer: this.privateSourceDemuxer(source) } : {}) }, controller.signal, codecInspector ? 'flac24' : undefined, compiledWasm, this.remuxRuntime);
        this.assertOperation();
        return probe;
    }
    async optionalAssetsAvailable(names, controller) {
        if (this.providerRuntime)
            return names.every(name => this.providerRuntime.has(name));
        const assetController = new AbortController();
        const abort = () => assetController.abort();
        controller.signal.addEventListener('abort', abort, { once: true });
        const deadline = setTimeout(abort, 5000);
        try {
            const responses = await Promise.all(names.map(name => fetch(new URL(name, this.assetBase), { method: 'HEAD', signal: assetController.signal })));
            return responses.every(response => response.ok);
        }
        catch (error) {
            if (controller.signal.aborted)
                throw error;
            return false;
        }
        finally {
            clearTimeout(deadline);
            controller.signal.removeEventListener('abort', abort);
        }
    }
    async checkInspectedAssets(source, probe, settings, sid, controller) {
        this.selectiveAudioAssetsAvailable = false;
        this.selectiveAudioAssetsChecked = false;
        this.transcodeAssetsAvailable = false;
        this.transcodeAssetsChecked = false;
        this.mpvSubtitleAssetsAvailable = false;
        this.privatePlaybackAssetsAvailable = false;
        this.privatePlaybackAssets = undefined;
        this.privatePlaybackAssetsFailure = undefined;
        if (this.privateRemux) {
            this.privatePlaybackAssetsAvailable = await this.optionalAssetsAvailable(['manifest.json', 'player.mjs', 'player.wasm'].map(name => `web/engine-mpv-playback-${this.remuxRuntime}/${name}`), controller);
            if (this.privatePlaybackAssetsAvailable) {
                const metadataController = new AbortController(), abort = () => metadataController.abort();
                controller.signal.addEventListener('abort', abort, { once: true });
                if (controller.signal.aborted)
                    abort();
                const deadline = setTimeout(abort, 5000);
                try {
                    const manifestPath = `web/engine-mpv-playback-${this.remuxRuntime}/manifest.json`;
                    const response = this.providerRuntime ? new Response(await this.providerRuntime.bytes(manifestPath)) : await fetch(new URL(manifestPath, this.assetBase), { signal: metadataController.signal });
                    if (!response.ok)
                        throw Error('Manifest HTTP ' + response.status);
                    this.privatePlaybackAssets = await readPrivatePlaybackAssets(response, this.remuxRuntime);
                    if (!this.privatePlaybackAssets)
                        throw Error('Invalid playback manifest');
                }
                catch (error) {
                    if (controller.signal.aborted)
                        throw error;
                    this.privatePlaybackAssetsFailure = new PlayerError('ASSET_LOAD_FAILED', 'Private playback manifest initialization failed: ' + String(error));
                }
                finally {
                    clearTimeout(deadline);
                    controller.signal.removeEventListener('abort', abort);
                }
            }
        }
        if (this.mpvSubtitles && this.fileServicesSource(source) && settings.subtitles && sid !== 'no' && probe.tracks.some(t => t.type === 'sub'))
            this.mpvSubtitleAssetsAvailable = await this.optionalAssetsAvailable(['mjs', 'wasm'].map(ext => `web/engine-${this.privateRemux ? 'mpv-subtitles-' + this.remuxRuntime : 'subtitles'}/service.${ext}`), controller);
        this.assertOperation();
    }
    async inspectFallbackAfterFastFailure(source, settings) {
        this.fastInspectedSource = undefined;
        if (this.sourceInspection?.source === source && (this.providerRuntime?.codecPreparation(source, this.sourceInspection.probe, this.remuxRuntime, settings.aid) || this.providerRuntime?.audioRepairCandidate(source, this.sourceInspection.probe))) {
            this.record({ mode: 'probe', outcome: 'selected', reason: 'Retained bounded local metadata for codec preparation; complete packet validation remains required' });
            return nativeRejection(this.sourceInspection.probe, { ...settings }, document.createElement('video'));
        }
        if (!this.canInspectFFmpeg) {
            this.sourceInspection = undefined;
            this.mpvSubtitleAssetsAvailable = false;
            this.selectiveAudioAssetsAvailable = false;
            this.selectiveAudioAssetsChecked = false;
            this.transcodeAssetsAvailable = false;
            this.transcodeAssetsChecked = false;
            return 'Wasm inspection requires cross-origin isolation';
        }
        const controller = this.inspection = new AbortController();
        try {
            const probe = await this.inspectWithFFmpeg(source, controller);
            const inspectedSettings = { aid: 'auto', sid: 'auto', subtitles: settings.subtitles };
            this.sourceInspection = { source, probe, settings: inspectedSettings };
            await this.checkInspectedAssets(source, probe, settings, 'auto', controller);
            this.record({ mode: 'probe', outcome: 'selected', reason: 'FFmpeg reinspection after Fast Inspector Direct startup failure' });
            return nativeRejection(probe, inspectedSettings);
        }
        catch (error) {
            if (this.destroyed || this.activeOperation?.controller.signal.aborted || controller.signal.aborted || terminalSourceFailure(error) || this.providerRuntime && ['ASSET_LOAD_FAILED', 'DEPLOYMENT_UNAVAILABLE'].includes(playerError(error).code))
                throw error;
            this.sourceInspection = undefined;
            this.mpvSubtitleAssetsAvailable = false;
            this.selectiveAudioAssetsAvailable = false;
            this.selectiveAudioAssetsChecked = false;
            this.transcodeAssetsAvailable = false;
            this.transcodeAssetsChecked = false;
            this.record({ mode: 'probe', outcome: 'failed', reason: `FFmpeg reinspection after Direct failure: ${String(error)}` });
            return 'Native eligibility could not be established: ' + String(error);
        }
        finally {
            controller.abort();
            if (this.inspection === controller)
                this.inspection = undefined;
        }
    }
    async select(source, settings, preserve, tracks, start = 0, target, priorAttempts = [], inspectOnly = false) {
        if (this.providerRuntime) {
            await this.interruptible(this.providerRuntime.load());
            this.assertOperation();
            this.selectDeployedRuntime();
        }
        if (!this.automatic && this.mode !== 'native') {
            if (this.privateRemux && (!this.providerRuntime || this.canInspectFFmpeg) && (this.mode === 'software' || this.mode === 'hybrid')) {
                this.privatePlaybackAssetsFailure = undefined;
                const controller = this.inspection = new AbortController();
                try {
                    const probe = await this.inspectWithFFmpeg(source, controller);
                    if (source.kind === 'remote' && probe.identity)
                        source.options.identity ??= probe.identity;
                    this.sourceInspection = { source, probe, settings: { aid: settings.aid, sid: settings.sid, subtitles: settings.subtitles } };
                    await this.checkInspectedAssets(source, probe, settings, settings.sid, controller);
                }
                finally {
                    controller.abort();
                    if (this.inspection === controller)
                        this.inspection = undefined;
                }
            }
            if (this.mode === 'hybrid')
                await this.inspectForQualifiedWebGPU(source, settings);
            if ((!this.providerRuntime || this.canInspectFFmpeg) && this.mode === 'software' && (this.decodeQuality !== 'exact' || this.adaptiveFrameDrop) && this.sourceInspection?.source !== source) {
                // Explicit Software skips the normal tier probe. Quality admission still
                // needs codec identity before mpv constructs its decoder.
                const controller = this.inspection = new AbortController();
                try {
                    const { probeSource } = await this.interruptible(import(new URL('web/source-probe.js', this.assetBase).href));
                    const transport = source.kind === 'local' ? { file: source.file instanceof File ? source.file : new File([source.file], 'media') } : (() => { const { refreshAuthorization, ...options } = source.options; return { options: { ...options, url: new URL(options.url, location.href).href }, refreshAuthorization }; })();
                    const compiledWasm = await this.interruptible(this.providerRuntime ? this.providerRuntime.module(`web/engine-remux${this.privateRemux ? '-' + this.remuxRuntime : ''}/remux.wasm`) : this.preparation?.readyModule('engine-remux') ?? Promise.resolve(undefined));
                    const probe = await probeSource(transport, controller.signal, undefined, compiledWasm, this.remuxRuntime);
                    this.assertOperation();
                    this.sourceInspection = { source, probe, settings: { aid: settings.aid, sid: settings.sid, subtitles: settings.subtitles } };
                }
                catch (error) {
                    if (this.destroyed || this.activeOperation?.controller.signal.aborted || controller.signal.aborted || terminalSourceFailure(error) || this.providerRuntime && ['ASSET_LOAD_FAILED', 'DEPLOYMENT_UNAVAILABLE'].includes(playerError(error).code))
                        throw error;
                    // The decoder remains usable when optional codec inspection cannot
                    // classify a file; the unknown-codec policy permits exact only.
                }
                finally {
                    if (this.inspection === controller)
                        this.inspection = undefined;
                }
            }
            return this.replace(source, this.mode, settings, preserve, tracks, target);
        }
        const componentRepairRetry = this.sourceInspection?.source === source && !!(this.providerRuntime?.codecPreparation(source, this.sourceInspection.probe, this.remuxRuntime, settings.aid) || this.providerRuntime?.audioRepairCandidate(source, this.sourceInspection.probe));
        this.attempts = [];
        for (const attempt of priorAttempts)
            this.record(attempt);
        let nativeReason;
        if (start === 0 || this.sourceInspection?.source !== source) {
            this.privatePlaybackAssetsFailure = undefined;
            this.losslessInspection = undefined;
            this.sourceInspection = undefined;
            this.fastInspectedSource = undefined;
            this.mpvSubtitleAssetsAvailable = false;
            this.selectiveAudioAssetsAvailable = false;
            this.selectiveAudioAssetsChecked = false;
            this.transcodeAssetsAvailable = false;
            this.transcodeAssetsChecked = false;
        }
        // A later Direct playback failure can resume discovery beyond Native.
        // Recovery beyond the initial route can need decoder configuration or track bounds.
        if (start > 0 && this.fastInspectedSource === source)
            nativeReason = await this.inspectFallbackAfterFastFailure(source, settings);
        // Cooperative playback still needs inspected codec/resource facts when
        // filters already rule out Native. This also covers automatic filter changes.
        if (start === 0 && (this.privateRemux || !(settings.vf || settings.af || this.candidatePreferences.toneMapping !== 'off'))) {
            if (!this.privateRemux && (source.kind === 'local' && source.input?.demuxer || source.kind === 'remote' && source.options.demuxer) || source.kind === 'remote' && source.options.format && source.options.format !== 'file') {
                nativeReason = source.kind === 'remote' ? nativeManifestRejection(source.options, settings, !!document.createElement('video').canPlayType('application/vnd.apple.mpegurl')) : 'Explicit demuxer requires FFmpeg';
            }
            else {
                const controller = this.inspection = new AbortController();
                try {
                    let probe, fastProbe = false, fastFacts = [];
                    // Immutable local bytes permit bounded inspection without an engine download.
                    // Remote identity/permission enforcement continues through the existing inspector.
                    if (source.kind === 'local') {
                        const local = source.file instanceof File ? source.file : new File([source.file], 'media');
                        // The filename only bypasses an optimization: FFmpeg still inspects
                        // these known-unsupported families, whatever their actual bytes are.
                        if (!(this.privateRemux && this.privateSourceDemuxer(source)) && (!preserve || componentRepairRetry) && !tracks.length && settings.aid === 'auto' && settings.sid === 'auto' && !/\.(?:ogg|oga|opus|ts|m2ts)$/i.test(local.name)) {
                            try {
                                const { inspectFastSource } = await this.interruptible(import(new URL('web/fast-source-inspector.js', this.assetBase).href));
                                const fast = await inspectFastSource(local, { signal: controller.signal, requirements: routingRequirements, onProgress: (progress) => {
                                        if (!controller.signal.aborted && !this.destroyed)
                                            this.emit('inspectionchange', progress);
                                    } });
                                this.assertOperation();
                                if (fast.status === 'satisfied') {
                                    probe = fast.evidence;
                                    fastProbe = true;
                                    fastFacts = fast.available;
                                    this.record({ mode: 'probe', outcome: 'selected', reason: `Fast local metadata: ${fast.bytesRead} bytes; routing admission pending` });
                                }
                                else
                                    this.record({ mode: 'probe', outcome: 'skipped', reason: `Fast local metadata: ${fast.bytesRead} bytes; ${fast.reason}` });
                            }
                            catch (error) {
                                if (controller.signal.aborted || this.activeOperation?.controller.signal.aborted || terminalSourceFailure(error) || this.providerRuntime && ['ASSET_LOAD_FAILED', 'DEPLOYMENT_UNAVAILABLE'].includes(playerError(error).code))
                                    throw error;
                                this.record({ mode: 'probe', outcome: 'skipped', reason: `Fast inspector unavailable: ${String(error)}` });
                            }
                        }
                    }
                    this.assertOperation();
                    if (!probe && this.canInspectFFmpeg)
                        probe = await this.inspectWithFFmpeg(source, controller);
                    if (!probe)
                        this.record({ mode: 'probe', outcome: 'skipped', reason: 'Wasm inspection requires cross-origin isolation; browser-native routes remain available' });
                    if (probe) {
                        for (let inspectionPass = 0; inspectionPass < 2; inspectionPass++) {
                            if (source.kind === 'remote' && probe.identity)
                                source.options.identity ??= probe.identity;
                            // Cross-mode track IDs reset to auto in replace(); preflight that same selection.
                            let aid = preserve && (this.mode === 'native' || settings.aid === 'no') ? settings.aid : !this.source ? settings.aid : 'auto';
                            let sid = tracks.length ? 'no' : preserve && (this.mode === 'native' || settings.sid === 'no') ? settings.sid : 'auto';
                            if (preserve && this.mode === 'native' && usesRemuxTracks(backendPlan(this.current?.backend)) && !['auto', 'no'].includes(aid))
                                aid = probe.tracks.find(t => t.type === 'audio' && t.index === Number(aid) - 1)?.id ?? aid;
                            const publicAudio = preserve ? /^audio:stream:(\d+)$/.exec(this.publicSelections.get('audio') ?? '') : null;
                            const publicSub = preserve ? /^sub:stream:(\d+)$/.exec(this.publicSelections.get('sub') ?? '') : null;
                            if (publicSub)
                                sid = probe.tracks.find(t => t.type === 'sub' && t.index === Number(publicSub[1]))?.id ?? 'missing';
                            if (publicAudio)
                                aid = probe.tracks.find(t => t.type === 'audio' && t.index === Number(publicAudio[1]))?.id ?? 'missing';
                            nativeReason = this.privateRemux && this.privateSourceDemuxer(source) ? 'Explicit demuxer requires FFmpeg' : nativeRejection(probe, { ...settings, aid, sid }, document.createElement('video'));
                            this.sourceInspection = { source, probe, settings: { aid, sid, subtitles: settings.subtitles } };
                            await this.checkInspectedAssets(source, probe, settings, sid, controller);
                            if (fastProbe) {
                                const candidates = this.admissible(source, settings, preserve ? this.subtitleAssets : [], tracks, nativeReason, this.automatic);
                                const first = candidates.find(plan => plan.eligible)?.id;
                                const missing = missingRoutingFacts(candidates, fastFacts);
                                if (missing.length) {
                                    this.record({ mode: 'probe', outcome: 'skipped', reason: `Fast metadata missing ${missing.join(', ')} for ${first ?? 'routing'}; FFmpeg inspection required` });
                                    fastProbe = false;
                                    this.sourceInspection = undefined;
                                    this.mpvSubtitleAssetsAvailable = false;
                                    this.selectiveAudioAssetsAvailable = false;
                                    this.selectiveAudioAssetsChecked = false;
                                    this.transcodeAssetsAvailable = false;
                                    this.transcodeAssetsChecked = false;
                                    if (this.canInspectFFmpeg) {
                                        probe = await this.inspectWithFFmpeg(source, controller);
                                        continue;
                                    }
                                    probe = undefined;
                                    nativeReason = undefined;
                                    break;
                                }
                                this.fastInspectedSource = source;
                                this.record({ mode: 'probe', outcome: 'selected', reason: `Fast Inspector admitted ${first} without remux inspector Wasm` });
                            }
                            break;
                        }
                    }
                }
                catch (error) {
                    // A new optional private inspector must not remove existing browser-only
                    // playback. Retry only a plain initial URL and these diagnosed failures;
                    // authorization, identity, cancellation and controlled transport stay terminal.
                    const optionalInspection = this.privateRemux && this.remuxSelection.policy === 'auto' && !preserve && !inspectOnly &&
                        source.kind === 'remote' && !source.options.identity && settings.aid === 'auto' && settings.sid === 'auto' &&
                        !this.providerRuntime && !this.destroyed && !this.activeOperation?.controller.signal.aborted && !controller.signal.aborted &&
                        ((playerError(error).code === 'ASSET_LOAD_FAILED' && !terminalSourceFailure(error)) || /^Error: Source transport: Error: Expected HTTP 206; received 200$/.test(String(error))) &&
                        this.admissible(source, settings, [], tracks).some(plan => plan.id === 'native-direct' && plan.eligible);
                    if (optionalInspection) {
                        nativeReason = undefined;
                        this.record({ mode: 'probe', outcome: 'skipped', reason: 'Optional private inspection unavailable; trying browser Direct: ' + String(error) });
                    }
                    else {
                        if (this.destroyed || this.activeOperation?.controller.signal.aborted || ['AUTOPLAY_BLOCKED', 'ABORTED', 'SOURCE_CHANGED', 'SOURCE_PERMISSION', 'NETWORK_TIMEOUT', 'ASSET_LOAD_FAILED'].includes(playerError(error).code) || terminalSourceFailure(error))
                            throw error;
                        nativeReason = 'Native eligibility could not be established: ' + String(error);
                        this.record({ mode: 'probe', outcome: 'failed', reason: String(error) });
                    }
                }
                finally {
                    controller.abort();
                    if (this.inspection === controller)
                        this.inspection = undefined;
                }
            }
        }
        this.admissionContext = { nativeReason, automatic: this.automatic };
        if (inspectOnly)
            return;
        return this.discover(source, settings, preserve, tracks, target, this.automatic, this.automatic ? undefined : this.mode, start);
    }
    acceptEvidence(planId, session = this.current) {
        const evidence = this.evidence(session);
        this.runtimeCapabilities.update(planId, evidence.prepared && !evidence.outputVerified ? 'prepared' : 'verified', evidence, evidence.prepared && !evidence.outputVerified ? 'Paused candidate prepared; actual output is pending a permitted play request' : evidence.completedAtEOF ? 'Previously verified source completed at natural EOF; no new frame or audio observation claimed' : 'Runtime output observed; physical output and opaque track internals remain unverified');
    }
    evidence(session = this.current) {
        if (session?.backend.startupEvidence)
            return session.backend.startupEvidence();
        const d = session?.backend.diagnostics;
        if (d?.capability)
            return { ...d.capability };
        return { metadata: true, decoderOutput: !!d?.rendered, videoPresented: !!d?.rendered,
            ...(d?.decoderStats?.supportCheck ? { apiHint: JSON.stringify(d.decoderStats.supportCheck) } : {}) };
    }
    localRemuxRetry(source, planId, settings) {
        // Match complete, existing plans: preserve gain and subtitle ownership.
        let remux = { 'native-direct': 'native-remux', 'native-direct-mpv': 'native-remux-mpv', 'native-direct-gain': 'native-remux-gain', 'native-direct-ass': 'native-remux-ass', 'native-direct-ass-gain': 'native-remux-ass-gain' }[planId];
        // A diagnosed Direct readiness timeout may also try the already-admitted
        // codec preparation plan. Preserve the full-budget original retry below.
        if (planId === 'native-direct' && this.sourceInspection?.source === source && !this.planDecisions.some(p => p.eligible && p.id === remux) &&
            (this.providerRuntime?.codecPreparation(source, this.sourceInspection.probe, this.remuxRuntime, settings.aid) || this.providerRuntime?.audioRepairCandidate(source, this.sourceInspection.probe)))
            remux = 'native-transcode';
        if (source.kind === 'local' && this.sourceInspection?.source === source && remux && this.planDecisions.some(p => p.eligible && p.id === remux) && !this.tierAttempts.reason(source, this.tierConfiguration(settings), remux))
            return remux;
    }
    async discover(source, settings, preserve, tracks, target, automatic, pinnedMode, start = 0) {
        if (this.providerRuntime) {
            await this.interruptible(this.providerRuntime.load());
            this.assertOperation();
            this.selectDeployedRuntime();
        }
        let nativeReason = automatic ? this.admissionContext.nativeReason : undefined;
        this.planDecisions = this.admissible(source, settings, preserve ? this.subtitleAssets : [], tracks, nativeReason, automatic);
        this.runtimeCapabilities.begin(source, this.planDecisions);
        if (pinnedMode && pinnedMode !== 'native' && this.privateRemux && this.privatePlaybackAssetsFailure)
            throw this.privatePlaybackAssetsFailure;
        if (pinnedMode && !this.planDecisions.some(p => p.mode === pinnedMode && p.eligible)) {
            const candidates = this.planDecisions.filter(p => p.mode === pinnedMode);
            const rejection = candidates.find(p => p.code === 'ISOLATION_REQUIRED') ?? (this.privateRemux ? candidates.find(p => p.id.startsWith(pinnedMode + '-private') && p.code !== 'PLAN_NOT_REQUESTED') : undefined) ?? candidates.find(p => p.code !== 'PLAN_NOT_REQUESTED');
            const deployment = deploymentRejectionError(candidates);
            if (rejection?.code !== 'ISOLATION_REQUIRED' && deployment)
                throw deployment;
            throw new PlayerError(rejection?.code === 'ISOLATION_REQUIRED' ? 'ISOLATION_REQUIRED' : 'UNSUPPORTED_FEATURE', rejection?.reason ?? 'No qualified complete playback plan');
        }
        const errors = [];
        let captionFailure;
        let interruptedDirect;
        const attempt = async (plan, budget) => {
            if (plan.mode === 'hybrid')
                await this.inspectForQualifiedWebGPU(source, settings);
            // Only discovery owns the replacement and full-budget restoration below.
            // Other callers of replace retain the ordinary direct readiness deadline.
            const loadBudget = budget ?? (this.localRemuxRetry(source, plan.id, settings) && this.sourceInspection?.probe.format?.split(',').includes('matroska') ? 1500 : undefined);
            this.runtimeCapabilities.update(plan.id, 'probing');
            await this.replace(source, plan.mode, settings, preserve, tracks, target, automatic, plan.id, loadBudget);
            this.acceptEvidence(plan.id);
            this.record({ mode: plan.mode, outcome: 'selected', reason: `${plan.id}: Playback requirements and actual startup accepted` });
            if (this.current?.error && !this.recovering)
                this.recover(this.current);
        };
        // The finite registry supplies a deterministic order. No speculative engines.
        for (let index = 0; index < this.planDecisions.length; index++) {
            this.assertOperation();
            let plan = this.planDecisions[index];
            if (pinnedMode ? plan.mode !== pinnedMode : PLAYBACK_MODES.indexOf(plan.mode) < start)
                continue;
            if (automatic && plan.eligible && plan.mode === 'hybrid' && this.sourceInspection?.source === source && this.sourceInspection.probe.hybridRejection) {
                plan.eligible = false;
                plan.code = 'FEATURE_UNSUPPORTED';
                plan.reason = this.sourceInspection.probe.hybridRejection;
                this.runtimeCapabilities.admission(this.planDecisions);
            }
            // Repackaging A/V cannot repair a failed browser caption renderer.
            if (captionFailure && plan.mode === 'native') {
                if (plan.eligible) {
                    plan.eligible = false;
                    plan.code = 'FEATURE_UNSUPPORTED';
                    plan.reason = captionFailure;
                    this.runtimeCapabilities.admission(this.planDecisions);
                    this.record({ mode: plan.mode, outcome: 'skipped', reason: `${plan.id}: ${captionFailure}` });
                }
                continue;
            }
            // Optional inspection and preparation are strictly after original-copy attempts.
            // Never let adaptation bypass subtitle/transport/filter semantic rejection.
            if ((!this.providerRuntime || this.providerRuntime.hasOffer(this.preparationProviderId, 'flac-lossless')) && automatic && plan.id.startsWith('native-flac') && this.audioPlayback !== 'worklet' && this.automaticLossless && !nativeReason && this.sourceInspection?.source === source && this.sourceInspection.probe.tracks.some(t => t.type === 'audio' && ['pcm_s16le', 'pcm_s24le'].includes(t.codec)) && !this.losslessInspection && source.kind === 'local') {
                const inspected = this.sourceInspection;
                const permitted = this.admissible(source, settings, preserve ? this.subtitleAssets : [], tracks, nativeReason, automatic).find(p => p.id === plan.id);
                if (permitted?.code === 'SOURCE_UNSUPPORTED') {
                    const controller = this.inspection = new AbortController();
                    try {
                        const { probeSource } = await this.interruptible(import(new URL('web/source-probe.js', this.assetBase).href));
                        const compiledWasm = this.providerRuntime ? await this.interruptible(this.providerRuntime.module(`web/engine-adaptation${this.privateRemux ? '-' + this.remuxRuntime : ''}/remux.wasm`)) : undefined;
                        const probe = await probeSource({ file: source.file instanceof File ? source.file : new File([source.file], 'media') }, controller.signal, 'flac', compiledWasm, this.remuxRuntime);
                        this.assertOperation();
                        this.losslessInspection = { source, reason: losslessAdaptationRejection(probe, inspected.settings) };
                    }
                    finally {
                        controller.abort();
                        if (this.inspection === controller)
                            this.inspection = undefined;
                    }
                    this.planDecisions = this.admissible(source, settings, preserve ? this.subtitleAssets : [], tracks, nativeReason, automatic);
                    plan = this.planDecisions[index];
                    this.runtimeCapabilities.admission(this.planDecisions);
                }
            }
            if (automatic && plan.id.startsWith('native-transcode') && !this.transcodeAssetsChecked && this.audioPlayback === 'auto' && !this.audioAdaptation && !this.automaticLossless && plan.code === 'DEPLOYMENT_UNAVAILABLE' && plan.reason === 'FLAC24 preparation assets are unavailable') {
                const controller = this.inspection = new AbortController();
                try {
                    this.transcodeAssetsAvailable = await this.optionalAssetsAvailable(['mjs', 'wasm'].map(ext => `web/engine-adaptation${this.privateRemux ? '-' + this.remuxRuntime : ''}/remux.${ext}`), controller);
                    this.assertOperation();
                    this.transcodeAssetsChecked = true;
                }
                finally {
                    controller.abort();
                    if (this.inspection === controller)
                        this.inspection = undefined;
                }
                this.planDecisions = this.admissible(source, settings, preserve ? this.subtitleAssets : [], tracks, nativeReason, automatic);
                plan = this.planDecisions[index];
                this.runtimeCapabilities.admission(this.planDecisions);
            }
            // The common native A/V path never pays for optional mpv-audio asset
            // probes. Check once only when discovery actually reaches a split plan.
            if (automatic && plan.id.startsWith('native-video-mpv-audio') && !this.selectiveAudioAssetsChecked && this.fileServicesSource(source) && this.sourceInspection?.source === source && this.audioOutput === 'stereo' && settings.gain === 1 && plan.browserCapability?.status !== 'unsupported') {
                const controller = this.inspection = new AbortController();
                try {
                    this.selectiveAudioAssetsAvailable = await this.optionalAssetsAvailable(this.privateRemux ? [`web/engine-mpv-audio-${this.remuxRuntime}/service.mjs`, `web/engine-mpv-audio-${this.remuxRuntime}/service.wasm`, 'web/private-mpv/audio-worklet.js'] : ['web/engine-selective/player.mjs', 'web/engine-selective/player.wasm', 'web/selective-sync-worklet.js'], controller);
                    this.assertOperation();
                    this.selectiveAudioAssetsChecked = true;
                }
                finally {
                    controller.abort();
                    if (this.inspection === controller)
                        this.inspection = undefined;
                }
                this.planDecisions = this.admissible(source, settings, preserve ? this.subtitleAssets : [], tracks, nativeReason, automatic);
                plan = this.planDecisions[index];
                this.runtimeCapabilities.admission(this.planDecisions);
            }
            if (this.privateRemux && this.privatePlaybackAssetsFailure && (plan.id.startsWith('software-private') || plan.id.startsWith('hybrid-private')))
                throw this.privatePlaybackAssetsFailure;
            if (!plan.eligible) {
                if (plan.code !== 'PLAN_NOT_REQUESTED')
                    this.record({ mode: plan.mode, outcome: 'skipped', reason: `${plan.id}: ${plan.reason}` });
                continue;
            }
            const prior = automatic ? this.tierAttempts.reason(source, this.tierConfiguration(settings), plan.id) : undefined;
            if (prior) {
                this.runtimeCapabilities.update(plan.id, 'failed', undefined, `Cached compatibility rejection: ${prior}`, 'compatibility');
                this.record({ mode: plan.mode, outcome: 'skipped', reason: `${plan.id}: cached compatibility rejection: ${prior}` });
                continue;
            }
            try {
                await attempt(plan);
                return;
            }
            catch (error) {
                const compatible = compatibilityFailure(error);
                // An inspected local File has no remote transport to retry or bypass.
                // A direct parser readiness deadline may try the already-admitted remux
                // route once, without caching a codec failure or broadening admission.
                const retryLocalLoad = error instanceof NativeLoadTimeout ? this.localRemuxRetry(source, plan.id, settings) : undefined;
                const inconclusiveOutput = automatic && source.kind === 'local' && error instanceof StartupEvidenceTimeout && error.stage === 'output';
                if (retryLocalLoad && error instanceof NativeLoadTimeout && error.budgetMs < 25000)
                    interruptedDirect = { id: plan.id, remux: retryLocalLoad };
                if (compatible && !evidenceInterrupted(error))
                    this.tierAttempts.failure(source, this.tierConfiguration(settings), plan.id, String(error));
                this.runtimeCapabilities.update(plan.id, evidenceInterrupted(error) ? 'untested' : 'failed', undefined, String(error), retryLocalLoad || inconclusiveOutput ? undefined : compatible ? 'compatibility' : 'terminal');
                this.record({ mode: plan.mode, outcome: 'failed', reason: `${plan.id}: ${String(error)}` });
                // Admission does not prove remux will work. A short scheduling trial
                // must not discard a playable original when its replacement is missing
                // or fails. Restore the original once with its full readiness budget.
                // Cancellation, source permissions/identity and autoplay stay terminal.
                if (interruptedDirect?.remux === plan.id && !(error instanceof BrowserCaptionUnsupported) && (compatible || ['ASSET_LOAD_FAILED', 'NETWORK_TIMEOUT', 'ISOLATION_REQUIRED'].includes(playerError(error).code))) {
                    const direct = interruptedDirect;
                    interruptedDirect = undefined;
                    this.assertOperation();
                    try {
                        await attempt({ id: direct.id, mode: 'native' }, 25000);
                        return;
                    }
                    catch (originalError) {
                        const originalCompatible = compatibilityFailure(originalError);
                        if (originalCompatible && !evidenceInterrupted(originalError))
                            this.tierAttempts.failure(source, this.tierConfiguration(settings), direct.id, String(originalError));
                        this.runtimeCapabilities.update(direct.id, evidenceInterrupted(originalError) ? 'untested' : 'failed', undefined, String(originalError), originalCompatible ? 'compatibility' : 'terminal');
                        this.record({ mode: 'native', outcome: 'failed', reason: `${direct.id}: full-budget retry: ${String(originalError)}` });
                        this.assertOperation();
                        if (!originalCompatible)
                            throw originalError;
                        errors.push(`${direct.id}: ${String(originalError)}`);
                    }
                }
                // Explicit plans keep a precise timeline rejection. Automatic
                // selection may still try Hybrid when this Native path cannot play it.
                if (this.destroyed || this.activeOperation?.controller.signal.aborted || (!automatic && playerError(error).code === 'UNSUPPORTED_TIMELINE') || (!compatible && !retryLocalLoad && !inconclusiveOutput))
                    throw error;
                // Direct and remux share the subtitle renderer; repackaging cannot fix it.
                if (error instanceof BrowserCaptionUnsupported) {
                    captionFailure = error.message;
                    interruptedDirect = undefined;
                }
                errors.push(`${plan.id}: ${String(error)}`);
                if (this.fastInspectedSource === source && !retryLocalLoad) {
                    nativeReason = await this.inspectFallbackAfterFastFailure(source, settings);
                    this.admissionContext = { nativeReason, automatic };
                    this.planDecisions = this.admissible(source, settings, preserve ? this.subtitleAssets : [], tracks, nativeReason, automatic);
                    this.runtimeCapabilities.admission(this.planDecisions);
                    index = -1;
                }
            }
        }
        const deployment = deploymentRejectionError(this.planDecisions.filter(p => pinnedMode ? p.mode === pinnedMode : PLAYBACK_MODES.indexOf(p.mode) >= start));
        if (deployment)
            throw deployment;
        throw Error('No playback route satisfied the source: ' + (errors.join('; ') || this.planDecisions.map(p => p.reason).filter(Boolean).join('; ')));
    }
    recover(session) {
        if (this.recovering || this.recoveredSessions.has(session) || this.destroyed || !this.automatic || !this.source || this.mode === 'software')
            return;
        this.recoveredSessions.add(session);
        const plan = executionPlan(this.mode, backendPlan(session.backend), this.settings.af, this.settings.gain, !!session.backend.diagnostics?.subtitleOverlay);
        this.runtimeCapabilities.update(plan.id, 'failed', this.evidence(session), String(session.error), compatibilityFailure(session.error) ? 'compatibility' : 'terminal');
        if (!compatibilityFailure(session.error)) {
            void session.backend.pause().catch(() => { });
            this.emit('error', session.error);
            return;
        }
        if (!evidenceInterrupted(session.error))
            this.tierAttempts.failure(this.source, this.tierConfiguration(this.settings), plan.id, String(session.error));
        this.recovering = true;
        void this.enqueue(async () => {
            if (this.current !== session || !this.automatic)
                return;
            await session.backend.pause().catch(() => { });
            const policy = this.nativeRemux;
            const streaming = this.failedStreamingPlan(session);
            const tryRemux = !streaming && this.mode === 'native' && backendPlan(session.backend) === 'direct' && policy !== 'never';
            const priorAttempts = [...this.attempts.filter(attempt => attempt.outcome !== 'selected'), { mode: this.mode, outcome: 'failed', reason: `${plan.id}: Runtime playback failure: ${session.error?.message ?? 'Playback backend became unavailable'}` }];
            try {
                if (tryRemux)
                    this.nativeRemux = 'always';
                await this.select(this.source, this.settings, true, this.nativeTracks, streaming || tryRemux || this.mode === 'native' ? 0 : PLAYBACK_MODES.indexOf(this.mode) + 1, undefined, priorAttempts);
            }
            finally {
                this.nativeRemux = policy;
            }
        }, 'switching').catch(error => { if (!this.destroyed)
            this.emit('error', error); }).finally(() => { this.recovering = false; if (this.current?.error && this.current !== session)
            this.recover(this.current); });
    }
    setAutomaticSelection(enabled = true) {
        if (typeof enabled !== 'boolean')
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid automatic selection policy');
        return this.enqueue(async () => {
            const previous = this.automatic;
            this.automatic = enabled;
            try {
                if (enabled && this.source)
                    await this.select(this.source, this.settings, true, this.nativeTracks);
            }
            catch (error) {
                this.automatic = previous;
                throw error;
            }
        }, 'switching');
    }
    open(input, options = {}) {
        if (options.startTime !== undefined && (!Number.isFinite(options.startTime) || options.startTime < 0))
            return Promise.reject(new PlayerError('INVALID_ARGUMENT', 'startTime must be finite nonnegative seconds'));
        if (isCustomSource(input)) {
            const provider = input;
            return this.enqueue(async () => { const file = await materializeSource(provider, this.activeOperation.controller.signal); const source = { kind: 'local', file, input: { demuxer: options.demuxer }, trackPolicy: normalizeTrackPolicy({ ...this.configuredTrackPolicy, ...normalizeTrackPolicy(options.trackPolicy) }) }; const inspection = this.sourceInspection, lossless = this.losslessInspection, fast = this.fastInspectedSource; try {
                await this.select(source, this.settings, false, [], 0, options.startTime);
            }
            catch (error) {
                if (this.source !== source) {
                    this.sourceInspection = inspection;
                    this.losslessInspection = lossless;
                    this.fastInspectedSource = fast;
                }
                throw error;
            } }, 'opening', options.signal);
        }
        let source;
        try {
            if (options.startTime !== undefined && (!Number.isFinite(options.startTime) || options.startTime < 0))
                throw new PlayerError('INVALID_ARGUMENT', 'startTime must be finite nonnegative seconds');
            if (input instanceof Blob && !(input instanceof File))
                input = new File([input], 'media', { type: input.type });
            if (typeof input === 'string' || input instanceof URL || (!(input instanceof File) && !(input instanceof ArrayBuffer) && input && typeof input === 'object')) {
                const value = typeof input === 'string' || input instanceof URL ? { url: String(input) } : input;
                if (typeof value.url !== 'string' || !value.url.trim())
                    throw Error('Invalid remote URL');
                const url = new URL(value.url, location.href);
                if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
                    throw Error('Invalid remote URL');
                const format = value.format ?? (/\.m3u8$/i.test(url.pathname) ? 'hls' : /\.mpd$/i.test(url.pathname) ? 'dash' : 'file');
                if (!['file', 'hls', 'dash'].includes(format))
                    throw Error('Invalid source format');
                if (value.streaming?.maxBandwidth !== undefined && (!Number.isFinite(value.streaming.maxBandwidth) || value.streaming.maxBandwidth <= 0))
                    throw Error('Invalid streaming bandwidth limit');
                if (value.streaming?.representation !== undefined && (typeof value.streaming.representation !== 'string' || !value.streaming.representation))
                    throw Error('Invalid streaming representation');
                if (value.streaming?.live !== undefined && typeof value.streaming.live !== 'boolean')
                    throw Error('Invalid live permission');
                source = { kind: 'remote', options: { ...value, format, url: url.href, credentials: value.credentials ?? (format === 'file' ? undefined : 'same-origin'), headers: value.headers ? { ...value.headers } : undefined, streaming: value.streaming ? { ...value.streaming } : undefined, allowedOrigins: value.allowedOrigins?.slice() } };
            }
            else {
                if (!(input instanceof File) && !(input instanceof ArrayBuffer))
                    throw Error('Expected File, ArrayBuffer or remote source');
                if (input instanceof ArrayBuffer && input.byteLength > 32 * 1024 * 1024)
                    throw Error('ArrayBuffer sources are limited to 32 MiB; use File for larger sources');
                source = { kind: 'local', file: input instanceof File ? input : input.slice(0), input: { demuxer: options.demuxer } };
            }
            source.trackPolicy = normalizeTrackPolicy({ ...this.configuredTrackPolicy, ...normalizeTrackPolicy(options.trackPolicy) });
        }
        catch (error) {
            return Promise.reject(playerError(error));
        }
        return this.enqueue(async () => {
            const inspection = this.sourceInspection, lossless = this.losslessInspection, fastInspectedSource = this.fastInspectedSource;
            try {
                await this.select(source, this.settings, false, [], 0, options.startTime);
            }
            catch (error) {
                if (this.source !== source) {
                    this.sourceInspection = inspection;
                    this.losslessInspection = lossless;
                    this.fastInspectedSource = fastInspectedSource;
                }
                throw error;
            }
        }, 'opening', options.signal);
    }
    openRemote(source, options = {}) { return this.open(source, options); }
    setMode(mode) {
        modeValue(mode);
        return this.enqueue(async () => {
            this.validateFilters(mode, this.settings);
            if (mode === this.mode) {
                this.automatic = false;
                return;
            }
            if (this.source)
                await this.replace(this.source, mode, this.settings, true, this.nativeTracks, undefined, false);
            else {
                this.currentMode = mode;
                this.emit('modechange', { phase: 'ready', mode, position: 0 });
            }
            this.automatic = false;
        }, 'switching');
    }
    filters(key, value) {
        const chain = filterChain(value);
        return this.enqueue(() => this.applySetting({ kind: 'filters', key, value: chain }), 'switching');
    }
    setVideoFilters(value) { return this.filters('vf', value); }
    setAudioFilters(value) { return this.filters('af', value); }
    setAudioGain(value) {
        if (!Number.isFinite(value) || value < 0 || value > 1)
            throw new PlayerError('INVALID_ARGUMENT', 'Gain must be between 0 and 1');
        return this.enqueue(async () => {
            if (value === this.settings.gain)
                return;
            const desired = { ...this.settings, gain: value };
            if (this.source && backendPlan(this.current?.backend) === 'remux-mpv' && value !== 1) {
                await this.select(this.source, desired, true, this.nativeTracks);
                return;
            }
            if (this.current?.backend.gain) {
                await this.applySetting({ kind: 'gain', value });
                if (this.source) {
                    this.planDecisions = this.admissible(this.source, desired, this.subtitleAssets, this.nativeTracks, this.admissionContext.nativeReason, this.admissionContext.automatic);
                    // The same accepted backend now executes a different complete plan.
                    // Keep prior evidence in the bounded cache, but describe current requirements.
                    this.runtimeCapabilities.begin(this.source, this.planDecisions);
                    const plan = executionPlan(this.mode, backendPlan(this.current.backend), desired.af, desired.gain, !!this.current.backend.diagnostics?.subtitleOverlay);
                    this.acceptEvidence(plan.id);
                }
            }
            else if (this.source)
                await this.select(this.source, desired, true, this.nativeTracks);
            else
                this.settings = desired;
        });
    }
    async executeSetting(backend, effect, session) {
        switch (effect.kind) {
            case 'seek': return backend.seek(effect.value);
            case 'seek.verify': return this.settled(session, this.mode, effect.value);
            case 'volume': return backend.volume(effect.value);
            case 'rate': return backend.rate(effect.value);
            case 'gain': return backend.gain(effect.value);
            case 'pause': return backend.pause();
            case 'play': return backend.play();
            case 'track': return backend.selectTrack(effect.track, effect.value);
            case 'track.verify': return this.confirmTrackSelection(session, this.source, this.mode, effect.settings, effect.track, effect.value);
            case 'subtitles': return backend.subtitleVisible(effect.value);
            case 'buffering': return backend.setBuffering(effect.value);
            case 'output': return backend.setAudioOutputDevice(effect.value);
            case 'quality': return backend.setQuality(effect.value);
            case 'filter': return backend.command('set', effect.key, effect.value);
            case 'promotion':
                this.schedulePromotion();
                return;
            case 'source.replace': return this.replace(this.source, effect.mode, effect.settings, true, this.nativeTracks, undefined, false);
            case 'source.reconfigure': return this.select(this.source, effect.settings, true, this.nativeTracks);
        }
    }
    /** All decisions and accepted values live in the composed transition. This
     * adapter invokes typed effects and reports their outcome with the original ID. */
    async applySetting(command) {
        const session = this.current, backend = session?.backend, begin = this.dispatchControl({ type: 'setting.begin', command, hasBackend: !!backend, hasSource: !!this.source, hybridAudioFilters: this.hybridAudioFilters });
        if (!begin.accepted || !begin.effects)
            throw new PlayerError(begin.reason === 'unsupported' ? 'UNSUPPORTED_FEATURE' : begin.reason === 'invalid' ? 'INVALID_ARGUMENT' : 'ABORTED', begin.message ?? 'Setting operation was retired');
        const id = begin.id;
        const execute = async (effects) => { for (const effect of effects) {
            if (!settingAuthority(this.control, id))
                throw new PlayerError('ABORTED', 'Setting operation was retired');
            await this.interruptible(this.executeSetting(backend, effect, session));
        } };
        try {
            await execute(begin.effects);
        }
        catch (error) {
            if (this.control.settingsTransactions.pending?.id === id && this.control.settingsTransactions.pending.phase === 'accepted') {
                this.dispatchControl({ type: 'setting.accept', id });
                throw error;
            }
            const failure = this.dispatchControl({ type: 'setting.failed', id });
            if (!failure.accepted || !failure.effects)
                throw new PlayerError('ABORTED', 'Setting operation was retired');
            try {
                await execute(failure.effects);
            }
            catch (restoreError) {
                const degraded = this.dispatchControl({ type: 'setting.degraded', id });
                if (!degraded.accepted)
                    throw new PlayerError('ABORTED', 'Setting operation was retired');
                const failure = new PlayerError('DECODE_FAILED', `Setting update and rollback failed; backend settings may be partially applied (${playerError(restoreError).message})`);
                this.emit('error', failure);
                throw failure;
            }
            if (!this.dispatchControl({ type: 'setting.restored', id }).accepted)
                throw new PlayerError('ABORTED', 'Setting operation was retired');
            throw error;
        }
        const accepted = this.dispatchControl({ type: 'setting.accept', id });
        if (!accepted.accepted)
            throw new PlayerError('ABORTED', 'Setting operation was retired');
        for (const effect of accepted.effects ?? []) {
            this.assertOperation();
            await this.executeSetting(this.current?.backend ?? backend, effect, this.current);
        }
    }
    async playNativeVerified(backend, playing = backend.play(), outputBudgetMs, intent) {
        const controller = new AbortController();
        const signals = [intent, this.activeOperation?.controller.signal].filter((signal) => !!signal);
        const abort = () => controller.abort();
        for (const signal of signals) {
            signal.addEventListener('abort', abort, { once: true });
            if (signal.aborted)
                abort();
        }
        let verification;
        try {
            verification = backend.verifyOutput(controller.signal, outputBudgetMs);
            await Promise.all([playing, verification]);
        }
        finally {
            for (const signal of signals)
                signal.removeEventListener('abort', abort);
            controller.abort();
            await verification?.catch(() => { });
        }
    }
    play() {
        this.#previewController.setPlaybackActive(true);
        const intent = new AbortController(), intentId = this.dispatchControl({ type: 'play.request' }).id;
        this.playRequests.set(intentId, intent);
        // An unverified trial must not consume the user's requested playback position.
        const trialSession = this.current, trialPosition = Math.max(0, Number(this.current?.backend.properties.get('time-pos')) || 0);
        const trialVerified = this.evidence(this.current).outputVerified === true;
        // Initiate resume before yielding the user's activation to the operation queue.
        let immediate;
        try {
            immediate = !this.destroyed && this.queued === 0 && this.current ? this.current.backend.play() : undefined;
        }
        catch (error) {
            this.dispatchControl({ type: 'play.settled', id: intentId });
            this.playRequests.delete(intentId);
            throw error;
        }
        immediate?.catch(() => { });
        return this.enqueue(async () => {
            if (intent.signal.aborted)
                return;
            if (!this.current)
                throw Error('No source');
            const session = this.current;
            this.updateSettings({ pause: false });
            // A local original-copy trial can yield to an already-admitted route.
            // This is a scheduling budget, not a codec rejection or a new route.
            const boundedTrial = this.automatic && this.source?.kind === 'local' && this.nativeRemux !== 'never' && !trialVerified &&
                ['direct', 'direct-mpv'].includes(backendPlan(session.backend) ?? '') &&
                this.planDecisions?.some(plan => plan.eligible && !plan.id.startsWith('native-direct'));
            try {
                const playing = immediate ?? session.backend.play();
                if (this.mode === 'native')
                    await this.playNativeVerified(session.backend, playing, boundedTrial ? 1500 : undefined, intent.signal);
                else
                    await playing;
                this.assertOperation();
                if (this.current === session) {
                    const plan = this.diagnostics.plan;
                    if (plan)
                        this.acceptEvidence(plan.id, session);
                }
            }
            catch (error) {
                // A newer Pause supersedes this Play without rejecting the accepted
                // codec or starting fallback. Its queued pause command applies next.
                if (intent.signal.aborted)
                    return;
                const inconclusiveOutput = this.source?.kind === 'local' && error instanceof StartupEvidenceTimeout && error.stage === 'output';
                if (this.automatic && (compatibilityFailure(error) || inconclusiveOutput) && this.source) {
                    const streaming = this.failedStreamingPlan(session);
                    const policy = this.nativeRemux, tryRemux = !streaming && this.mode === 'native' && ['direct', 'direct-mpv'].includes(backendPlan(session.backend) ?? '') && policy !== 'never';
                    const plan = this.diagnostics.plan;
                    if (plan) {
                        this.runtimeCapabilities.update(plan.id, inconclusiveOutput ? 'prepared' : 'failed', this.evidence(session), String(error), inconclusiveOutput ? undefined : 'compatibility');
                        if (!evidenceInterrupted(error))
                            this.tierAttempts.failure(this.source, this.tierConfiguration(this.settings), plan.id, String(error));
                    }
                    try {
                        if (tryRemux)
                            this.nativeRemux = 'always';
                        await this.select(this.source, this.settings, true, this.nativeTracks, streaming || tryRemux || this.mode === 'native' ? 0 : PLAYBACK_MODES.indexOf(this.mode) + 1, session === trialSession && !trialVerified ? trialPosition : undefined);
                    }
                    catch (fallbackError) {
                        this.assertOperation();
                        // Slow original output is not incompatibility. If replacement fails,
                        // retain the accepted source and give it the ordinary full deadline.
                        if (!boundedTrial || !inconclusiveOutput || this.current !== session || !(compatibilityFailure(fallbackError) || ['ASSET_LOAD_FAILED', 'NETWORK_TIMEOUT', 'ISOLATION_REQUIRED'].includes(playerError(fallbackError).code)))
                            throw fallbackError;
                        if (session === trialSession && !trialVerified) {
                            await session.backend.seek(trialPosition);
                            this.assertOperation();
                        }
                        try {
                            await this.playNativeVerified(session.backend, undefined, undefined, intent.signal);
                        }
                        catch (error) {
                            if (intent.signal.aborted)
                                return;
                            throw error;
                        }
                        this.assertOperation();
                        if (plan)
                            this.acceptEvidence(plan.id, session);
                    }
                    finally {
                        this.nativeRemux = policy;
                    }
                }
                else {
                    const plan = this.diagnostics.plan;
                    if (plan && evidenceInterrupted(error))
                        this.runtimeCapabilities.update(plan.id, 'prepared', this.evidence(session), String(error));
                    this.updateSettings({ pause: true });
                    await session.backend.pause().catch(() => { });
                    throw error;
                }
            }
        }).finally(() => { this.dispatchControl({ type: 'play.settled', id: intentId }); this.playRequests.delete(intentId); });
    }
    pause() { for (const id of this.dispatchControl({ type: 'play.retire' }).retire)
        this.playRequests.get(id)?.abort(); return this.enqueue(async () => { await this.applySetting({ kind: 'pause' }); this.dispatchControl({ type: 'playback.observed', playing: false, waiting: false }); if (this.backgroundPromotion)
        this.schedulePromotion(); }); }
    seek(seconds, options = {}) { return this.seekForSource(seconds, options); }
    seekForSource(seconds, options, sourceId) {
        if (!Number.isFinite(seconds) || seconds < 0)
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid seek time');
        if (options.policy !== undefined && !['queue', 'latest'].includes(options.policy))
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid seek policy');
        const controller = new AbortController(), abort = () => controller.abort();
        options.signal?.addEventListener('abort', abort, { once: true });
        if (options.signal?.aborted)
            abort();
        const request = this.dispatchControl({ type: 'seek.request', latest: options.policy === 'latest' }), seekId = request.id;
        this.seekRequests.set(seekId, controller);
        for (const id of request.retire)
            this.seekRequests.get(id)?.abort();
        return this.enqueue(async () => {
            if (sourceId !== undefined && sourceId !== this.state.sourceId)
                throw new PlayerError('INVALID_ARGUMENT', 'Chapter belongs to a retired source');
            if (!this.current)
                throw new Error('No source');
            if (this.playbackRange && (seconds < this.playbackRange.start || seconds > this.playbackRange.end))
                throw new PlayerError('INVALID_ARGUMENT', 'Seek is outside the playback range');
            const window = this.state.seekable;
            if (window && !window.some(r => seconds >= r.start && seconds <= r.end))
                throw new PlayerError('INVALID_ARGUMENT', 'Seek is outside the current seekable window');
            const accepted = this.current, previous = Number(accepted.backend.properties.get('time-pos')) || 0, wasPaused = this.settings.pause;
            try {
                await accepted.backend.seek(seconds);
                await this.settled(accepted, this.mode, seconds);
            }
            catch (error) {
                if (error instanceof SeekPresentationBoundary) {
                    // A demux restart can prove the requested subtitle-only interval has no
                    // AV presentation. Restore the accepted position rather than leave its
                    // audio held behind an impossible seek target. A failed restoration
                    // means this route is broken and automatic selection may continue.
                    if (this.current === accepted && !this.destroyed && !this.activeOperation?.controller.signal.aborted) {
                        try {
                            await accepted.backend.seek(previous);
                            await this.settled(accepted, this.mode, previous);
                            if (!wasPaused)
                                await accepted.backend.play();
                        }
                        catch (restoreError) {
                            // A route that cannot restore its last presented position has
                            // failed; let automatic selection try the next admitted plan.
                            if (!this.automatic || !this.source)
                                throw restoreError;
                            const attempts = [...this.attempts.filter(attempt => attempt.outcome !== 'selected'), { mode: this.mode, outcome: 'failed', reason: `Seek presentation failure: ${playerError(error).message}; accepted position recovery failed: ${playerError(restoreError).message}` }];
                            const failedPlan = this.diagnostics.plan;
                            if (this.mode === 'native' && failedPlan)
                                this.tierAttempts.failure(this.source, this.tierConfiguration(this.settings), failedPlan.id, String(restoreError));
                            await this.select(this.source, this.settings, true, this.nativeTracks, this.mode === 'native' ? 0 : PLAYBACK_MODES.indexOf(this.mode) + 1, seconds, attempts);
                            return;
                        }
                    }
                    throw error;
                }
                if (this.activeOperation?.controller.signal.aborted || ['AUTOPLAY_BLOCKED', 'INVALID_ARGUMENT'].includes(playerError(error).code) || !this.automatic || this.mode === 'software' || terminalSourceFailure(error) || /out of range|Invalid seek/i.test(String(error)))
                    throw error;
                const priorAttempts = [...this.attempts.filter(attempt => attempt.outcome !== 'selected'), { mode: this.mode, outcome: 'failed', reason: `Seek presentation failure: ${playerError(error).message}` }];
                const streaming = this.failedStreamingPlan(accepted);
                const failedPlan = this.diagnostics.plan;
                if (this.mode === 'native' && failedPlan)
                    this.tierAttempts.failure(this.source, this.tierConfiguration(this.settings), failedPlan.id, String(error));
                await this.select(this.source, this.settings, true, this.nativeTracks, streaming || this.mode === 'native' ? 0 : PLAYBACK_MODES.indexOf(this.mode) + 1, seconds, priorAttempts);
            }
        }, 'seeking', controller.signal).finally(() => { options.signal?.removeEventListener('abort', abort); this.dispatchControl({ type: 'seek.settled', id: seekId }); this.seekRequests.delete(seekId); });
    }
    seekChapter(id) { const chapter = this.state.mediaInfo.chapters?.find(c => c.id === id); if (!chapter)
        return Promise.reject(new PlayerError('INVALID_ARGUMENT', 'Unknown source chapter')); return this.seekForSource(chapter.start, {}, this.state.sourceId); }
    getPlaybackRange() { return this.playbackRange ? freeze({ ...this.playbackRange }) : null; }
    getLoop() { return typeof this.loopPolicy === 'object' ? freeze({ ...this.loopPolicy }) : this.loopPolicy; }
    rangeFacts() { return { hasBackend: !!this.current, time: this.state.currentTime, duration: this.state.duration, seekable: (this.state.seekable ?? []).map(window => ({ ...window })) }; }
    setPlaybackRange(range) {
        const copy = range ? { ...range } : null;
        return this.enqueue(() => this.applySetting({ kind: 'range', value: copy, facts: this.rangeFacts() }), 'seeking');
    }
    setLoop(policy) {
        const copy = typeof policy === 'object' && policy ? { ...policy } : policy;
        return this.enqueue(() => this.applySetting({ kind: 'loop', value: copy, facts: this.rangeFacts() }), typeof copy === 'object' ? 'seeking' : null);
    }
    enforceBoundary() {
        if (!this.current)
            return;
        const sample = () => ({ time: this.state.currentTime, duration: this.state.duration, ended: this.state.status === 'ended' });
        const admitted = this.dispatchControl({ type: 'boundary.sample', ...sample() });
        if (!admitted.accepted)
            return;
        const id = admitted.id, session = this.current;
        const fail = () => {
            const failed = this.dispatchControl({ type: 'boundary.failed', id });
            if (!failed.accepted)
                return;
            // Failed cleanup remains best effort; logical pause is already committed.
            try {
                void session.backend.pause().catch(() => { });
            }
            catch { }
            this.publish();
        };
        void this.enqueue(async () => {
            try {
                let decision = this.dispatchControl({ type: 'boundary.start', id, ...sample() });
                while (decision.accepted && decision.effects?.length) {
                    const phase = this.control.boundary.pending?.phase;
                    if (!phase || !boundaryAuthority(this.control, id))
                        return;
                    for (const effect of decision.effects) {
                        if (!boundaryAuthority(this.control, id))
                            return;
                        await this.interruptible(this.executeSetting(session.backend, effect, session));
                    }
                    decision = this.dispatchControl({ type: 'boundary.complete', id, phase });
                }
            }
            catch (error) {
                fail();
                throw error;
            }
        }, 'seeking').catch(fail).finally(() => { this.dispatchControl({ type: 'boundary.settled', id }); });
    }
    stepFrame(direction = 1) {
        if (direction !== 1 && direction !== -1)
            throw new PlayerError('INVALID_ARGUMENT', 'Frame direction must be 1 or -1');
        return this.enqueue(async () => {
            if (!this.current || this.mode === 'native' || !this.state.mediaInfo.video)
                throw new PlayerError('UNSUPPORTED_FEATURE', 'Frame stepping requires mpv video playback');
            const backend = this.current.backend, initial = this.state.currentTime;
            if (direction < 0 && initial <= 0)
                throw new PlayerError('INVALID_ARGUMENT', 'No previous frame at the start of the source');
            await backend.pause();
            this.updateSettings({ pause: true });
            await backend.command(direction === 1 ? 'frame-step' : 'frame-back-step');
            const deadline = performance.now() + 25000;
            while (performance.now() < deadline) {
                this.assertOperation();
                const time = Number(backend.properties.get('time-pos'));
                if (Number.isFinite(time) && (direction > 0 ? time > initial : time < initial)) {
                    await this.settled(this.current, this.mode, time);
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 20));
            }
            throw new PlayerError('UNSUPPORTED_FEATURE', 'No adjacent frame was presented within the stepping deadline');
        }, 'seeking');
    }
    snapshot(options = {}) {
        let result;
        return this.enqueue(async () => {
            const surface = this.surface;
            if (!surface || !this.state.mediaInfo.video)
                throw new PlayerError('UNSUPPORTED_FEATURE', 'No video presentation');
            const subtitle = this.state.subtitlesVisible && !!this.state.mediaInfo.subtitle, include = options.includeSubtitles ?? true;
            if (this.mode !== 'native') {
                if (subtitle && !include)
                    throw new PlayerError('UNSUPPORTED_FEATURE', 'The mpv surface already contains subtitles');
                if (options.width !== undefined || options.height !== undefined)
                    throw new PlayerError('UNSUPPORTED_FEATURE', 'mpv snapshots use the current presentation size');
                const backend = this.current.backend;
                if (!backend.previewSnapshot)
                    throw new PlayerError('UNSUPPORTED_FEATURE', 'Snapshot readback is unavailable');
                const image = await backend.previewSnapshot();
                result = Object.freeze({ ...image, mediaTime: this.state.currentTime, actualTime: null, includesSubtitles: subtitle });
                return;
            }
            if (subtitle && include)
                throw new PlayerError('UNSUPPORTED_FEATURE', 'Native subtitle composition is not qualified for snapshots');
            const video = surface, scale = Math.min(1, 1920 / video.videoWidth, 1080 / video.videoHeight);
            const width = options.width ?? Math.max(1, Math.round(video.videoWidth * scale)), height = options.height ?? Math.max(1, Math.round(video.videoHeight * scale));
            dimensions(width, height);
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            try {
                canvas.getContext('2d').drawImage(video, 0, 0, width, height);
                const blob = await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new PlayerError('UNSUPPORTED_FEATURE', 'Snapshot encoding failed')), 'image/png'));
                result = Object.freeze({ blob, width, height, mediaTime: this.state.currentTime, actualTime: null, includesSubtitles: false });
            }
            catch {
                throw new PlayerError('UNSUPPORTED_FEATURE', 'The browser does not permit snapshot readback for this source');
            }
        }).then(() => result);
    }
    volume(value) {
        if (!Number.isFinite(value) || value < 0 || value > 100)
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid volume');
        return this.enqueue(() => this.applySetting({ kind: 'volume', value }));
    }
    setVolume(value) { if (!Number.isFinite(value) || value < 0 || value > 1)
        throw new PlayerError('INVALID_ARGUMENT', 'Volume must be 0 to 1'); return this.volume(value * 100); }
    setMuted(value) { if (typeof value !== 'boolean')
        throw new PlayerError('INVALID_ARGUMENT', 'Expected boolean mute state'); return this.enqueue(() => this.applySetting({ kind: 'mute', value })); }
    setPlaybackRate(value) { return this.rate(value); }
    selectAudioTrack(id) { return this.selectPublicTrack('audio', id); }
    selectSubtitleTrack(id) { return this.selectPublicTrack('sub', id); }
    selectPublicTrack(type, id) {
        return this.enqueue(async () => {
            if (!this.current)
                throw Error('No source');
            const identity = this.control.source, raw = this.sourceTracks(), plan = backendPlan(this.current?.backend);
            const projected = tracks(raw, this.sourceSerial, this.mode, plan).filter(track => track.type === (type === 'audio' ? 'audio' : 'subtitle'));
            const inventory = projected.map(track => {
                const original = raw.find(item => item.type === type && `${this.sourceSerial}:${trackKey(item, this.mode, plan)}` === track.id);
                return { ...capturePolicyTrack(track), backendId: String(original.id), key: trackKey(original, this.mode, plan) };
            });
            await this.applySetting({ kind: 'publicTrack', track: type, id, facts: { sourceId: identity.serial, session: identity.acceptedSession, inventory, policy: captureTrackPolicy(type === 'audio' ? this.trackPolicy.audio : this.trackPolicy.subtitles), plan, surfaceLocked: this.presentation.locksSurface, automaticLossless: this.automaticLossless } });
        }, 'switching');
    }
    rate(value) {
        if (!Number.isFinite(value) || value < .5 || value > 2)
            throw new PlayerError('INVALID_ARGUMENT', 'Playback rate must be 0.5 to 2');
        return this.enqueue(() => this.applySetting({ kind: 'rate', value }));
    }
    selectTrack(type, id) {
        if (['audio', 'sub'].includes(type) && backendPlan(this.current?.backend) === 'shaka-mse') {
            const track = this.sourceTracks().find(t => t.type === type && String(t.id) === id);
            if (id !== 'auto' && id !== 'no' && !track)
                throw new PlayerError('INVALID_ARGUMENT', 'Unknown streaming track ID');
            return this.selectPublicTrack(type, id === 'no' ? null : id === 'auto' ? 'auto' : `${this.sourceSerial}:${trackKey(track, this.mode, 'shaka-mse')}`);
        }
        if (!['audio', 'sub'].includes(type) || !/^(?:[1-9][0-9]*|auto|no)$/.test(id))
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid track selection');
        if (this.current) {
            const raw = this.sourceTracks();
            const track = raw.find(t => t.type === type && String(t.id) === id);
            const plan = backendPlan(this.current?.backend);
            return this.selectPublicTrack(type, id === 'no' ? null : id === 'auto' ? 'auto' : track ? `${this.sourceSerial}:${trackKey(track, this.mode, plan)}` : 'missing');
        }
        assertTrackSelection(type === 'audio' ? this.trackPolicy.audio : this.trackPolicy.subtitles, id === 'no' ? null : id);
        return this.enqueue(() => this.applySetting({ kind: 'track', track: type, value: id, clearPublicSelection: true }));
    }
    subtitleVisible(visible) {
        if (typeof visible !== 'boolean')
            throw new PlayerError('INVALID_ARGUMENT', 'Expected boolean subtitle visibility');
        return this.enqueue(() => this.applySetting({ kind: 'visibility', value: visible, facts: { policy: captureTrackPolicy(this.trackPolicy.subtitles), hasTracks: this.sourceTracks().some(track => track.type === 'sub'), surfaceLocked: this.presentation.locksSurface, plan: backendPlan(this.current?.backend) } }));
    }
    getTimingSettings() { return freeze({ subtitleDelay: this.subtitleDelay, audioDelay: this.audioDelay, effectiveSubtitleDelay: this.current ? this.subtitleDelay : null, effectiveAudioDelay: this.current ? this.audioDelay : null, subtitleStyle: { ...this.subtitleStyle }, styleScope: 'plain-text' }); }
    timingChange(key, value) {
        return this.enqueue(() => this.applySetting(key === 'subtitleStyle' ? { kind: key, value: value } : { kind: key, value: value }), 'switching');
    }
    setSubtitleDelay(seconds) { if (!Number.isFinite(seconds) || Math.abs(seconds) > 60)
        throw new PlayerError('INVALID_ARGUMENT', 'Subtitle delay must be within -60 to 60 seconds'); return this.timingChange('subtitleDelay', seconds); }
    setAudioDelay(seconds) { if (!Number.isFinite(seconds) || Math.abs(seconds) > 60)
        throw new PlayerError('INVALID_ARGUMENT', 'Audio delay must be within -60 to 60 seconds'); return this.timingChange('audioDelay', seconds); }
    setSubtitleStyle(style) {
        if (!style || typeof style !== 'object' || Object.keys(style).some(key => !['fontSize', 'color', 'borderSize', 'fontFamily'].includes(key)) || style.fontSize !== undefined && (!Number.isFinite(style.fontSize) || style.fontSize < 8 || style.fontSize > 150) || style.borderSize !== undefined && (!Number.isFinite(style.borderSize) || style.borderSize < 0 || style.borderSize > 10) || style.color !== undefined && !/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(style.color) || style.fontFamily !== undefined && (typeof style.fontFamily !== 'string' || style.fontFamily.length > 128 || /[\x00-\x1f]/.test(style.fontFamily)))
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid plain-text subtitle style');
        return this.timingChange('subtitleStyle', { ...style });
    }
    addSubtitle(file, options = {}) { return this.attachSubtitle(file, options).then(() => { }); }
    attachSubtitle(file, options = {}) {
        const attachmentId = `subtitle-${++this.attachmentSerial}`;
        let sourceId = null;
        if (!(file instanceof File))
            return Promise.reject(new PlayerError('INVALID_ARGUMENT', 'Expected a subtitle File'));
        const format = file.name.split('.').at(-1)?.toLowerCase();
        if (!['ass', 'ssa', 'srt', 'vtt'].includes(format ?? '') || file.size > 8 * 1024 * 1024)
            return Promise.reject(new PlayerError('INVALID_ARGUMENT', 'Expected an SRT, ASS, SSA or WebVTT file up to 8 MiB'));
        return this.enqueue(async () => {
            if (!this.source)
                throw Error('Open a movie before adding subtitles');
            sourceId = this.state.sourceId;
            this.assertSubtitleAddition(options.label ?? file.name, options.language, format);
            if (this.subtitleAssets.length >= 16 || this.subtitleAssets.reduce((n, a) => n + a.bytes.byteLength, 0) + file.size > 16 * 1024 * 1024)
                throw Error('Subtitle budget exceeded');
            const bytes = await this.interruptible(file.arrayBuffer());
            const old = this.subtitleAssets, previousSelection = this.publicSelections.get('sub');
            if (options.select !== false)
                this.setPublicSelection('sub');
            this.subtitleAssets = [...old, { attachmentId, bytes, format: format, label: options.label ?? file.name, language: options.language, select: options.select ?? true }];
            try {
                plainVTT(this.subtitleAssets.at(-1));
                await this.select(this.source, { ...this.settings, sid: options.select === false ? this.settings.sid : 'auto' }, true, this.nativeTracks);
            }
            catch (error) {
                this.subtitleAssets = old;
                if (previousSelection !== undefined)
                    this.setPublicSelection('sub', previousSelection);
                throw error;
            }
        }).then(() => { const handle = freeze({ id: attachmentId, kind: 'subtitle', sourceId }); this.attachmentHandles.add(handle); return handle; });
    }
    addFont(file) { return this.attachFont(file).then(() => { }); }
    attachFont(file) {
        const attachmentId = `font-${++this.attachmentSerial}`;
        if (!(file instanceof File) || !/\.(ttf|otf)$/i.test(file.name) || file.size > 8 * 1024 * 1024)
            return Promise.reject(new PlayerError('INVALID_ARGUMENT', 'Expected a TTF/OTF font up to 8 MiB'));
        return this.enqueue(async () => {
            if (this.fonts.length >= 16 || this.fonts.reduce((n, a) => n + a.bytes.byteLength, 0) + file.size > 32 * 1024 * 1024)
                throw Error('Font budget exceeded');
            const bytes = await this.interruptible(file.arrayBuffer()), old = this.fonts;
            this.fonts = [...old, { attachmentId, name: attachmentId + '.' + file.name.split('.').at(-1).toLowerCase(), bytes }];
            try {
                if (this.source && (this.mode !== 'native' || (this.nativeASS && this.subtitleAssets.length) || backendPlan(this.current?.backend) === 'remux-mpv'))
                    await this.replace(this.source, this.mode, this.settings, true, this.nativeTracks);
            }
            catch (error) {
                this.fonts = old;
                throw error;
            }
        }).then(() => { const handle = freeze({ id: attachmentId, kind: 'font', sourceId: null }); this.attachmentHandles.add(handle); return handle; });
    }
    removeAttachment(handle) {
        return this.enqueue(async () => {
            if (!handle || !this.attachmentHandles.has(handle) || !['subtitle', 'font'].includes(handle.kind))
                throw new PlayerError('INVALID_ARGUMENT', 'Invalid attachment handle');
            const oldSubs = this.subtitleAssets, oldFonts = this.fonts, oldTracks = this.nativeTracks, oldSelections = new Map(this.publicSelections);
            const selected = this.state.mediaInfo.subtitle?.id === `${this.sourceSerial}:sub:attachment:${handle.id}`;
            if (handle.kind === 'subtitle') {
                if (handle.sourceId !== this.state.sourceId || !oldSubs.some(a => a.attachmentId === handle.id) && !oldTracks.some(a => a.attachmentId === handle.id))
                    throw new PlayerError('INVALID_ARGUMENT', 'Expired subtitle handle');
                if (selected && (this.trackPolicy.subtitles?.locked || this.trackPolicy.subtitles?.allowOff === false))
                    throw new PlayerError('UNSUPPORTED_FEATURE', 'Track policy prevents removing the selected subtitle');
                this.subtitleAssets = oldSubs.filter(a => a.attachmentId !== handle.id);
                this.nativeTracks = oldTracks.filter(a => a.attachmentId !== handle.id);
                if (selected)
                    this.setPublicSelection('sub');
            }
            else {
                if (handle.sourceId !== null || !oldFonts.some(a => a.attachmentId === handle.id))
                    throw new PlayerError('INVALID_ARGUMENT', 'Expired font handle');
                this.fonts = oldFonts.filter(a => a.attachmentId !== handle.id);
            }
            try {
                if (this.source)
                    await this.select(this.source, selected ? { ...this.settings, sid: 'no', subtitles: false } : this.settings, true, this.nativeTracks);
            }
            catch (error) {
                this.subtitleAssets = oldSubs;
                this.nativeTracks = oldTracks;
                this.fonts = oldFonts;
                this.updatePreferences({ publicSelections: Object.fromEntries(oldSelections) });
                throw error;
            }
            this.attachmentHandles.delete(handle);
        }, 'switching');
    }
    setToneMapping(value) {
        if (!['off', 'hdr-to-sdr'].includes(value))
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid tone mapping policy');
        return this.enqueue(() => this.applySetting({ kind: 'toneMapping', value }));
    }
    addTextTrack(track) { return this.attachTextTrack(track).then(() => { }); }
    attachTextTrack(track) {
        const attachmentId = `text-${++this.attachmentSerial}`, source = { ...track, attachmentId };
        let sourceId = null;
        return this.enqueue(async () => {
            if (this.mode !== 'native' || !this.current)
                throw new PlayerError('UNSUPPORTED_FEATURE', 'External browser text tracks require an open native player');
            if (this.presentation.locksSurface)
                throw new PlayerError('UNSUPPORTED_FEATURE', 'Exit video Picture-in-Picture before attaching subtitles');
            if (this.nativeTracks.length >= 16)
                throw new PlayerError('INVALID_ARGUMENT', 'At most 16 browser text attachments are supported');
            this.assertSubtitleAddition(source.label, source.language, 'webvtt');
            await this.current.backend.addTextTrack(source, attachmentId);
            this.nativeTracks.push(source);
            sourceId = this.state.sourceId;
        }).then(() => { const handle = freeze({ id: attachmentId, kind: 'subtitle', sourceId }); this.attachmentHandles.add(handle); return handle; });
    }
    resize(width, height) {
        if (this.destroyed)
            throw new PlayerError('ABORTED', 'Player is destroyed');
        dimensions(width, height);
        this.width = width;
        this.height = height;
        this.current?.backend.resize(width, height);
    }
    close() {
        this.cancelPromotion();
        if (this.destroyed)
            return this.destruction;
        if (this.closing)
            return this.closing;
        this.#previewController.setSourceIdentity(`closed:${this.sourceSerial}`);
        this.previewSource = undefined;
        this.dispatchControl({ type: 'operation.retire', terminal: false });
        this.activeOperation?.controller.abort();
        this.inspection?.abort();
        this.stopWatchdogs();
        const cleanup = Promise.all([this.#previewController.drain(), ...[this.candidate, this.current].map(s => s?.backend.destroy().catch(() => { }))]);
        this.closing = this.enqueue(async () => { await cleanup; await this.dispose(this.current); this.playbackRange = null; this.loopPolicy = false; this.statistics.clear(); this.current = undefined; this.candidate = undefined; this.source = undefined; this.dispatchControl({ type: 'source.clear' }); this.sourceInspection = undefined; this.losslessInspection = undefined; this.runtimeCapabilities.clear(); this.tierAttempts.clear(); this.nativeTracks = []; this.subtitleAssets = []; this.sessionError = null; }, 'closing').finally(() => { this.closing = undefined; });
        return this.closing;
    }
    destroy() {
        this.cancelPromotion();
        if (this.destruction)
            return this.destruction;
        this.preparation?.destroy();
        const providerCleanup = this.providerRuntime?.destroy();
        const presentationCleanup = this.presentation.destroy();
        const previewCleanup = this.#previewController.destroy();
        this.previewSource = undefined;
        this.dispatchControl({ type: 'operation.retire', terminal: true });
        this.activeOperation?.controller.abort();
        this.lifetime.abort();
        this.inspection?.abort();
        this.stopWatchdogs();
        this.destruction = (async () => {
            await Promise.all([providerCleanup, presentationCleanup, previewCleanup, ...[this.candidate, this.current].map(session => session?.backend.destroy().catch(() => { }))]);
            await this.queue;
            try {
                await this.dispose(this.current);
            }
            finally {
                this.statistics.clear();
                this.current = undefined;
                this.source = undefined;
                this.dispatchControl({ type: 'source.clear' });
                this.sourceInspection = undefined;
                this.losslessInspection = undefined;
                this.runtimeCapabilities.clear();
                this.tierAttempts.clear();
                this.nativeTracks = [];
                this.subtitleAssets = [];
                this.fonts = [];
                this.sessionError = null;
                this.publish();
                this.subscribers.clear();
                this.root.remove();
            }
        })();
        return this.destruction;
    }
}
