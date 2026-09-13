import { Player } from '../unified-player.js';
import { PLAYER_EVENTS } from '../types.js';
import { PlayerError, playerError } from '../internal/errors.js';
import { formatTime, outputDimensions, shortcut } from './interaction.js';
import { styles } from './styles.js';
const icons = {
    play: '<path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M8 5v14M16 5v14" stroke-width="4"/>',
    volume: '<path d="m11 5-6 4H2v6h3l6 4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    muted: '<path d="m11 5-6 4H2v6h3l6 4Z"/><path d="m16 9 6 6m0-6-6 6"/>',
    settings: '<path d="M9 3h6l.6 2.3 2 1.2 2.3-.6 3 5.2-1.7 1.7v2.4l1.7 1.7-3 5.2-2.3-.6-2 1.2L15 24H9l-.6-2.3-2-1.2-2.3.6-3-5.2 1.7-1.7v-2.4L1.1 11l3-5.2 2.3.6 2-1.2Z" transform="translate(1 0) scale(.9)"/><circle cx="12" cy="12" r="3"/>',
    expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    collapse: '<path d="M3 8h5V3m8 0v5h5M8 21v-5H3m13 5v-5h5"/>',
    folder: '<path d="M3 8V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v2M3 8h17a1 1 0 0 1 1 1l-2 10H3L1 9a1 1 0 0 1 1-1Z"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>'
};
const Base = (typeof HTMLElement === 'undefined' ? class {
} : HTMLElement);
export const defaultLabels = Object.freeze({ play: 'Play', pause: 'Pause', mute: 'Mute', unmute: 'Unmute', seek: 'Playback position', volume: 'Volume', settings: 'Playback settings', closeSettings: 'Close settings', speed: 'Playback speed', audio: 'Audio', subtitles: 'Subtitles', automatic: 'Automatic', off: 'Off', fullscreen: 'Fullscreen', exitFullscreen: 'Exit fullscreen', open: 'Open media', addSubtitle: 'Add subtitles', empty: 'Something good to watch?', drop: 'Open a video or audio file from your device.', loading: 'Opening media…', switching: 'Updating playback…', seeking: 'Seeking…', buffering: 'Buffering…', live: 'LIVE', unknown: 'Unknown duration', retry: 'Retry', resume: 'Press Play to continue', shortcuts: 'K / Space: play · ← → / J L: seek · ↑ ↓: volume · M: mute · C: subtitles · [ ]: speed · 0–9 / Home / End: position · F: fullscreen', noFullscreen: 'Fullscreen is unavailable here. Open this page in a browser tab.', noWindow: 'Live playback · seek window unavailable', openURL: 'Open URL', closeMedia: 'Close media', url: 'Media URL', format: 'Source format', streamLive: 'Live stream', mediaFile: 'Media file', subtitleFile: 'Subtitle file' });
export class WebmpvPlayerElement extends Base {
    static observedAttributes = ['src', 'controls', 'poster', 'autoplay', 'muted', 'asset-base'];
    core;
    terminal = false;
    cleanup = Promise.resolve();
    connecting;
    connection = 0;
    unsubscribe;
    sourceAbort;
    sourceVersion = 0;
    lastSource;
    lastOptions;
    resolveReady;
    rejectReady;
    readiness;
    overrides = {};
    menuTrigger = 'settings-toggle';
    hideTimer;
    revealControls = () => { this.$('shell').classList.remove('idle'); clearTimeout(this.hideTimer); if (this.core?.state.status === 'playing')
        this.hideTimer = setTimeout(() => { if (this.core?.state.status === 'playing' && this.$('settings').hidden && !this.dragging && !this.shadowRoot?.activeElement && this.isConnected)
            this.$('shell').classList.add('idle'); }, 2800); };
    dragging = false;
    dimensions = '';
    trackSignature = '';
    reflected = false;
    attributeScheduled = false;
    configuredAsset = null;
    resizeObserver;
    lastAnnouncement = '';
    lastFailure;
    fullscreenChanged = () => { const active = document.fullscreenElement === this; this.iconButton('fullscreen', active ? 'collapse' : 'expand', active ? this.labels.exitFullscreen : this.labels.fullscreen); };
    constructor() { super(); this.newReady(); this.attachShadow({ mode: 'open' }); this.renderShell(); }
    newReady() { this.readiness = new Promise((resolve, reject) => { this.resolveReady = resolve; this.rejectReady = reject; }); void this.readiness.catch(() => { }); }
    get ready() { return this.readiness; }
    get player() { return this.core; }
    get src() { return this.getAttribute('src') ?? ''; }
    set src(value) { if (value)
        this.setAttribute('src', String(value));
    else
        this.removeAttribute('src'); }
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
    get labels() { return { ...defaultLabels, ...this.overrides }; }
    set labels(value) { const next = {}; for (const [key, text] of Object.entries(value)) {
        if (!(key in defaultLabels) || text === undefined)
            continue;
        if (typeof text !== 'string' || text.length > 1024)
            throw new PlayerError('INVALID_ARGUMENT', 'Labels must be strings up to 1024 characters');
        next[key] = text;
    } this.overrides = next; this.labelControls(); if (this.core)
        this.update(this.core.state); }
    $(id) { return this.shadowRoot.getElementById(id); }
    input(id) { return this.$(id); }
    connectedCallback() {
        const token = ++this.connection;
        if (this.terminal)
            return;
        for (const name of ['assetBase', 'labels', 'controls', 'poster', 'autoplay', 'muted', 'src'])
            if (Object.prototype.hasOwnProperty.call(this, name)) {
                const value = this[name];
                delete this[name];
                this[name] = value;
            }
        if (this.core)
            return;
        this.connecting = (async () => {
            await this.cleanup;
            if (!this.isConnected || token !== this.connection || this.terminal)
                return;
            try {
                this.configuredAsset = this.getAttribute('asset-base');
                const core = this.core = new Player(this.$('surface'), { assetBase: this.assetBase });
                this.dimensions = '';
                this.trackSignature = '';
                for (const type of [...PLAYER_EVENTS, 'modechange', 'selectionchange', 'mpv', 'log', 'source', 'output'])
                    core.addEventListener(type, event => {
                        if (this.core !== core || this.terminal)
                            return;
                        const detail = event.detail;
                        if (type === 'error')
                            this.showError(detail);
                        this.dispatchEvent(new CustomEvent(type, { detail }));
                    });
                const initiallyMuted = this.muted;
                this.unsubscribe = core.subscribe(state => this.update(state));
                if (initiallyMuted)
                    await core.setMuted(true);
                this.resizeObserver = new ResizeObserver(() => { if (this.core)
                    this.geometry(this.core.state); });
                this.resizeObserver.observe(this.$('stage'));
                document.addEventListener('fullscreenchange', this.fullscreenChanged);
                this.resolveReady(core);
                if (this.src)
                    this.scheduleSource();
            }
            catch (error) {
                this.rejectReady(playerError(error));
                this.componentError(error);
            }
        })();
    }
    disconnectedCallback() {
        const token = ++this.connection;
        queueMicrotask(() => {
            if (this.isConnected || token !== this.connection || this.terminal)
                return;
            clearTimeout(this.hideTimer);
            this.sourceVersion++;
            this.sourceAbort?.abort();
            this.lastSource = undefined;
            this.lastOptions = undefined;
            this.unsubscribe?.();
            this.resizeObserver?.disconnect();
            document.removeEventListener('fullscreenchange', this.fullscreenChanged);
            const old = this.core;
            this.core = undefined;
            this.rejectReady(new PlayerError('ABORTED', 'Player element disconnected'));
            this.newReady();
            this.cleanup = Promise.all([this.connecting, old?.destroy()]).then(() => { });
        });
    }
    attributeChangedCallback(name, old, value) {
        if (old === value || this.reflected)
            return;
        if (name === 'asset-base' && this.core) {
            this.reflected = true;
            if (this.configuredAsset === null)
                this.removeAttribute(name);
            else
                this.setAttribute(name, this.configuredAsset);
            this.reflected = false;
            this.componentError(new PlayerError('INVALID_ARGUMENT', 'asset-base is fixed after initialization'));
            return;
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
    scheduleSource() { if (this.attributeScheduled)
        return; this.attributeScheduled = true; queueMicrotask(() => { this.attributeScheduled = false; if (!this.core || this.terminal)
        return; this.run(this.src ? this.open(this.src) : this.close()); }); }
    waitReady(signal) {
        if (signal.aborted)
            return Promise.reject(new PlayerError('ABORTED', 'Open aborted'));
        return new Promise((resolve, reject) => { const abort = () => { signal.removeEventListener('abort', abort); reject(new PlayerError('ABORTED', 'Open aborted')); }; signal.addEventListener('abort', abort, { once: true }); this.ready.then(p => { signal.removeEventListener('abort', abort); resolve(p); }, e => { signal.removeEventListener('abort', abort); reject(e); }); });
    }
    async open(source, options = {}) {
        if (this.terminal)
            throw new PlayerError('ABORTED', 'Player element is destroyed');
        const version = ++this.sourceVersion;
        this.sourceAbort?.abort();
        const controller = this.sourceAbort = new AbortController();
        const abort = () => controller.abort();
        options.signal?.addEventListener('abort', abort, { once: true });
        if (options.signal?.aborted)
            abort();
        try {
            const core = this.core ?? await this.waitReady(controller.signal);
            if (this.terminal || version !== this.sourceVersion || controller.signal.aborted)
                throw new PlayerError('ABORTED', 'Open aborted');
            this.lastSource = source;
            this.lastOptions = { ...options, signal: undefined };
            this.clearError();
            await core.open(source, { ...options, signal: controller.signal });
            if (version === this.sourceVersion && this.autoplay)
                await core.play();
        }
        finally {
            options.signal?.removeEventListener('abort', abort);
        }
    }
    close() { this.sourceVersion++; this.sourceAbort?.abort(); this.lastSource = undefined; this.lastOptions = undefined; this.clearError(); return this.core ? this.core.close() : this.terminal ? Promise.reject(new PlayerError('ABORTED', 'Player element is destroyed')) : Promise.resolve(); }
    play() { return this.core ? this.core.play() : this.ready.then(p => p.play()); }
    pause() { return this.core ? this.core.pause() : this.ready.then(p => p.pause()); }
    seek(seconds) { return this.ready.then(p => p.seek(seconds)); }
    setVolume(value) { return this.ready.then(p => p.setVolume(value)); }
    setMuted(value) { return this.ready.then(p => p.setMuted(value)); }
    setPlaybackRate(value) { return this.ready.then(p => p.setPlaybackRate(value)); }
    selectAudioTrack(id) { return this.ready.then(p => p.selectAudioTrack(id)); }
    selectSubtitleTrack(id) { return this.ready.then(p => p.selectSubtitleTrack(id)); }
    addSubtitle(file, options) { return this.ready.then(p => p.addSubtitle(file, options)); }
    destroy() {
        if (this.terminal)
            return this.cleanup;
        clearTimeout(this.hideTimer);
        this.terminal = true;
        this.connection++;
        this.sourceVersion++;
        this.sourceAbort?.abort();
        this.lastSource = undefined;
        this.lastOptions = undefined;
        this.unsubscribe?.();
        this.resizeObserver?.disconnect();
        document.removeEventListener('fullscreenchange', this.fullscreenChanged);
        this.rejectReady(new PlayerError('ABORTED', 'Player element is destroyed'));
        const old = this.core;
        this.core = undefined;
        this.cleanup = Promise.all([this.cleanup, this.connecting, old?.destroy()]).then(() => { this.$('surface').replaceChildren(); this.$('controls').hidden = true; this.$('empty').hidden = true; });
        return this.cleanup;
    }
    run(work) { void work.catch(error => { if (!this.terminal && playerError(error).code !== 'ABORTED')
        this.showError(playerError(error).toJSON()); }); }
    componentError(error) { const detail = playerError(error).toJSON(); this.showError(detail); this.dispatchEvent(new CustomEvent('error', { detail })); }
    showError(error) { if (error.code === 'ABORTED')
        return; this.lastFailure = error; this.$('error').hidden = false; this.$('error-text').textContent = error.message; this.$('retry').hidden = !error.retryable; this.$('retry').textContent = error.code === 'AUTOPLAY_BLOCKED' ? this.labels.play : this.labels.retry; this.announce(error.message); }
    clearError() { this.lastFailure = undefined; this.$('error').hidden = true; }
    announce(text) { if (text === this.lastAnnouncement)
        return; this.lastAnnouncement = text; this.$('status').textContent = text; }
    geometry(state) { const ratio = state.mediaInfo.aspectRatio; if (!ratio) {
        this.$('stage').style.removeProperty('--media-aspect');
        return;
    } this.$('stage').style.setProperty('--media-aspect', String(ratio)); if (state.pendingOperation)
        return; const { width, height } = outputDimensions(ratio), key = `${width}x${height}`; if (this.dimensions !== key) {
        this.dimensions = key;
        this.core?.resize(width, height);
    } }
    update(state) {
        const labels = this.labels, pending = state.pendingOperation !== null;
        this.$('topbar').hidden = !this.controls;
        this.$('close-media').hidden = !state.sourceId && !pending;
        const playing = state.status === 'playing';
        if (this.$('shell').classList.contains('playing') !== playing) {
            this.$('shell').classList.toggle('playing', playing);
            this.revealControls();
        }
        this.$('controls').hidden = !this.controls || !state.sourceId;
        this.$('empty').hidden = !!state.sourceId;
        this.$('poster').hidden = !this.poster || !!state.sourceId;
        this.iconButton('play', state.playbackIntent === 'play' ? 'pause' : 'play', state.playbackIntent === 'play' ? labels.pause : labels.play);
        this.$('play').disabled = !state.sourceId || pending;
        this.iconButton('mute', state.muted ? 'muted' : 'volume', state.muted ? labels.unmute : labels.mute);
        this.$('mute').setAttribute('aria-pressed', String(state.muted));
        this.reflected = true;
        this.toggleAttribute('muted', state.muted);
        this.reflected = false;
        if (this.shadowRoot.activeElement !== this.$('volume'))
            this.input('volume').value = String(state.volume);
        const window = state.seekable;
        this.input('timeline').disabled = pending || !window?.length;
        if (window?.length) {
            this.input('timeline').min = String(window[0].start);
            this.input('timeline').max = String(window.at(-1).end);
        }
        if (!this.dragging) {
            this.input('timeline').value = String(state.currentTime);
            this.input('timeline').setAttribute('aria-valuetext', formatTime(state.currentTime));
            this.$('time').textContent = `${formatTime(state.currentTime)} / ${state.streamType === 'live' ? labels.live : state.duration === null ? labels.unknown : formatTime(state.duration)}`;
        }
        const signature = JSON.stringify([state.audioTracks, state.subtitleTracks]);
        if (signature !== this.trackSignature) {
            this.trackSignature = signature;
            this.trackOptions('audio', state.audioTracks);
            this.trackOptions('subtitles', state.subtitleTracks);
        }
        this.$('speed').value = String(state.playbackRate);
        const activity = state.pendingOperation?.kind === 'opening' ? labels.loading : state.pendingOperation?.kind === 'switching' ? labels.switching : state.pendingOperation?.kind === 'seeking' ? labels.seeking : state.status === 'buffering' ? labels.buffering : '';
        this.$('busy').hidden = !activity;
        this.$('busy').textContent = activity;
        if (!this.lastFailure)
            this.announce(activity || (state.streamType === 'live' && !window?.length ? labels.noWindow : ''));
        this.geometry(state);
    }
    trackOptions(id, list) { const select = this.$(id); select.replaceChildren(new Option(this.labels.automatic, 'auto'), new Option(this.labels.off, '')); for (const t of list)
        select.add(new Option(t.label, t.id)); select.value = list.find(t => t.selected)?.id ?? (list.length ? '' : 'auto'); select.disabled = !list.length; }
    settings(open) { if (open)
        this.menuTrigger = this.$('controls').hidden ? 'open-menu' : (this.shadowRoot?.activeElement?.id === 'open-menu' ? 'open-menu' : 'settings-toggle'); this.revealControls(); this.$('settings').hidden = !open; this.$('settings-toggle').setAttribute('aria-expanded', String(open)); if (open)
        this.$('settings-close').focus();
    else
        this.$(this.menuTrigger).focus(); }
    fullscreen() { const active = document.fullscreenElement === this; const request = active ? document.exitFullscreen() : this.requestFullscreen?.(); if (!request) {
        this.announce(this.labels.noFullscreen);
        return;
    } void request.then(() => { this.fullscreenChanged(); }, () => this.announce(this.labels.noFullscreen)); }
    iconButton(id, icon, label) { const button = this.$(id); if (button.dataset.icon !== icon) {
        button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icons[icon]}</svg>`;
        button.dataset.icon = icon;
    } button.classList.add('icon-button'); button.setAttribute('aria-label', label); button.setAttribute('title', label); }
    labelControls() { for (const [id, key] of Object.entries({ mute: 'mute', 'settings-toggle': 'settings', 'settings-close': 'closeSettings', fullscreen: 'fullscreen', 'open': 'open', 'open-menu': 'open', 'close-media': 'closeMedia', 'url-submit': 'openURL', 'retry': 'retry' }))
        this.$(id).textContent = this.labels[key]; for (const [id, icon, key] of [['play', 'play', 'play'], ['mute', 'volume', 'mute'], ['settings-toggle', 'settings', 'settings'], ['settings-close', 'close', 'closeSettings'], ['open-menu', 'folder', 'open'], ['close-media', 'close', 'closeMedia']]) {
        delete this.$(id).dataset.icon;
        this.iconButton(id, icon, this.labels[key]);
    } delete this.$('fullscreen').dataset.icon; this.fullscreenChanged(); for (const [id, key] of Object.entries({ timeline: 'seek', volume: 'volume', file: 'open', subtitleFile: 'addSubtitle' }))
        this.$(id).setAttribute('aria-label', this.labels[key]); this.$('empty-title').textContent = this.labels.empty; this.$('empty-description').textContent = this.labels.drop; this.$('help').textContent = this.labels.shortcuts; for (const id of ['speed', 'audio', 'subtitles'])
        this.$(id + '-label').textContent = this.labels[id]; this.$('settings-title').textContent = this.labels.settings; this.$('media-file-label').textContent = this.labels.mediaFile; this.$('subtitle-file-label').textContent = this.labels.subtitleFile; for (const id of ['url', 'format', 'live'])
        this.$(id + '-label').textContent = this.labels[id === 'live' ? 'streamLive' : id]; }
    renderShell() {
        this.shadowRoot.innerHTML = `<style>${styles}</style><section id="shell" class="shell" part="container" aria-label="Media player"><div id="topbar" class="topbar"><span class="player-title">deplexr</span><span class="space"></span><button id="open-menu"></button><button id="close-media" hidden></button></div><div id="stage" class="stage" part="stage" tabindex="0"><div id="surface" class="surface"></div><img id="poster" class="poster" alt="" hidden><div id="empty" class="empty"><div class="emblem" aria-hidden="true">▷</div><strong id="empty-title"></strong><p id="empty-description"></p><button id="open"></button></div><div id="busy" class="busy" hidden></div></div><div id="controls" class="controls" part="controls"><slot name="before-controls"></slot><input id="timeline" class="timeline" type="range" min="0" max="1" step="0.1" value="0" disabled><div class="row"><button id="play" class="play" disabled>Play</button><span id="time" class="time">0:00 / —</span><span class="space"></span><button id="mute" aria-pressed="false"></button><input id="volume" class="volume" type="range" min="0" max="1" step=".01" value="1"><button id="settings-toggle" aria-expanded="false" aria-controls="settings"></button><button id="fullscreen"></button></div><slot name="after-controls"></slot></div><section id="settings" class="settings" part="settings" aria-labelledby="settings-title" hidden><header><strong id="settings-title"></strong><button id="settings-close"></button></header><label><span id="speed-label"></span><select id="speed">${[.5, .75, 1, 1.25, 1.5, 1.75, 2].map(n => `<option value="${n}">${n}×</option>`).join('')}</select></label><label><span id="audio-label"></span><select id="audio" disabled></select></label><label><span id="subtitles-label"></span><select id="subtitles" disabled></select></label><label><span id="media-file-label"></span><input id="file" type="file"></label><label><span id="subtitle-file-label"></span><input id="subtitleFile" type="file" accept=".srt,.ass,.ssa,.vtt"></label><form id="remote"><label><span id="url-label"></span><input id="url" type="url" placeholder="https://…" required></label><label><span id="format-label"></span><select id="format"><option value="file">File</option><option value="hls">HLS</option><option value="dash">DASH</option></select></label><label class="check"><input id="live" type="checkbox"><span id="live-label"></span></label><button id="url-submit" type="submit"></button></form><p class="help" id="help"></p></section><div id="error" class="notice" part="error" hidden><span id="error-text"></span><button id="retry"></button></div><div id="status" class="status" part="status" role="status" aria-live="polite" aria-atomic="true"></div></section>`;
        this.labelControls();
        this.$('controls').hidden = !this.controls;
        this.$('topbar').hidden = !this.controls;
        this.addEventListener('pointermove', this.revealControls);
        this.addEventListener('pointerdown', this.revealControls);
        this.addEventListener('focusin', this.revealControls);
        this.addEventListener('focusout', this.revealControls);
        this.$('open-menu').onclick = () => this.settings(true);
        this.$('close-media').onclick = () => { this.run(this.close()); this.$('stage').focus(); };
        this.$('remote').onsubmit = event => { event.preventDefault(); const format = this.$('format').value; this.run(this.open({ url: this.input('url').value, format, ...(format !== 'file' ? { streaming: { live: this.input('live').checked } } : {}) })); this.settings(false); };
        this.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('Files'))
            event.preventDefault(); });
        this.addEventListener('drop', event => { if (!event.dataTransfer?.files.length)
            return; event.preventDefault(); this.run(this.open(event.dataTransfer.files[0])); });
        this.$('play').onclick = () => { if (this.core)
            this.run(this.core.state.playbackIntent === 'play' ? this.pause() : this.play()); };
        this.$('mute').onclick = () => { if (this.core)
            this.run(this.setMuted(!this.core.state.muted)); };
        this.input('volume').onchange = () => this.run(this.setVolume(Number(this.input('volume').value)));
        this.input('timeline').oninput = () => { this.dragging = true; const text = formatTime(Number(this.input('timeline').value)); this.$('time').textContent = text; this.input('timeline').setAttribute('aria-valuetext', text); };
        this.input('timeline').onchange = () => { const value = Number(this.input('timeline').value); this.dragging = false; this.run(this.seek(value)); };
        this.input('timeline').onpointercancel = () => { this.dragging = false; if (this.core)
            this.update(this.core.state); };
        this.$('settings-toggle').onclick = () => this.settings(this.$('settings').hidden);
        this.$('settings-close').onclick = () => this.settings(false);
        this.$('speed').onchange = () => this.run(this.setPlaybackRate(Number(this.$('speed').value)));
        this.$('audio').onchange = () => this.run(this.selectAudioTrack(this.$('audio').value || null));
        this.$('subtitles').onchange = () => this.run(this.selectSubtitleTrack(this.$('subtitles').value || null));
        this.$('fullscreen').onclick = () => this.fullscreen();
        this.$('stage').ondblclick = () => this.fullscreen();
        this.$('open').onclick = () => this.input('file').click();
        this.input('file').onchange = () => { const file = this.input('file').files?.[0]; this.input('file').value = ''; if (file) {
            this.run(this.open(file));
            this.settings(false);
        } };
        this.input('subtitleFile').onchange = () => { const file = this.input('subtitleFile').files?.[0]; this.input('subtitleFile').value = ''; if (file)
            this.run(this.addSubtitle(file)); };
        this.$('retry').onclick = () => { const error = this.lastFailure; this.clearError(); if (error?.code === 'AUTOPLAY_BLOCKED')
            this.run(this.play());
        else if (this.lastSource)
            this.run(this.open(this.lastSource, this.lastOptions)); };
        this.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !this.$('settings').hidden) {
                event.preventDefault();
                this.settings(false);
                return;
            }
            if (!this.$('settings').hidden)
                return;
            const key = shortcut(event), p = this.core;
            if (!key || !p)
                return;
            if (event.repeat && [' ', 'k', 'm', 'f'].includes(key))
                return;
            let action;
            const state = p.state;
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
                if (key === 'c')
                    action = p.subtitleVisible(!state.subtitlesVisible);
                const ranges = state.seekable;
                if (ranges?.length) {
                    const start = ranges[0].start, end = Math.max(start, ranges.at(-1).end - .1);
                    if (key === 'home')
                        action = p.seek(start);
                    if (key === 'end')
                        action = p.seek(end);
                    if (/^[0-9]$/.test(key))
                        action = p.seek(start + (end - start) * Number(key) / 10);
                }
                if (key === ' ' || key === 'k')
                    action = state.playbackIntent === 'play' ? p.pause() : p.play();
                const delta = key === 'arrowleft' ? -5 : key === 'arrowright' ? 5 : key === 'j' ? -10 : key === 'l' ? 10 : 0;
                const window = state.seekable;
                if (delta && window?.length)
                    action = p.seek(Math.max(window[0].start, Math.min(window.at(-1).end - .05, state.currentTime + delta)));
            }
            if (action) {
                event.preventDefault();
                this.run(action);
            }
        });
    }
}
export function definePlayerElement(name = 'webmpv-player') {
    if (typeof customElements === 'undefined')
        throw new PlayerError('INVALID_ARGUMENT', 'Custom element registration requires a browser');
    const existing = customElements.get(name);
    if (existing && existing !== WebmpvPlayerElement)
        throw new PlayerError('INVALID_ARGUMENT', `Custom element ${name} is already registered with another implementation`);
    if (!existing)
        customElements.define(name, WebmpvPlayerElement);
    return WebmpvPlayerElement;
}
