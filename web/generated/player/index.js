// SPDX-License-Identifier: Apache-2.0
import { Player } from '../unified-player.js';
import { PLAYER_EVENTS } from '../types.js';
import { normalizeTrackPolicy } from '../internal/track-policy.js';
import { watchdogPolicy } from '../internal/watchdogs.js';
import { PlayerError, playerError } from '../internal/errors.js';
import { initialElementConfiguration, transitionElementConfiguration, elementLabels, elementPreviewEnabled } from '../internal/machine/element-configuration.js';
import { initialElementView, transitionElementView, elementTitle, elementTrackOptions, elementActivity } from '../internal/machine/element-view.js';
import { initialElementControls, transitionElementControls } from '../internal/machine/element-controls.js';
import { initialElementLifecycle, transitionElementLifecycle, elementSourceCurrent } from '../internal/machine/element-lifecycle.js';
import { initialElementQueue, transitionElementQueue, queueSelectionAllowed, queueClosesRollback } from '../internal/machine/element-queue.js';
import { formatTime, outputDimensions, resolveSeekTarget, shortcut } from './interaction.js';
import { ScrubberPreview } from './preview.js';
import { styles } from './styles.js';
import { mobileStyles, mobileControlsQuery } from './mobile.js';
import { themeStyles } from './themes.js';
import { icons } from './icons.js';
import { playerShell } from './components.js';
import { AdvancedSettings, advancedLabels, advancedSettingsStyles } from './advanced-settings.js';
import { applyLayout, isPlayerLayout, playerLayouts, presentationStyles } from './presentation.js';
const Base = (typeof HTMLElement === 'undefined' ? class {
} : HTMLElement);
export const defaultLabels = Object.freeze({ ...advancedLabels, appearance: 'Appearance', controlsMode: 'Controls', controlsAuto: 'Auto', controlsMobile: 'Mobile', controlsDesktop: 'Desktop', layout: 'Layout', theme: 'Theme', classic: 'Classic', cinema: 'Cinema', rail: 'Rail', studio: 'Studio', focus: 'Focus', deck: 'Deck', demuxeTheme: 'Demuxe', lightTheme: 'Light', previews: 'Timeline thumbnails', previewStrategy: 'Thumbnail strategy', previewDemuxe: 'Demuxe · broad coverage, local detail', previewAdaptive: 'Adaptive · nearby every 5s', previewGaussian: 'Gaussian · dense near hover', previewDirectional: 'Directional · follows movement', previewUniform: 'Evenly spaced · 48 samples', previewInterval: 'Whole video · every 5s', previewOnDemand: 'On hover only', previewCustom: 'Custom', previewHelp: 'Thumbnails prepare in the background. Nearby prepared frames appear immediately; new positions may take a moment.', diagnostics: 'Session diagnostics', moreOptions: 'More options', back: 'Seek backward 10 seconds', forward: 'Seek forward 10 seconds', play: 'Play', pause: 'Pause', mute: 'Mute', unmute: 'Unmute', seek: 'Playback position', volume: 'Volume', settings: 'Playback settings', closeSettings: 'Close settings', speed: 'Playback speed', audio: 'Audio', subtitles: 'Subtitles', automatic: 'Automatic', off: 'Off', fullscreen: 'Fullscreen', exitFullscreen: 'Exit fullscreen', open: 'Open media', addSubtitle: 'Add subtitles', empty: 'Something good to watch?', drop: 'Open a video or audio file from your device.', loading: 'Opening media…', reading: 'Reading media…', inspecting: 'Inspecting media…', switching: 'Updating playback…', seeking: 'Seeking…', buffering: 'Buffering…', live: 'LIVE', unknown: 'Unknown duration', retry: 'Retry', resume: 'Press Play to continue', shortcuts: 'K / Space: play · ← → / J L: seek · ↑ ↓: volume · M: mute · C: subtitles · [ ]: speed · 0–9 / Home / End: position · F: fullscreen', noFullscreen: 'Fullscreen is unavailable here. Open this page in a browser tab.', noWindow: 'Live playback · seek window unavailable', openURL: 'Open URL', closeMedia: 'Close media', url: 'Media URL', format: 'Source format', streamLive: 'Live stream', addFiles: 'Add files', queue: 'Queue', clearQueue: 'Clear queue', previous: 'Previous file', next: 'Next file', remove: 'Remove', unnamed: 'Unnamed media', mediaFile: 'Media file', noMedia: 'No media loaded', loadedMedia: 'Media loaded', subtitleFile: 'Subtitle file' });
// Never display opaque URL payloads, origins, credentials, queries or fragments.
function sourceTitle(source) {
    if (typeof File !== 'undefined' && source instanceof File)
        return source.name;
    const value = typeof source === 'string' || source instanceof URL ? source :
        'url' in source ? source.url : undefined;
    if (value === undefined)
        return '';
    try {
        const url = new URL(String(value), document.baseURI);
        if (!['http:', 'https:', 'file:'].includes(url.protocol))
            return '';
        const filename = url.pathname.split('/').at(-1) ?? '';
        try {
            return decodeURIComponent(filename);
        }
        catch {
            return filename;
        }
    }
    catch {
        return '';
    }
}
export class DemuxePlayerElement extends Base {
    static observedAttributes = ['layout', 'theme', 'controls-mode', 'no-preview', 'src', 'controls', 'poster', 'autoplay', 'muted', 'asset-base', 'title', 'title-mode'];
    get controlsMode() { const value = this.getAttribute('controls-mode'); return value === 'mobile' || value === 'desktop' ? value : 'auto'; }
    set controlsMode(value) {
        if (!['auto', 'mobile', 'desktop'].includes(value))
            throw new PlayerError('INVALID_ARGUMENT', 'Unknown player controls mode');
        this.setAttribute('controls-mode', value);
    }
    get layout() { const value = this.getAttribute('layout'); return isPlayerLayout(value) ? value : 'classic'; }
    set layout(value) {
        if (!isPlayerLayout(value))
            throw new PlayerError('INVALID_ARGUMENT', 'Unknown player layout');
        this.setAttribute('layout', value);
    }
    get theme() { return this.getAttribute('theme') === 'light' ? 'light' : 'demuxe'; }
    set theme(value) {
        if (value !== 'demuxe' && value !== 'light')
            throw new PlayerError('INVALID_ARGUMENT', 'Unknown player theme');
        this.setAttribute('theme', value);
    }
    updatePresentation() {
        this.hoverPreview?.hide();
        applyLayout(this.shadowRoot, this.layout, !!this.core?.state.sourceId);
        this.$('shell').dataset.theme = this.theme;
        this.syncAppearance();
    }
    syncAppearance() {
        this.$('layout-select').value = this.layout;
        this.$('theme-select').value = this.theme;
        this.$('controls-mode-select').value = this.controlsMode;
    }
    core;
    advanced;
    hoverPreview;
    customPreviewStrategy;
    configuration = initialElementConfiguration(watchdogPolicy());
    configure(command) { const decision = transitionElementConfiguration(this.configuration, command); if (decision.error)
        throw new PlayerError(decision.error.code, decision.error.message); this.configuration = decision.state; }
    viewState = initialElementView();
    view(command) { const decision = transitionElementView(this.viewState, command); this.viewState = decision.state; return decision; }
    controlState = initialElementControls();
    control(command) { const decision = transitionElementControls(this.controlState, command); this.controlState = decision.state; return decision; }
    get menuTrigger() { return this.controlState.menuTrigger; }
    get dragging() { return this.controlState.dragging; }
    get openingStage() { return this.controlState.openingStage; }
    get lastFailure() { return this.controlState.failure; }
    queueState = initialElementQueue();
    queueResources = new Map();
    get queueItems() { return this.queueState.items; }
    get queueIndex() { return this.queueState.index; }
    get queueOperation() { return this.queueState.operation; }
    get queueRevision() { return this.queueState.revision; }
    queueItem(source, options = {}) {
        let name = '';
        try {
            name = sourceTitle(source);
        }
        catch { }
        return { source, options: { ...options, signal: undefined }, name };
    }
    queueResource(index) { const item = this.queueItems[index]; return item ? this.queueResources.get(item.id) : undefined; }
    appendQueue(items) {
        const result = transitionElementQueue(this.queueState, { type: 'append', names: items.map(item => item.name), terminal: this.terminal });
        this.queueState = result.state;
        result.added?.forEach((item, index) => this.queueResources.set(item.id, items[index]));
        return result;
    }
    resetQueue() {
        this.queueState = transitionElementQueue(this.queueState, { type: 'reset' }).state;
        this.queueResources.clear();
        this.renderQueue();
    }
    async activateQueue(index, playAfter = this.core?.state.playbackIntent === 'play' || this.core?.state.status === 'ended', options, closePreviousOnFailure = false) {
        const start = transitionElementQueue(this.queueState, { type: 'start', index, terminal: this.terminal });
        this.queueState = start.state;
        if (start.error === 'destroyed')
            throw new PlayerError('ABORTED', 'Player element is destroyed');
        if (!start.accepted)
            return;
        const operation = start.operation, item = this.queueResources.get(start.itemId);
        this.renderQueue();
        try {
            await this.openSource(item.source, options ?? item.options);
            if (this.queueState.operation !== operation)
                throw new PlayerError('ABORTED', 'Queue selection superseded');
            const defaultPlay = this.queueState.playIntent ?? (typeof playAfter === 'function' ? playAfter() : playAfter);
            const opened = transitionElementQueue(this.queueState, { type: 'opened', operation, sourceId: this.core?.state.sourceId ?? null, defaultPlay });
            this.queueState = opened.state;
            if (!opened.accepted)
                throw new PlayerError('ABORTED', 'Queue selection superseded');
            if (opened.play) {
                const core = this.core;
                await core?.play();
                if (this.queueState.operation === operation && core === this.core && core?.state.playbackIntent === 'play' && !this.controlState.menuOpen && !this.dragging && !this.controlFacts().focusVisible && this.controlsAutoHideDelay > 0)
                    this.hideControls();
            }
        }
        catch (error) {
            // A removed item must not survive as the core's rollback source.
            if (queueClosesRollback(this.queueState, operation, closePreviousOnFailure))
                await this.core?.close();
            throw error;
        }
        finally {
            const settled = transitionElementQueue(this.queueState, { type: 'settled', operation });
            this.queueState = settled.state;
            if (settled.accepted) {
                this.renderQueue();
                queueMicrotask(() => this.advanceQueue());
            }
        }
    }
    addFiles(files) {
        const appended = this.appendQueue(files.map(file => this.queueItem(file)));
        if (!appended.accepted)
            return;
        this.settings(false, false);
        this.$('stage').focus({ preventScroll: true });
        this.renderQueue();
        if (appended.activate !== undefined)
            this.run(this.activateQueue(appended.activate, () => this.autoplay));
    }
    selectQueue(index) {
        if (!queueSelectionAllowed(this.queueState, { terminal: this.terminal, pending: !!this.core?.state.pendingOperation }))
            return;
        this.settings(false, false);
        this.$('stage').focus({ preventScroll: true });
        this.run(this.activateQueue(index));
    }
    removeQueueItem(index) {
        const removed = transitionElementQueue(this.queueState, { type: 'remove', index, sourceControls: this.showSourceControls, pending: !!this.core?.state.pendingOperation });
        this.queueState = removed.state;
        if (!removed.accepted)
            return;
        this.queueResources.delete(removed.removedId);
        if (removed.close) {
            this.settings(false, false);
            this.$('stage').focus({ preventScroll: true });
            this.run(this.close());
            return;
        }
        if (removed.activate !== undefined) {
            this.settings(false, false);
            this.$('stage').focus({ preventScroll: true });
            this.run(this.activateQueue(removed.activate, undefined, undefined, true));
            return;
        }
        this.renderQueue();
        this.$('queue-list').querySelector('button')?.focus();
    }
    advanceQueue() {
        const state = this.core?.state;
        if (!state)
            return;
        const next = transitionElementQueue(this.queueState, { type: 'advance', terminal: this.terminal, pending: !!state.pendingOperation, status: state.status, sourceId: state.sourceId });
        this.queueState = next.state;
        if (next.activate !== undefined)
            this.run(this.activateQueue(next.activate, true));
    }
    renderQueue() {
        if (!this.shadowRoot?.getElementById('queue-list'))
            return;
        const busy = !!this.queueOperation || !!this.core?.state.pendingOperation, labels = this.labels;
        const render = this.view({ type: 'queue', queue: this.queueState, pending: !!this.core?.state.pendingOperation, sourceControls: this.showSourceControls, labels });
        if (!render.changed)
            return;
        this.$('queue-section').hidden = !this.queueItems.length;
        this.$('queue-navigation').hidden = this.queueItems.length < 2;
        this.$('queue-count').textContent = `${this.queueIndex + 1} / ${this.queueItems.length}`;
        this.$('choose-file').textContent = this.queueItems.length ? this.labels.addFiles : this.labels.open;
        this.$('queue-heading').textContent = this.labels.queue;
        this.$('clear-queue').textContent = this.labels.clearQueue;
        this.$('clear-queue').disabled = !this.showSourceControls || busy;
        this.iconButton('previous-file', 'previous', this.labels.previous);
        this.iconButton('next-file', 'next', this.labels.next);
        this.$('previous-file').disabled = busy || this.queueIndex <= 0;
        this.$('next-file').disabled = busy || this.queueIndex >= this.queueItems.length - 1;
        if (render.rebuild) {
            this.$('queue-list').replaceChildren();
            for (const item of this.queueItems) {
                const row = document.createElement('li'), choose = document.createElement('button'), remove = document.createElement('button');
                choose.type = remove.type = 'button';
                choose.className = 'queue-item';
                remove.className = 'queue-remove';
                choose.textContent = item.name || this.labels.unnamed;
                choose.title = choose.textContent;
                choose.onclick = () => { if (this.showSourceControls)
                    this.selectQueue(this.queueItems.indexOf(item)); };
                remove.textContent = '×';
                remove.setAttribute('aria-label', `${this.labels.remove} ${item.name || this.labels.unnamed}`);
                remove.onclick = () => this.removeQueueItem(this.queueItems.indexOf(item));
                row.append(choose, remove);
                this.$('queue-list').append(row);
            }
        }
        Array.from(this.$('queue-list').children).forEach((row, index) => {
            const choose = row.querySelector('.queue-item');
            if (index === this.queueIndex)
                choose.setAttribute('aria-current', 'true');
            else
                choose.removeAttribute('aria-current');
            row.querySelectorAll('button').forEach(button => button.disabled = busy || !this.showSourceControls);
        });
    }
    get titleMode() {
        const mode = this.getAttribute('title-mode');
        return mode === 'custom' || mode === 'source' || mode === 'none' ? mode : 'auto';
    }
    set titleMode(value) {
        if (!['auto', 'custom', 'source', 'none'].includes(value))
            throw new PlayerError('INVALID_ARGUMENT', 'Invalid titleMode');
        this.setAttribute('title-mode', value);
    }
    get showSourceControls() { return this.configuration.sourceControls; }
    set showSourceControls(value) { this.configure({ type: 'source-controls', value: !!value }); this.updateUtilities(); }
    get showDiagnostics() { return this.configuration.diagnosticsControl; }
    set showDiagnostics(value) { this.configure({ type: 'diagnostics-control', value: !!value }); this.updateUtilities(); }
    get allowFileDrop() { return this.configuration.fileDrop; }
    set allowFileDrop(value) { this.configure({ type: 'file-drop', value: !!value }); }
    get seekStep() { return this.configuration.seekStep; }
    set seekStep(value) {
        this.configure({ type: 'seek-step', value });
        this.labelControls();
        if (this.core)
            this.update(this.core.state);
    }
    get controlsAutoHideDelay() { return this.configuration.autoHideDelay; }
    set controlsAutoHideDelay(value) {
        this.configure({ type: 'auto-hide-delay', value });
        this.revealControls();
    }
    titleProjection() { return elementTitle(this.viewState, { mode: this.titleMode, title: this.title, terminal: this.terminal, connected: this.isConnected, hasSource: !!this.core?.state.sourceId, loadedLabel: this.labels.loadedMedia, emptyLabel: this.labels.noMedia }); }
    updateTitle() { const text = this.titleProjection().title; this.$('title').textContent = text; this.$('title').hidden = !text; this.updateSourceLabel(); }
    updateSourceLabel() { const text = this.titleProjection().source; if (this.$('current-source').textContent !== text)
        this.$('current-source').textContent = text; }
    canPickSubtitle(state = this.core?.state) { return !this.terminal && this.showSourceControls && !!state?.sourceId && !state.pendingOperation && !state.trackPolicy.subtitles?.locked && state.trackPolicy.subtitles?.allowed?.length !== 0; }
    updateUtilities() {
        if (this.terminal)
            return;
        const focused = this.shadowRoot?.activeElement;
        const sourceFocused = !!focused && (this.$('source-options').contains(focused) || this.$('open-menu') === focused || this.$('settings-source') === focused || this.$('open') === focused || (this.controlState.menuOpen && this.menuTrigger === 'open-menu' && this.$('settings').contains(focused)));
        const diagnosticsFocused = focused === this.$('diagnostics-toggle') || focused === this.$('settings-diagnostics') || focused === this.$('diagnostics-overlay');
        if (!this.showSourceControls && this.menuTrigger === 'open-menu')
            this.settings(false, false);
        this.$('open-menu').hidden = !this.showSourceControls;
        this.$('settings-source').hidden = !this.showSourceControls;
        this.$('empty').hidden = !this.showSourceControls || !!this.core?.state.sourceId;
        for (const id of ['open-menu', 'open', 'choose-file', 'file', 'subtitleFile', 'url', 'format', 'live', 'url-submit'])
            this.$(id).disabled = !this.showSourceControls;
        this.input('subtitleFile').disabled = !this.canPickSubtitle();
        this.input('live').disabled = !this.showSourceControls || this.$('format').value === 'file';
        this.$('source-options').inert = !this.showSourceControls;
        if (!this.showSourceControls)
            this.$('source-options').hidden = true;
        this.$('diagnostics-toggle').hidden = !this.showDiagnostics;
        this.$('settings-diagnostics').hidden = !this.showDiagnostics;
        this.$('diagnostics-toggle').disabled = !this.showDiagnostics;
        if (!this.showDiagnostics)
            this.setDiagnostics(false);
        this.renderQueue();
        if ((!this.showSourceControls && sourceFocused) || (!this.showDiagnostics && diagnosticsFocused))
            (this.controlState.menuOpen ? this.$('settings-close') : this.$('stage')).focus({ preventScroll: true });
    }
    lifecycle = initialElementLifecycle();
    get terminal() { return this.lifecycle.terminal; }
    cleanup = Promise.resolve();
    connecting;
    unsubscribe;
    sourceAbort;
    lastSource;
    lastOptions;
    get watchdogs() { return this.core?.watchdogs ?? this.configuration.watchdogs; }
    set watchdogs(value) {
        if (this.terminal)
            throw new PlayerError('ABORTED', 'Player element is destroyed');
        const policy = watchdogPolicy(value);
        this.core?.setWatchdogs(policy);
        this.configure({ type: 'watchdogs', value: policy, terminal: this.terminal });
    }
    get trackPolicy() { return this.configuration.trackPolicy; }
    set trackPolicy(value) { this.configure({ type: 'track-policy', value: normalizeTrackPolicy(value) }); }
    resolveReady;
    rejectReady;
    readiness;
    seekPreviewTimer;
    hideTimer;
    timelinePointer;
    scrubTime;
    showScrubPosition() {
        if (this.timelinePointer === undefined)
            return;
        const input = this.input('timeline'), badge = this.$('scrub-position');
        const rect = input.getBoundingClientRect(), parent = this.$('controls').getBoundingClientRect();
        const min = Number(input.min), span = Number(input.max) - min;
        const fraction = span > 0 ? Math.max(0, Math.min(1, (Number(input.value) - min) / span)) : 0;
        badge.textContent = formatTime(Number(input.value));
        badge.style.left = `${Math.max(44, Math.min(parent.width - 44, rect.left - parent.left + rect.width * fraction))}px`;
        badge.style.top = `${rect.top - parent.top - 12}px`;
        badge.hidden = false;
    }
    finishTimelineDrag() {
        const pointer = this.timelinePointer;
        this.timelinePointer = undefined;
        this.scrubTime = undefined;
        this.control({ type: 'drag', active: false });
        this.$('scrub-position').hidden = true;
        const input = this.input('timeline');
        if (pointer !== undefined && input.hasPointerCapture(pointer))
            input.releasePointerCapture(pointer);
        this.revealControls();
    }
    controlFacts() { return { playing: this.core?.state.status === 'playing', pending: !!this.core?.state.pendingOperation, connected: this.isConnected, focusVisible: !!this.shadowRoot?.activeElement?.matches(':focus-visible') }; }
    renderVisibility() { this.$('shell').classList.toggle('idle', this.controlState.idle); this.$('shell').classList.toggle('seek-preview', this.controlState.seekPreview); }
    revealControls = () => { const result = this.control({ type: 'reveal', playing: this.core?.state.status === 'playing', delay: this.controlsAutoHideDelay }); this.renderVisibility(); clearTimeout(this.seekPreviewTimer); clearTimeout(this.hideTimer); if (result.hideAfter !== undefined)
        this.hideTimer = setTimeout(() => { if (this.control({ type: 'hide-elapsed', ...this.controlFacts() }).accepted)
            this.hideControls(); }, result.hideAfter); };
    async playFromControls() { const core = this.core; await this.play(); if (core === this.core && core?.state.playbackIntent === 'play' && !this.controlState.menuOpen)
        this.hideControls(true); }
    hideControls(focusStage = false) { if (focusStage || this.shadowRoot?.activeElement)
        this.$('stage').focus({ preventScroll: true }); clearTimeout(this.hideTimer); clearTimeout(this.seekPreviewTimer); this.control({ type: 'hide' }); this.renderVisibility(); }
    dismissMenu = (event) => { const path = event.composedPath(); if (this.controlState.menuOpen && !['settings', 'settings-toggle', 'open-menu'].some(id => path.includes(this.$(id))))
        this.settings(false, false); };
    isScreenPress(event) { return !event.composedPath().some(node => node instanceof Element && node.matches('button,input,select,textarea,a,summary,[contenteditable],[role="button"],#settings,#error,#diagnostics-overlay')); }
    resizeObserver;
    fullscreenChanged = () => { const active = document.fullscreenElement === this; this.$('fullscreen').setAttribute('aria-pressed', String(active)); this.iconButton('fullscreen', active ? 'collapse' : 'expand', active ? this.labels.exitFullscreen : this.labels.fullscreen); };
    constructor() { super(); this.newReady(); this.attachShadow({ mode: 'open' }); this.renderShell(); this.hoverPreview = new ScrubberPreview(this.input('timeline'), this.$('thumbnail-preview'), this.$('thumbnail-image'), this.$('thumbnail-time'), () => this.previewThumbnails ? this.core?.preview : undefined, this.$('thumbnail-target')); }
    newReady() { this.readiness = new Promise((resolve, reject) => { this.resolveReady = resolve; this.rejectReady = reject; }); void this.readiness.catch(() => { }); }
    get ready() { return this.readiness; }
    get player() { return this.core; }
    get src() { return this.getAttribute('src') ?? ''; }
    set src(value) { if (value)
        this.setAttribute('src', String(value));
    else
        this.removeAttribute('src'); }
    /** Set before connecting the element. Native-playable audio stays unchanged. */
    get audioPlayback() { return this.configuration.audioPlayback; }
    set audioPlayback(value) { this.configure({ type: 'audio-playback', value, hasOwner: !!this.core }); }
    syncPreviewStrategy() {
        const select = this.$('preview-strategy'), strategy = this.core?.preview.strategy;
        let value = 'custom';
        if (strategy?.type === 'on-demand')
            value = 'on-demand';
        else if (strategy?.type === 'adaptive' && strategy.samples === 24 && strategy.every === 5 && strategy.radius === 30)
            value = 'adaptive';
        else if (strategy?.type === 'demuxe')
            value = 'demuxe';
        else if (strategy?.type === 'gaussian' && strategy.samples === 25 && strategy.every === 1 && strategy.radius === 30 && strategy.sigma === 10)
            value = 'gaussian';
        else if (strategy?.type === 'directional' && strategy.samples === 25 && strategy.every === 1 && strategy.radius === 30 && strategy.lookAhead === .5)
            value = 'directional';
        else if (strategy?.type === 'uniform' && strategy.samples === 48)
            value = 'uniform';
        else if (strategy?.type === 'interval' && strategy.every === 5 && strategy.unit === 'seconds' && strategy.count == null)
            value = 'interval';
        select.value = value;
        select.disabled = !this.core?.preview.enabled;
    }
    get previewOptions() { const value = this.configuration.preview; return value && value.strategy?.type === 'custom' ? { ...value, strategy: this.customPreviewStrategy } : value; }
    set previewOptions(value) { const custom = value && value.strategy?.type === 'custom' ? value.strategy : undefined; this.configure({ type: 'preview', value: custom && value ? { ...value, strategy: { type: 'custom' } } : value, hasOwner: !!this.core }); this.customPreviewStrategy = custom ? Object.freeze({ ...custom }) : undefined; }
    syncPreviewEnabled() { if (this.core)
        this.core.preview.enabled = elementPreviewEnabled(this.configuration, this.previewThumbnails); }
    get previewThumbnails() { return !this.hasAttribute('no-preview'); }
    set previewThumbnails(value) { this.toggleAttribute('no-preview', !value); }
    get controls() { return this.hasAttribute('controls'); }
    set controls(value) { this.toggleAttribute('controls', !!value); }
    get autoplay() { return this.hasAttribute('autoplay'); }
    set autoplay(value) { this.toggleAttribute('autoplay', !!value); }
    get muted() { return this.hasAttribute('muted'); }
    set muted(value) { this.toggleAttribute('muted', !!value); }
    get poster() { return this.getAttribute('poster') ?? ''; }
    set poster(value) { if (value)
        this.setAttribute('poster', value);
    else
        this.removeAttribute('poster'); }
    get assetBase() { return this.getAttribute('asset-base') ?? undefined; }
    set assetBase(value) { if (this.core)
        throw new PlayerError('INVALID_ARGUMENT', 'assetBase is fixed after initialization'); if (value)
        this.setAttribute('asset-base', value);
    else
        this.removeAttribute('asset-base'); }
    get labels() { return { ...elementLabels(defaultLabels, this.configuration) }; }
    set labels(value) { this.configure({ type: 'labels', entries: Object.entries(value), keys: Object.keys(defaultLabels) }); this.labelControls(); if (this.core)
        this.update(this.core.state); }
    $(id) { return this.shadowRoot.getElementById(id); }
    input(id) { return this.$(id); }
    connectedCallback() {
        const connection = transitionElementLifecycle(this.lifecycle, { type: 'connect' });
        this.lifecycle = connection.state;
        const token = connection.connection;
        if (!connection.accepted)
            return;
        for (const name of ['layout', 'theme', 'controlsMode', 'watchdogs', 'trackPolicy', 'previewOptions', 'previewThumbnails', 'assetBase', 'labels', 'controls', 'poster', 'autoplay', 'muted', 'title', 'titleMode', 'showSourceControls', 'showDiagnostics', 'allowFileDrop', 'seekStep', 'controlsAutoHideDelay', 'src'])
            if (Object.prototype.hasOwnProperty.call(this, name)) {
                const value = this[name];
                delete this[name];
                this[name] = value;
            }
        if (this.core)
            return;
        const rejectReady = this.rejectReady;
        this.connecting = (async () => {
            await this.cleanup;
            if (!transitionElementLifecycle(this.lifecycle, { type: 'connect-ready', connection: token, connected: this.isConnected }).accepted)
                return;
            let initializing, subscription, observer;
            let fullscreenListener = false, pointerListener = false;
            const current = () => initializing ? transitionElementLifecycle(this.lifecycle, { type: 'owner-ready', connected: this.isConnected, sameOwner: this.core === initializing }).accepted : transitionElementLifecycle(this.lifecycle, { type: 'connect-ready', connection: token, connected: this.isConnected }).accepted;
            const check = () => { if (!current())
                throw new PlayerError('ABORTED', 'Player element initialization retired'); };
            try {
                this.configure({ type: 'asset-lock', value: this.getAttribute('asset-base') });
                const core = initializing = new Player(this.$('surface'), { assetBase: this.assetBase, watchdogs: this.configuration.watchdogs, audioPlayback: this.configuration.audioPlayback, preview: this.previewOptions ?? { strategy: { type: 'adaptive' }, maxEntries: 96, maxCacheBytes: 16 * 1024 * 1024 }, prepare: this.getAttribute('prepare') === 'all' ? 'all' : (this.getAttribute('prepare') ?? '').split(/\s+/).filter(Boolean) });
                if (!transitionElementLifecycle(this.lifecycle, { type: 'connect-ready', connection: token, connected: this.isConnected }).accepted)
                    throw new PlayerError('ABORTED', 'Player element initialization retired');
                this.core = core;
                this.syncPreviewEnabled();
                check();
                core.presentation.setFullscreenTarget(this);
                this.view({ type: 'reset-owner' });
                for (const type of [...PLAYER_EVENTS, 'preparationchange', 'inspectionchange', 'mpv', 'log', 'source', 'output'])
                    core.addEventListener(type, event => {
                        if (this.core !== core || this.terminal)
                            return;
                        const detail = event.detail;
                        if (type === 'inspectionchange' && core.state.pendingOperation?.kind === 'opening') {
                            this.control({ type: 'opening-stage', stage: detail.phase === 'reading' ? this.labels.reading : this.labels.inspecting });
                            this.update(core.state);
                        }
                        if (type === 'preparationchange')
                            this.update(core.state);
                        if (type === 'modechange' && detail.phase === 'loading' && core.state.pendingOperation?.kind === 'opening') {
                            this.control({ type: 'opening-stage', stage: `Starting ${{ native: 'Native', hybrid: 'Hybrid', software: 'Software' }[detail.mode]} playback…` });
                            this.update(core.state);
                        }
                        if (type === 'error')
                            this.showError(detail);
                        if (type === 'ended')
                            queueMicrotask(() => { if (this.core === core)
                                this.advanceQueue(); });
                        this.dispatchEvent(new CustomEvent(type, { detail }));
                    });
                const initiallyMuted = this.muted;
                subscription = core.subscribe(state => this.update(state));
                check();
                this.unsubscribe = subscription;
                if (initiallyMuted)
                    await core.setMuted(true);
                if (!transitionElementLifecycle(this.lifecycle, { type: 'owner-ready', connected: this.isConnected, sameOwner: this.core === core }).accepted)
                    throw new PlayerError('ABORTED', 'Player element initialization retired');
                observer = new ResizeObserver(() => { if (this.core === core)
                    this.geometry(core.state); });
                check();
                this.resizeObserver = observer;
                observer.observe(this.$('stage'));
                check();
                fullscreenListener = true;
                document.addEventListener('fullscreenchange', this.fullscreenChanged);
                check();
                pointerListener = true;
                document.addEventListener('pointerdown', this.dismissMenu, true);
                check();
                this.resolveReady(core);
                if (this.src)
                    this.scheduleSource();
            }
            catch (error) {
                const report = current(), owns = !!initializing && this.core === initializing;
                if (owns) {
                    this.core = undefined;
                    if (this.unsubscribe === subscription)
                        this.unsubscribe = undefined;
                    if (this.resizeObserver === observer)
                        this.resizeObserver = undefined;
                }
                for (const stop of [() => subscription?.(), () => observer?.disconnect(), () => { if (fullscreenListener)
                        document.removeEventListener('fullscreenchange', this.fullscreenChanged); }, () => { if (pointerListener)
                        document.removeEventListener('pointerdown', this.dismissMenu, true); }])
                    try {
                        stop();
                    }
                    catch { }
                try {
                    await initializing?.destroy();
                }
                catch { }
                if (report) {
                    rejectReady(playerError(error));
                    if (transitionElementLifecycle(this.lifecycle, { type: 'connect-ready', connection: token, connected: this.isConnected }).accepted)
                        this.componentError(error);
                }
            }
        })();
    }
    disconnectedCallback() {
        const connection = transitionElementLifecycle(this.lifecycle, { type: 'disconnect' });
        this.lifecycle = connection.state;
        const token = connection.connection;
        queueMicrotask(() => {
            const retired = transitionElementLifecycle(this.lifecycle, { type: 'disconnect-ready', connection: token, connected: this.isConnected });
            this.lifecycle = retired.state;
            if (!retired.accepted)
                return;
            void this.releaseOwnedResources(false).catch(error => { if (!this.terminal)
                this.componentError(error); });
        });
    }
    attributeChangedCallback(name, old, value) {
        if (old === value || this.configuration.reflectionDepth > 0 || this.terminal)
            return;
        if (name === 'controls-mode') {
            const focused = this.shadowRoot?.activeElement;
            this.hoverPreview?.hide();
            this.reconcileSettings();
            this.syncAppearance();
            if (!this.controlState.menuOpen && focused && ['open-menu', 'diagnostics-toggle', 'volume'].some(id => this.$(id) === focused) && !focused.getClientRects().length)
                this.$(focused === this.$('volume') ? 'mute' : 'settings-toggle').focus({ preventScroll: true });
            return;
        }
        if (name === 'layout') {
            this.updatePresentation();
            return;
        }
        if (name === 'theme') {
            this.$('shell').dataset.theme = this.theme;
            this.syncAppearance();
            return;
        }
        if (name === 'no-preview') {
            this.syncPreviewEnabled();
            this.input('preview-toggle').checked = this.previewThumbnails;
            if (!this.previewThumbnails)
                this.hoverPreview.hide();
        }
        if (name === 'title' || name === 'title-mode')
            this.updateTitle();
        if (name === 'asset-base' && this.core) {
            this.configure({ type: 'reflection', enter: true });
            try {
                if (this.configuration.configuredAsset === null)
                    this.removeAttribute(name);
                else
                    this.setAttribute(name, this.configuration.configuredAsset);
            }
            finally {
                this.configure({ type: 'reflection', enter: false });
            }
            this.componentError(new PlayerError('INVALID_ARGUMENT', 'asset-base is fixed after initialization'));
            return;
        }
        if (name === 'controls' && !this.controls) {
            const focused = this.shadowRoot?.activeElement;
            const moveFocus = !!focused && ['topbar', 'controls', 'transport', 'settings', 'diagnostics-overlay'].some(id => this.$(id).contains(focused));
            this.settings(false, false);
            this.setDiagnostics(false);
            if (moveFocus)
                this.$('stage').focus({ preventScroll: true });
        }
        if (name === 'src' && this.core)
            this.scheduleSource();
        if (name === 'muted' && this.core)
            this.run(this.core.setMuted(value !== null));
        if (name === 'poster') {
            const img = this.$('poster');
            if (value)
                img.src = value;
            else
                img.removeAttribute('src');
        }
        if (this.core)
            this.update(this.core.state);
        else {
            this.$('controls').hidden = !this.controls;
            this.$('topbar').hidden = !this.controls;
        }
    }
    openFromControls(source) { this.settings(false, false); this.$('stage').focus({ preventScroll: true }); this.run(this.open(source)); }
    scheduleSource() { const scheduled = transitionElementLifecycle(this.lifecycle, { type: 'schedule-attribute' }); this.lifecycle = scheduled.state; if (!scheduled.accepted)
        return; queueMicrotask(() => { const flushed = transitionElementLifecycle(this.lifecycle, { type: 'flush-attribute', hasOwner: !!this.core }); this.lifecycle = flushed.state; if (flushed.accepted)
        this.run(this.src ? this.open(this.src) : this.close()); }); }
    waitReady(signal) {
        if (signal.aborted)
            return Promise.reject(new PlayerError('ABORTED', 'Open aborted'));
        return new Promise((resolve, reject) => { const abort = () => { signal.removeEventListener('abort', abort); reject(new PlayerError('ABORTED', 'Open aborted')); }; signal.addEventListener('abort', abort, { once: true }); this.ready.then(p => { signal.removeEventListener('abort', abort); resolve(p); }, e => { signal.removeEventListener('abort', abort); reject(e); }); });
    }
    async open(source, options = {}) {
        if (this.terminal)
            throw new PlayerError('ABORTED', 'Player element is destroyed');
        this.resetQueue();
        this.appendQueue([this.queueItem(source, options)]);
        return this.activateQueue(0, () => this.autoplay, options);
    }
    async openSource(source, options = {}) {
        const started = transitionElementLifecycle(this.lifecycle, { type: 'source-start' });
        this.lifecycle = started.state;
        if (!started.accepted)
            throw new PlayerError('ABORTED', 'Player element is destroyed');
        const version = started.source;
        this.sourceAbort?.abort();
        const controller = this.sourceAbort = new AbortController();
        const abort = () => controller.abort();
        options.signal?.addEventListener('abort', abort, { once: true });
        if (options.signal?.aborted)
            abort();
        try {
            const core = this.core ?? await this.waitReady(controller.signal);
            if (!elementSourceCurrent(this.lifecycle, version, { aborted: controller.signal.aborted, sameOwner: true }))
                throw new PlayerError('ABORTED', 'Open aborted');
            this.lastSource = source;
            this.lastOptions = { ...options, signal: undefined };
            this.clearError();
            await core.open(source, { ...options, trackPolicy: { ...this.configuration.trackPolicy, ...normalizeTrackPolicy(options.trackPolicy) }, signal: controller.signal });
            if (elementSourceCurrent(this.lifecycle, version, { aborted: controller.signal.aborted, sameOwner: this.core === core })) {
                this.view({ type: 'source', name: sourceTitle(source), sourceId: core.state.sourceId });
                this.updateTitle();
            }
        }
        finally {
            options.signal?.removeEventListener('abort', abort);
        }
    }
    close() { this.hoverPreview.hide(); this.lifecycle = transitionElementLifecycle(this.lifecycle, { type: 'source-retire' }).state; this.sourceAbort?.abort(); this.resetQueue(); this.lastSource = undefined; this.lastOptions = undefined; this.clearError(); return this.core ? this.core.close() : this.terminal ? Promise.reject(new PlayerError('ABORTED', 'Player element is destroyed')) : Promise.resolve(); }
    play() { this.queueState = transitionElementQueue(this.queueState, { type: 'intent', play: true }).state; return this.core ? this.core.play() : this.ready.then(p => p.play()); }
    pause() { this.queueState = transitionElementQueue(this.queueState, { type: 'intent', play: false }).state; return this.core ? this.core.pause() : this.ready.then(p => p.pause()); }
    seek(seconds) { return this.ready.then(p => p.seek(seconds)); }
    setVolume(value) { return this.ready.then(p => p.setVolume(value)); }
    setMuted(value) { return this.ready.then(p => p.setMuted(value)); }
    setPlaybackRate(value) { return this.ready.then(p => p.setPlaybackRate(value)); }
    selectAudioTrack(id) { return this.ready.then(p => p.selectAudioTrack(id)); }
    selectSubtitleTrack(id) { return this.ready.then(p => p.selectSubtitleTrack(id)); }
    addSubtitle(file, options) { return this.ready.then(p => p.addSubtitle(file, options)); }
    destroy() {
        const destroyed = transitionElementLifecycle(this.lifecycle, { type: 'destroy' });
        this.lifecycle = destroyed.state;
        return destroyed.accepted ? this.releaseOwnedResources(true) : this.cleanup;
    }
    releaseOwnedResources(terminal) {
        const previous = this.cleanup, connecting = this.connecting, old = this.core, unsubscribe = this.unsubscribe, observer = this.resizeObserver, sourceAbort = this.sourceAbort;
        if (terminal)
            this.customPreviewStrategy = undefined;
        this.core = undefined;
        this.unsubscribe = undefined;
        this.resizeObserver = undefined;
        this.sourceAbort = undefined;
        let resolve, reject;
        const done = this.cleanup = new Promise((yes, no) => { resolve = yes; reject = no; });
        const errors = [], attempt = (action) => { try {
            action();
        }
        catch (error) {
            errors.push(error);
        } };
        this.lastSource = undefined;
        this.lastOptions = undefined;
        attempt(() => this.rejectReady(new PlayerError('ABORTED', terminal ? 'Player element is destroyed' : 'Player element disconnected')));
        if (!terminal)
            attempt(() => this.newReady());
        for (const action of [() => terminal ? this.hoverPreview.destroy() : this.hoverPreview.hide(), () => { this.timelinePointer = undefined; this.$('scrub-position').hidden = true; this.settings(false, false); }, () => clearTimeout(this.hideTimer), () => clearTimeout(this.seekPreviewTimer), () => sourceAbort?.abort(), () => this.resetQueue(), () => this.view({ type: 'source', name: '', sourceId: null }), () => this.updateTitle(), () => unsubscribe?.(), () => observer?.disconnect(), () => document.removeEventListener('fullscreenchange', this.fullscreenChanged), () => document.removeEventListener('pointerdown', this.dismissMenu, true), () => this.advanced?.reconcile()])
            attempt(action);
        let destruction;
        attempt(() => { destruction = old?.destroy(); });
        void Promise.allSettled([previous, connecting, destruction]).then(results => {
            for (const result of results)
                if (result.status === 'rejected')
                    errors.push(result.reason);
            if (terminal) {
                attempt(() => this.$('surface').replaceChildren());
                for (const id of ['controls', 'transport', 'topbar', 'settings', 'empty', 'diagnostics-overlay', 'buffering-indicator'])
                    attempt(() => { this.$(id).hidden = true; });
            }
            if (errors.length)
                reject(errors.length === 1 ? errors[0] : new AggregateError(errors, 'Player element cleanup failed'));
            else
                resolve();
        });
        return done;
    }
    run(work) { void work.catch(error => { if (!this.terminal && playerError(error).code !== 'ABORTED')
        this.showError(playerError(error).toJSON()); }); }
    runSettings(work) {
        const failure = this.lastFailure, owner = this.core, source = owner?.state.sourceId;
        const current = () => this.core === owner && owner?.state.sourceId === source && this.isConnected && !this.terminal;
        void work.then(() => {
            // A successful correction retires the previous operation error, but must
            // not hide a newer failure or an active session error from another action.
            if (current() && this.lastFailure === failure && !owner?.state.error)
                this.clearError();
        }, error => { if (current() && playerError(error).code !== 'ABORTED')
            this.showError(playerError(error).toJSON()); });
    }
    componentError(error) { const detail = playerError(error).toJSON(); this.showError(detail); this.dispatchEvent(new CustomEvent('error', { detail })); }
    showError(error) { if (!this.control({ type: 'error', error }).accepted)
        return; this.$('error').hidden = false; this.$('error-text').textContent = error.message; this.$('retry').hidden = !error.retryable; this.$('retry').textContent = error.code === 'AUTOPLAY_BLOCKED' ? this.labels.play : this.labels.retry; this.announce(error.message, false); }
    clearError() { this.control({ type: 'clear-error' }); this.$('error').hidden = true; }
    announce(text, visual = true) { this.$('status').classList.toggle('sr', !visual); if (!this.control({ type: 'announce', text }).changed)
        return; this.$('status').textContent = text; }
    geometry(state) { const ratio = state.mediaInfo.aspectRatio, { width, height } = ratio ? outputDimensions(ratio) : { width: 0, height: 0 }; const decision = this.view({ type: 'geometry', ratio, pending: !!state.pendingOperation, width, height }); if (decision.clearAspect)
        this.$('stage').style.removeProperty('--media-aspect');
    else
        this.$('stage').style.setProperty('--media-aspect', String(decision.aspect)); if (decision.resize)
        this.core?.resize(decision.resize.width, decision.resize.height); }
    text(id, value) { const element = this.$(id); if (element.textContent !== value)
        element.textContent = value; }
    attr(id, name, value) { const element = this.$(id); if (element.getAttribute(name) !== value)
        element.setAttribute(name, value); }
    setHidden(id, value) { const element = this.$(id); if (element.hidden !== value)
        element.hidden = value; }
    update(state) {
        this.advanced?.reconcile();
        if (this.controlState.menuOpen)
            this.advanced?.update(state);
        this.syncPreviewStrategy();
        applyLayout(this.shadowRoot, this.layout, !!state.sourceId);
        const identity = `${state.sourceId}:${state.activeMode}`;
        if (this.control({ type: 'preview', identity, pending: !!state.pendingOperation, controls: this.controls, seekable: !!state.seekable?.length }).resetPreview) {
            this.hoverPreview.hide();
            if (this.timelinePointer !== undefined)
                this.finishTimelineDrag();
        }
        // A host using the core directly owns its source list; release ours on replacement.
        const observedQueue = transitionElementQueue(this.queueState, { type: 'observe-source', sourceId: state.sourceId });
        this.queueState = observedQueue.state;
        if (observedQueue.reset) {
            this.queueResources.clear();
            this.renderQueue();
        }
        this.renderQueue();
        this.updateSourceLabel();
        if (this.view({ type: 'observe-source', sourceId: state.sourceId }).changed)
            this.updateTitle();
        const labels = this.labels, pending = state.pendingOperation !== null;
        this.setHidden('topbar', !this.controls);
        const seeking = state.pendingOperation?.kind === 'seeking', seekChange = this.control({ type: 'seeking', seeking });
        if (seekChange.changed) {
            clearTimeout(this.seekPreviewTimer);
            this.renderVisibility();
            if (seekChange.seekPreviewAfter !== undefined)
                this.seekPreviewTimer = setTimeout(() => { this.control({ type: 'seek-preview-expired' }); this.renderVisibility(); }, seekChange.seekPreviewAfter);
            if (seekChange.reveal)
                this.revealControls();
        }
        const playing = state.status === 'playing', playChange = this.control({ type: 'playing', playing, intent: state.playbackIntent, status: state.status });
        if (playChange.changed) {
            this.$('shell').classList.toggle('playing', playing);
            if (playChange.reveal)
                this.revealControls();
        }
        this.setHidden('controls', !this.controls || !state.sourceId);
        this.setHidden('transport', !this.controls || !state.sourceId);
        this.setHidden('empty', !this.showSourceControls || !!state.sourceId);
        this.setHidden('poster', !this.poster || !!state.sourceId);
        this.iconButton('play', state.playbackIntent === 'play' ? 'pause' : 'play', state.playbackIntent === 'play' ? labels.pause : labels.play);
        this.$('play').disabled = !state.sourceId || pending;
        this.iconButton('mute', state.muted ? 'muted' : 'volume', state.muted ? labels.unmute : labels.mute);
        this.attr('mute', 'aria-pressed', String(state.muted));
        this.configure({ type: 'reflection', enter: true });
        try {
            this.toggleAttribute('muted', state.muted);
        }
        finally {
            this.configure({ type: 'reflection', enter: false });
        }
        if (this.shadowRoot.activeElement !== this.$('volume'))
            this.input('volume').value = String(state.volume);
        this.$('volume').style.setProperty('--volume-progress', `${Number(this.input('volume').value) * 100}%`);
        const window = state.seekable;
        this.input('timeline').disabled = pending || !window?.length;
        for (const id of ['back', 'forward'])
            this.$(id).disabled = pending || !window?.length;
        if (window?.length) {
            this.attr('timeline', 'min', String(window[0].start));
            this.attr('timeline', 'max', String(window.at(-1).end));
        }
        if (!this.dragging)
            this.input('timeline').value = String(state.currentTime);
        else {
            const target = resolveSeekTarget(Number(this.input('timeline').value), state.seekable, this.scrubTime ?? state.currentTime, state.playbackRange);
            if (target !== null)
                this.input('timeline').value = String(target);
            this.scrubTime = Number(this.input('timeline').value);
        }
        const displayedTime = formatTime(this.dragging ? Number(this.input('timeline').value) : state.currentTime);
        this.attr('timeline', 'aria-valuetext', displayedTime);
        this.text('time', displayedTime);
        this.text('duration', state.streamType === 'live' ? labels.live : state.duration === null ? labels.unknown : formatTime(state.duration));
        this.timelineProgress();
        if (this.dragging)
            this.showScrubPosition();
        if (this.view({ type: 'tracks', audio: state.audioTracks, subtitles: state.subtitleTracks, policy: state.trackPolicy }).changed) {
            this.trackOptions('audio', state.audioTracks, state.trackPolicy.audio);
            this.trackOptions('subtitles', state.subtitleTracks, state.trackPolicy.subtitles);
        }
        this.input('subtitleFile').disabled = !this.canPickSubtitle(state);
        this.$('speed').value = String(state.playbackRate);
        const buffering = state.status === 'buffering' && state.playbackIntent === 'play' && !pending;
        this.setHidden('buffering-indicator', !buffering);
        this.$('shell').classList.toggle('buffering', buffering);
        this.bufferedProgress(state);
        const opening = state.pendingOperation?.kind === 'opening';
        this.control({ type: 'opening', operation: opening ? state.pendingOperation.id : null, initialStage: this.labels.inspecting });
        const activityView = elementActivity(state, this.core?.preparationProgress ?? [], this.openingStage, labels), { activity, pill } = activityView;
        this.setHidden('busy', !pill || seeking || buffering);
        this.text('busy', pill);
        // Preparation status shares the toolbar's alignment and responsive padding.
        // Keep playback activity in the stage, including when controls are hidden.
        const busy = this.$('busy'), inToolbar = !state.sourceId && this.controls;
        if (inToolbar && busy.parentElement !== this.$('topbar'))
            this.$('title').after(busy);
        else if (!inToolbar && busy.parentElement !== this.$('stage'))
            this.$('stage').append(busy);
        this.attr('busy', 'data-complete', String(activityView.complete));
        this.attr('busy', 'aria-label', activityView.description);
        if (!this.lastFailure)
            this.announce(activityView.announcement, !pill);
        this.geometry(state);
        this.updateDiagnostics();
    }
    setDiagnostics(show) { this.control({ type: 'diagnostics', show, enabled: this.showDiagnostics, controls: this.controls }); show = this.controlState.diagnostics; this.$('diagnostics-overlay').hidden = !show; this.$('diagnostics-toggle').setAttribute('aria-pressed', String(show)); this.$('settings-diagnostics').setAttribute('aria-pressed', String(show)); this.iconButton('diagnostics-toggle', show ? 'eyeOff' : 'eye', this.labels.diagnostics); if (show)
        this.updateDiagnostics(true); }
    updateDiagnostics(force = false) {
        if (!this.control({ type: 'diagnostics-sample', now: performance.now(), force, hasOwner: !!this.core }).accepted || !this.core)
            return;
        const s = this.core.state, d = this.core.diagnostics, m = s.mediaInfo;
        const lines = [this.labels.diagnostics, `Engine  ${s.activeMode ?? '—'} · ${s.automaticSelection ? 'automatic' : 'manual'}`, `State   ${s.status}${s.pendingOperation ? ' · ' + s.pendingOperation.kind : ''}`, `Time    ${formatTime(s.currentTime)} / ${s.streamType === 'live' ? this.labels.live : s.duration === null ? '—' : formatTime(s.duration)} · ${s.playbackRate}×`, `Video   ${m.video?.codec ?? '—'} · ${m.displayWidth ?? '—'} × ${m.displayHeight ?? '—'}`, `Audio   ${m.audio?.codec ?? '—'} · ${s.muted ? 'muted' : Math.round(s.volume * 100) + '%'}`];
        if (s.activeMode && !['opening', 'switching', 'closing'].includes(s.pendingOperation?.kind ?? '')) {
            if (!s.automaticSelection)
                lines.push('Selection  Selected manually.');
            else {
                const modes = ['native', 'hybrid', 'software'];
                const attempts = (d.selection?.attempts ?? []).filter(a => modes.includes(a.mode) && modes.indexOf(a.mode) < modes.indexOf(s.activeMode) && a.outcome !== 'selected');
                if (attempts.length) {
                    lines.push('', `Why ${s.activeMode}?`);
                    for (const mode of modes) {
                        const candidates = attempts.filter(a => a.mode === mode);
                        for (const reason of new Set([...candidates.filter(a => a.outcome === 'failed'), ...candidates.filter(a => a.outcome === 'skipped')].map(a => `${a.mode} ${a.outcome}: ${a.reason}`)))
                            lines.push(reason);
                    }
                    lines.push('');
                }
                else if (s.activeMode !== 'native')
                    lines.push('Selection  No earlier route rejection recorded.');
            }
        }
        for (const [key, value] of Object.entries(d.backend ?? {}))
            if (['string', 'number', 'boolean'].includes(typeof value))
                lines.push(`${key}  ${String(value)}`);
        this.$('diagnostics-overlay').textContent = lines.join('\n');
    }
    bufferedKey = '';
    bufferedProgress(state) {
        const ranges = state.seekable, min = ranges?.[0]?.start ?? 0, max = ranges?.at(-1)?.end ?? 0, span = max - min;
        const key = JSON.stringify([min, max, state.buffered ?? state.cached ?? []]);
        if (key === this.bufferedKey)
            return;
        this.bufferedKey = key;
        const layers = span > 0 ? (state.buffered ?? state.cached ?? []).filter(r => Number.isFinite(r.start) && Number.isFinite(r.end) && r.end > r.start && r.end > min && r.start < max).map(r => { const start = Math.max(0, (r.start - min) / span * 100), end = Math.min(100, (r.end - min) / span * 100); return `linear-gradient(to right,transparent ${start}%,color-mix(in srgb,var(--demuxe-foreground) 45%,transparent) ${start}% ${end}%,transparent ${end}%)`; }) : [];
        this.$('timeline').style.setProperty('--buffered', layers.join(',') || 'linear-gradient(transparent,transparent)');
    }
    timelineProgress() { const input = this.input('timeline'), min = Number(input.min), max = Number(input.max); input.style.setProperty('--progress', `${max > min ? Math.max(0, Math.min(100, (Number(input.value) - min) / (max - min) * 100)) : 0}%`); }
    seekFromControls(time) { const state = this.core?.state; const target = state && !state.pendingOperation ? resolveSeekTarget(time, state.seekable, state.currentTime, state.playbackRange) : null; return target === null ? Promise.resolve() : this.seek(target); }
    skip(delta) { const state = this.core?.state; if (state)
        this.run(this.seekFromControls(state.currentTime + delta)); }
    trackOptions(id, list, policy) {
        const select = this.$(id), projection = elementTrackOptions(list, policy, this.labels);
        select.replaceChildren();
        for (const option of projection.options)
            select.add(new Option(option.label, option.id));
        select.value = projection.value;
        select.disabled = projection.disabled;
        select.title = select.selectedOptions[0]?.textContent ?? '';
    }
    settingsMedia;
    syncSettingsFeedback() {
        const panel = this.$('settings'), modal = panel.matches(':modal');
        const parent = modal ? panel : this.$('shell'), before = modal ? this.$('playback-options') : this.$('shortcuts-help');
        for (const id of ['error', 'status'])
            if (this.$(id).parentElement !== parent)
                parent.insertBefore(this.$(id), before);
    }
    reconcileSettings = () => {
        if (!this.controlState.menuOpen || !this.isConnected)
            return;
        const panel = this.$('settings'), modal = this.controlsMode === 'mobile' || (this.controlsMode === 'auto' && !!this.settingsMedia?.matches);
        if (panel.open && panel.matches(':modal') === modal)
            return;
        const focused = this.shadowRoot.activeElement, scroll = panel.scrollTop;
        if (panel.open)
            panel.close();
        if (modal)
            panel.showModal();
        else
            panel.show();
        this.syncSettingsFeedback();
        if (focused && panel.contains(focused) && focused.getClientRects().length)
            focused.focus({ preventScroll: true });
        else
            this.$('settings-close').focus({ preventScroll: true });
        panel.scrollTop = scroll;
    };
    settings(open, restoreFocus = true, trigger = 'settings-toggle') {
        if (!this.control({ type: 'menu', open, trigger, sourceControls: this.showSourceControls }).accepted)
            return;
        const panel = this.$('settings');
        this.revealControls();
        this.$('shell').classList.toggle('menu-open', open);
        if (open) {
            const source = this.menuTrigger === 'open-menu';
            this.$('source-options').hidden = !source;
            this.$('playback-options').hidden = source;
            this.$('settings-title').textContent = source ? this.labels.open : this.labels.settings;
            panel.classList.toggle('source-menu', source);
            panel.hidden = false;
            if (!this.settingsMedia) {
                this.settingsMedia = matchMedia(mobileControlsQuery);
                this.settingsMedia.addEventListener('change', this.reconcileSettings);
            }
            this.reconcileSettings();
            panel.scrollTop = 0;
        }
        else {
            this.settingsMedia?.removeEventListener('change', this.reconcileSettings);
            this.settingsMedia = undefined;
            panel.close();
            panel.hidden = true;
            this.syncSettingsFeedback();
        }
        this.$('open-menu').setAttribute('aria-expanded', String(open && this.menuTrigger === 'open-menu'));
        this.iconButton('open-menu', open && this.menuTrigger === 'open-menu' ? 'folderOpen' : 'folder', this.labels.open);
        this.$('settings-toggle').setAttribute('aria-expanded', String(open && this.menuTrigger === 'settings-toggle'));
        if (open) {
            this.syncPreviewStrategy();
            if (this.core)
                this.advanced?.update(this.core.state);
            this.$('settings-close').focus();
        }
        else if (restoreFocus) {
            const trigger = this.$(this.menuTrigger);
            (trigger.getClientRects().length ? trigger : this.$('settings-toggle')).focus();
        }
    }
    fullscreen() { const active = document.fullscreenElement === this; const request = active ? this.core?.presentation.exitFullscreen() : this.core?.presentation.requestFullscreen(); if (!request) {
        this.announce(this.labels.noFullscreen);
        return;
    } void request.then(() => { this.fullscreenChanged(); }, () => this.announce(this.labels.noFullscreen)); }
    iconButton(id, icon, label) { const button = this.$(id); if (button.dataset.icon !== icon) {
        button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icons[icon]}</svg>`;
        button.dataset.icon = icon;
    } if (icon === 'back' || icon === 'forward')
        button.querySelector('text').textContent = String(this.seekStep); if (!button.classList.contains('icon-button'))
        button.classList.add('icon-button'); this.attr(id, 'aria-label', label); this.attr(id, 'title', label); }
    labelControls() {
        this.advanced?.label(this.labels);
        this.$('settings-source').textContent = this.labels.open;
        this.$('settings-diagnostics').textContent = this.labels.diagnostics;
        this.$('preview-help').textContent = this.labels.previewHelp;
        this.$('preview-strategy-label').textContent = this.labels.previewStrategy;
        for (const [value, key] of [['demuxe', 'previewDemuxe'], ['adaptive', 'previewAdaptive'], ['gaussian', 'previewGaussian'], ['directional', 'previewDirectional'], ['uniform', 'previewUniform'], ['interval', 'previewInterval'], ['on-demand', 'previewOnDemand'], ['custom', 'previewCustom']])
            this.$('preview-strategy').querySelector(`option[value="${value}"]`).textContent = this.labels[key];
        for (const key of ['appearance', 'layout', 'theme', 'controlsMode'])
            this.$(key + '-label').textContent = this.labels[key];
        for (const [id, keys] of [['layout-select', playerLayouts], ['theme-select', ['demuxeTheme', 'lightTheme']], ['controls-mode-select', ['controlsAuto', 'controlsMobile', 'controlsDesktop']]])
            Array.from(this.$(id).options).forEach((option, index) => option.textContent = this.labels[keys[index]]);
        this.$('shortcuts-help').textContent = this.labels.shortcuts;
        this.renderQueue();
        this.$('choose-file').textContent = this.queueItems.length ? this.labels.addFiles : this.labels.open;
        this.updateSourceLabel();
        this.$('diagnostics-overlay').setAttribute('aria-label', this.labels.diagnostics);
        for (const [id, key] of Object.entries({ mute: 'mute', 'settings-toggle': 'settings', 'settings-close': 'closeSettings', fullscreen: 'fullscreen', 'open': 'open', 'open-menu': 'open', 'url-submit': 'openURL', 'retry': 'retry' }))
            this.$(id).textContent = this.labels[key];
        for (const [id, icon, key] of [['back', 'back', 'back'], ['forward', 'forward', 'forward'], ['play', 'play', 'play'], ['mute', 'volume', 'mute'], ['settings-toggle', 'settings', 'settings'], ['settings-close', 'close', 'closeSettings'], ['open-menu', 'folder', 'open'], ['diagnostics-toggle', 'eye', 'diagnostics']]) {
            delete this.$(id).dataset.icon;
            this.iconButton(id, id === 'diagnostics-toggle' && this.$(id).getAttribute('aria-pressed') === 'true' ? 'eyeOff' : id === 'open-menu' && this.$(id).getAttribute('aria-expanded') === 'true' ? 'folderOpen' : icon, this.labels[key]);
        }
        delete this.$('fullscreen').dataset.icon;
        this.fullscreenChanged();
        for (const [id, key] of Object.entries({ timeline: 'seek', volume: 'volume', file: 'open', subtitleFile: 'addSubtitle' }))
            this.$(id).setAttribute('aria-label', this.labels[key]);
        const opener = this.$('open');
        opener.innerHTML = `<svg class="open-folder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons.folder}</svg><span></span><svg class="open-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>`;
        opener.querySelector('span').textContent = this.labels.open;
        for (const id of ['speed', 'audio', 'subtitles', 'previews'])
            this.$(id + '-label').textContent = this.labels[id];
        this.$('settings-title').textContent = this.menuTrigger === 'open-menu' ? this.labels.open : this.labels.settings;
        this.$('media-file-label').textContent = this.labels.mediaFile;
        this.$('subtitle-file-label').textContent = this.labels.subtitleFile;
        for (const id of ['url', 'format', 'live'])
            this.$(id + '-label').textContent = this.labels[id === 'live' ? 'streamLive' : id];
    }
    renderShell() {
        this.shadowRoot.innerHTML = `<style>${styles}${themeStyles}${presentationStyles}${advancedSettingsStyles}${mobileStyles}</style>${playerShell()}`;
        this.advanced = new AdvancedSettings(this.shadowRoot, () => this.core, work => this.runSettings(work));
        this.updatePresentation();
        this.labelControls();
        this.updateTitle();
        this.updateUtilities();
        this.$('controls').hidden = !this.controls;
        this.$('topbar').hidden = !this.controls;
        this.addEventListener('pointermove', event => { if (event.pointerType !== 'touch')
            this.revealControls(); });
        this.addEventListener('pointerdown', event => { if (this.isScreenPress(event))
            this.control({ type: 'screen-press' });
        else
            this.revealControls(); });
        this.addEventListener('focusin', this.revealControls);
        this.addEventListener('focusout', () => { if (!this.controlState.idle)
            this.revealControls(); });
        this.addEventListener('pointerleave', event => { if (!this.control({ type: 'pointer-leave', mouse: event.pointerType === 'mouse', terminal: this.terminal, controls: this.controls, hasSource: !!this.core?.state.sourceId, ...this.controlFacts() }).accepted)
            return; this.hideControls(); });
        this.$('source-actions').addEventListener('click', event => { if (this.showSourceControls && event.composedPath().some(node => node instanceof HTMLButtonElement)) {
            this.settings(false, false);
            this.$('stage').focus({ preventScroll: true });
        } });
        this.$('open-menu').onclick = () => this.settings(!this.controlState.menuOpen || this.menuTrigger !== 'open-menu', true, 'open-menu');
        this.$('shell').onclick = event => { if (!this.isScreenPress(event) || !this.core?.state.sourceId || !this.controls)
            return; if (this.controlState.stageWasIdle) {
            this.$('stage').focus({ preventScroll: true });
            this.revealControls();
        }
        else
            this.hideControls(true); };
        this.$('format').onchange = () => this.updateUtilities();
        this.$('remote').onsubmit = event => { event.preventDefault(); if (!this.showSourceControls)
            return; const format = this.$('format').value; this.openFromControls({ url: this.input('url').value, format, ...(format !== 'file' ? { streaming: { live: this.input('live').checked } } : {}) }); };
        this.addEventListener('dragover', event => { if (this.allowFileDrop && event.dataTransfer?.types.includes('Files'))
            event.preventDefault(); });
        this.addEventListener('drop', event => { if (!this.allowFileDrop || !event.dataTransfer?.files.length)
            return; event.preventDefault(); this.addFiles(Array.from(event.dataTransfer.files)); });
        this.$('back').onclick = () => this.skip(-this.seekStep);
        this.$('forward').onclick = () => this.skip(this.seekStep);
        this.$('play').onclick = event => {
            // WebKit can blur the stage without focusing a pointer-activated button.
            // Recover before async playback so the next shortcut still reaches us.
            const active = this.ownerDocument.activeElement;
            if (event.isTrusted && event.detail > 0 && !this.shadowRoot.activeElement &&
                (active === this.ownerDocument.body || active === this.ownerDocument.documentElement || active === this))
                this.$('stage').focus({ preventScroll: true });
            if (this.core)
                this.run(this.core.state.playbackIntent === 'play' ? this.pause() : this.playFromControls());
        };
        this.$('mute').onclick = () => { if (this.core)
            this.run(this.setMuted(!this.core.state.muted)); };
        this.input('volume').oninput = () => this.$('volume').style.setProperty('--volume-progress', `${Number(this.input('volume').value) * 100}%`);
        this.input('volume').onchange = () => this.run(this.setVolume(Number(this.input('volume').value)));
        this.input('timeline').onpointerdown = event => {
            if (!event.isPrimary || event.button !== 0 || this.input('timeline').disabled)
                return;
            this.timelinePointer = event.pointerId;
            this.scrubTime = Number(this.input('timeline').value);
            this.control({ type: 'drag', active: true });
            this.revealControls();
            this.input('timeline').setPointerCapture(event.pointerId);
            this.showScrubPosition();
        };
        this.input('timeline').onpointerup = event => { if (event.pointerId === this.timelinePointer)
            this.finishTimelineDrag(); };
        this.input('timeline').onlostpointercapture = () => { if (this.timelinePointer !== undefined) {
            this.finishTimelineDrag();
            if (this.core)
                this.update(this.core.state);
        } };
        this.input('timeline').oninput = () => { this.control({ type: 'drag', active: true }); const state = this.core?.state, target = state ? resolveSeekTarget(Number(this.input('timeline').value), state.seekable, this.scrubTime ?? state.currentTime, state.playbackRange) : null; if (target !== null)
            this.input('timeline').value = String(target); this.scrubTime = Number(this.input('timeline').value); const text = formatTime(this.scrubTime); this.$('time').textContent = text; this.timelineProgress(); this.input('timeline').setAttribute('aria-valuetext', text); this.showScrubPosition(); };
        this.input('timeline').onchange = () => { const value = Number(this.input('timeline').value); this.finishTimelineDrag(); this.run(this.seekFromControls(value)); };
        this.input('timeline').onpointercancel = () => { this.finishTimelineDrag(); if (this.core)
            this.update(this.core.state); };
        this.$('settings-source').onclick = () => this.settings(true, true, 'open-menu');
        this.$('settings-diagnostics').onclick = () => { this.settings(false); this.setDiagnostics(!this.controlState.diagnostics); };
        this.$('settings').addEventListener('cancel', event => { event.preventDefault(); this.settings(false); });
        this.$('settings').addEventListener('close', () => { if (!this.$('settings').open && this.controlState.menuOpen)
            this.settings(false); });
        this.$('settings').addEventListener('click', event => {
            if (event.target !== this.$('settings'))
                return;
            const panel = this.$('settings'), rect = panel.getBoundingClientRect();
            if (panel.matches(':modal') && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom))
                this.settings(false);
        });
        this.$('settings-toggle').onclick = () => this.settings(!this.controlState.menuOpen || this.menuTrigger !== 'settings-toggle', true, 'settings-toggle');
        this.$('settings-close').onclick = () => this.settings(false);
        this.$('layout-select').onchange = () => { this.layout = this.$('layout-select').value; };
        this.$('theme-select').onchange = () => { this.theme = this.$('theme-select').value; };
        this.$('controls-mode-select').onchange = () => { this.controlsMode = this.$('controls-mode-select').value; };
        this.input('preview-toggle').onchange = () => { this.previewThumbnails = this.input('preview-toggle').checked; this.syncPreviewStrategy(); };
        this.$('preview-strategy').onchange = () => { const type = this.$('preview-strategy').value; if (this.core && ['demuxe', 'adaptive', 'gaussian', 'directional', 'uniform', 'interval', 'on-demand'].includes(type))
            this.core.preview.setStrategy({ type }); this.syncPreviewStrategy(); };
        this.$('speed').onchange = () => this.run(this.setPlaybackRate(Number(this.$('speed').value)));
        this.$('audio').onchange = () => this.run(this.selectAudioTrack(this.$('audio').value || null));
        this.$('subtitles').onchange = () => this.run(this.selectSubtitleTrack(this.$('subtitles').value || null));
        this.$('diagnostics-toggle').onclick = () => this.setDiagnostics(this.$('diagnostics-overlay').hidden);
        this.$('fullscreen').onclick = () => this.fullscreen();
        this.$('stage').ondblclick = () => this.fullscreen();
        this.$('choose-file').onclick = () => { if (this.showSourceControls)
            this.input('file').click(); };
        this.$('open').onclick = () => { if (this.showSourceControls)
            this.input('file').click(); };
        this.input('file').onchange = () => { const files = Array.from(this.input('file').files ?? []); this.input('file').value = ''; if (this.showSourceControls)
            this.addFiles(files); };
        this.input('subtitleFile').onchange = () => { const file = this.input('subtitleFile').files?.[0]; this.input('subtitleFile').value = ''; if (file && this.canPickSubtitle())
            this.run(this.addSubtitle(file)); };
        this.$('previous-file').onclick = () => this.selectQueue(this.queueIndex - 1);
        this.$('next-file').onclick = () => this.selectQueue(this.queueIndex + 1);
        this.$('clear-queue').onclick = () => { if (this.showSourceControls && !this.queueOperation && !this.core?.state.pendingOperation) {
            this.settings(false, false);
            this.$('stage').focus({ preventScroll: true });
            this.run(this.close());
        } };
        this.$('retry').onclick = () => { const error = this.lastFailure; this.clearError(); if (error?.code === 'AUTOPLAY_BLOCKED')
            this.run(this.play());
        else if (this.lastSource)
            this.run(this.queueResource(this.queueIndex)?.source === this.lastSource ? this.activateQueue(this.queueIndex, () => this.autoplay) : this.open(this.lastSource, this.lastOptions)); };
        this.addEventListener('keydown', event => {
            if (event.composedPath().includes(this.$('diagnostics-overlay'))) {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    this.setDiagnostics(false);
                    this.$('diagnostics-toggle').focus();
                }
                return;
            }
            const topbar = event.composedPath().includes(this.$('utility-actions')), key = shortcut(event, topbar);
            if (topbar && key === ' ')
                event.preventDefault();
            if (event.repeat && !this.controlState.menuOpen && [' ', 'k', 'm', 'f'].includes(key ?? '')) {
                event.preventDefault();
                return;
            }
            if (!['arrowleft', 'arrowright', 'j', 'l', 'home', 'end', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key ?? '') || !this.controlState.idle)
                this.revealControls();
            if (event.key === 'Escape' && this.controlState.menuOpen) {
                event.preventDefault();
                this.settings(false);
                return;
            }
            if (this.controlState.menuOpen)
                return;
            const p = this.core;
            if (!key || !p)
                return;
            let action;
            const state = p.state;
            const seek = (time) => { if (state.playbackIntent === 'play' && !this.dragging)
                this.hideControls(); return this.seekFromControls(time); };
            if (key === 'f') {
                event.preventDefault();
                this.fullscreen();
                return;
            }
            if (key === '?') {
                event.preventDefault();
                this.settings(true);
                return;
            }
            if (key === 'm')
                action = p.setMuted(!state.muted);
            if (key === 'arrowup' || key === 'arrowdown')
                action = p.setVolume(Math.max(0, Math.min(1, state.volume + (key === 'arrowup' ? .05 : -.05))));
            if (key === '[' || key === ']')
                action = p.setPlaybackRate(Math.max(.5, Math.min(2, state.playbackRate + (key === ']' ? .25 : -.25))));
            if (!state.pendingOperation && state.sourceId) {
                if (key === 'c' && !state.trackPolicy.subtitles?.locked && (!state.subtitlesVisible || state.trackPolicy.subtitles?.allowOff !== false))
                    action = p.subtitleVisible(!state.subtitlesVisible);
                const ranges = state.seekable;
                if (ranges?.length) {
                    const start = ranges[0].start, end = Math.max(start, ranges.at(-1).end - .1);
                    if (key === 'home')
                        action = seek(start);
                    if (key === 'end')
                        action = seek(end);
                    if (/^[0-9]$/.test(key))
                        action = seek(start + (end - start) * Number(key) / 10);
                }
                if (key === ' ' || key === 'k')
                    action = state.playbackIntent === 'play' ? this.pause() : this.playFromControls();
                const delta = key === 'arrowleft' ? -5 : key === 'arrowright' ? 5 : key === 'j' ? -this.seekStep : key === 'l' ? this.seekStep : 0;
                const window = state.seekable;
                if (delta && window?.length)
                    action = seek(state.currentTime + delta);
            }
            if (action) {
                event.preventDefault();
                this.run(action);
            }
        });
    }
}
export function definePlayerElement(name = 'demuxe-player') {
    if (typeof customElements === 'undefined')
        throw new PlayerError('INVALID_ARGUMENT', 'Custom element registration requires a browser');
    const existing = customElements.get(name);
    if (existing && existing !== DemuxePlayerElement)
        throw new PlayerError('INVALID_ARGUMENT', `Custom element ${name} is already registered with another implementation`);
    if (!existing)
        customElements.define(name, DemuxePlayerElement);
    return DemuxePlayerElement;
}
