// SPDX-License-Identifier: Apache-2.0
import { formatTime } from './interaction.js';
import { initialAdvancedControls, transitionAdvancedControls, advancedControlsBlocked, advancedFeatureDisabled, advancedShouldSync, advancedControlValue } from '../internal/machine/advanced-controls.js';
export const advancedLabels = Object.freeze({
    videoSettings: 'Video and filters', audioSettings: 'Audio adjustments', subtitleSettings: 'Subtitle adjustments',
    navigationSettings: 'Navigation and repeat', streamingSettings: 'Streaming', presentationSettings: 'Playback and display',
    videoFilter: 'Video filter chain', audioFilter: 'Audio filter chain', filterPreset: 'Video effect', customFilter: 'Custom',
    noEffect: 'None', mirror: 'Mirror horizontally', flip: 'Flip vertically', grayscale: 'Grayscale', negative: 'Negative',
    applySettings: 'Apply', resetSettings: 'Reset', filterHelp: 'Applying filters may switch playback mode and briefly reload at the current position. Empty chains disable filters.',
    toneMapping: 'HDR to SDR', gain: 'Audio gain (0–1)', audioDelay: 'Audio delay (seconds)', subtitleDelay: 'Subtitle delay (seconds)',
    subtitlesVisible: 'Show subtitles', subtitleSize: 'Font size (8–150)', subtitleColor: 'Text color (#RRGGBB or #RRGGBBAA)', subtitleBorder: 'Outline (0–10)', subtitleFont: 'Font family',
    subtitleStyleHelp: 'Style overrides apply to plain-text subtitles. Leave fields blank to use defaults.', fontFile: 'Add subtitle font (TTF/OTF, up to 8 MiB)',
    chapter: 'Chapter', chooseChapter: 'Choose a chapter', repeat: 'Repeat', repeatOff: 'Off', repeatAll: 'Whole source / playback range', repeatRange: 'A–B loop',
    rangeStart: 'Start (seconds)', rangeEnd: 'End (seconds)', markStart: 'Use current time as start', markEnd: 'Use current time as end',
    applyLoop: 'Loop A–B', applyRange: 'Limit playback to range', clearRange: 'Clear playback range',
    previousFrame: 'Previous frame', nextFrame: 'Next frame', saveSnapshot: 'Save frame (PNG)', snapshotSubtitles: 'Include subtitles in frame',
    streamQuality: 'Requested stream quality', autoQuality: 'Automatic', maxHeight: 'Maximum height (auto)', maxBandwidth: 'Maximum bitrate (bits/s, auto)', goLive: 'Go to live edge',
    playbackMode: 'Playback mode', autoMode: 'Automatic', nativeMode: 'Native', hybridMode: 'Hybrid', softwareMode: 'Software',
    modeHelp: 'Automatic selects a compatible route. Forced modes can reject sources or features.',
    pictureInPicture: 'Picture in picture', exitPictureInPicture: 'Exit picture in picture', mediaSession: 'System media controls',
    chooseOutput: 'Choose audio output', defaultOutput: 'Use default audio output', outputUnavailable: 'This browser does not expose an audio output picker.',
    rangeInactive: 'No playback range', loopInactive: 'Repeat is off', openForSettings: 'Open media to use this control.',
});
const label = (key) => `<span data-advanced-label="${key}"></span>`;
const button = (id, key) => `<button type="button" id="advanced-${id}" data-advanced-label="${key}"></button>`;
const input = (id, key, attrs = 'type="text"') => `<label>${label(key)}<input id="advanced-${id}" ${attrs}></label>`;
const option = (value, key) => `<option value="${value}" data-advanced-label="${key}"></option>`;
const select = (id, key, options) => `<label>${label(key)}<select id="advanced-${id}">${options}</select></label>`;
const check = (id, key) => `<label class="check"><input id="advanced-${id}" type="checkbox">${label(key)}</label>`;
const number = (id, key, min, max, step = 'any') => input(id, key, `type="number" min="${min}" ${max === undefined ? '' : `max="${max}"`} step="${step}"`);
const group = (key, body) => `<details class="advanced-group"><summary data-advanced-label="${key}"></summary>${body}</details>`;
const feature = (name, body) => `<div data-feature="${name}">${body}<p class="advanced-hint" data-feature-hint="${name}"></p></div>`;
const form = (id, body) => `<form id="advanced-${id}">${body}<button type="submit" data-advanced-label="applySettings"></button></form>`;
export const advancedSettings = () => `<div id="advanced-settings">
${group('videoSettings', feature('videoFilters', form('video-form', select('preset', 'filterPreset', option('', 'noEffect') + option('hflip', 'mirror') + option('vflip', 'flip') + option('lavfi=[format=gray]', 'grayscale') + option('negate', 'negative') + option('custom', 'customFilter')) +
    input('vf', 'videoFilter', 'type="text" maxlength="4096" spellcheck="false"') + button('clear-vf', 'resetSettings'))) +
    `<p class="advanced-hint" data-advanced-label="filterHelp"></p>` + feature('videoFilters', check('tone', 'toneMapping')))}
${group('audioSettings', feature('audioFilters', form('audio-form', input('af', 'audioFilter', 'type="text" maxlength="4096" spellcheck="false"') + button('clear-af', 'resetSettings'))) +
    feature('audioGain', number('gain', 'gain', 0, 1, '.05')) + feature('audioDelay', number('audio-delay', 'audioDelay', -60, 60, '.1')) +
    feature('audioOutputDevice', `<div class="advanced-actions">${button('output', 'chooseOutput')}${button('output-default', 'defaultOutput')}</div><p id="advanced-output-hint" class="advanced-hint"></p>`))}
${group('subtitleSettings', check('sub-visible', 'subtitlesVisible') + feature('subtitleDelay', number('sub-delay', 'subtitleDelay', -60, 60, '.1')) +
    feature('subtitleStyle', form('style-form', `<p class="advanced-hint" data-advanced-label="subtitleStyleHelp"></p>` +
        number('sub-size', 'subtitleSize', 8, 150) + input('sub-color', 'subtitleColor', 'type="text" pattern="#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?" maxlength="9"') +
        number('sub-border', 'subtitleBorder', 0, 10) + input('sub-font', 'subtitleFont', 'type="text" maxlength="128"') + button('style-reset', 'resetSettings'))) +
    feature('customFonts', input('font-file', 'fontFile', 'type="file" accept=".ttf,.otf"')))}
${group('navigationSettings', feature('seek', select('chapter', 'chapter', '')) +
    feature('loop', select('loop', 'repeat', option('off', 'repeatOff') + option('all', 'repeatAll') + option('range', 'repeatRange'))) +
    `<p id="advanced-loop-state" class="advanced-hint"></p>` +
    feature('playbackRange', `<div id="advanced-range-fields">${number('start', 'rangeStart', 0)}${number('end', 'rangeEnd', 0)}<div class="advanced-actions">${button('mark-start', 'markStart')}${button('mark-end', 'markEnd')}${button('loop-range', 'applyLoop')}${button('range', 'applyRange')}${button('clear-range', 'clearRange')}</div></div>`) +
    `<p id="advanced-range-state" class="advanced-hint"></p>` +
    feature('frameStep', `<div class="advanced-actions">${button('frame-back', 'previousFrame')}${button('frame-forward', 'nextFrame')}</div>`))}
${group('streamingSettings', feature('quality', select('quality', 'streamQuality', '') + form('quality-form', number('max-height', 'maxHeight', 1, undefined, '1') + number('max-bandwidth', 'maxBandwidth', 1, undefined, '1'))) + feature('liveNavigation', button('live', 'goLive')))}
${group('presentationSettings', select('mode', 'playbackMode', option('auto', 'autoMode') + option('native', 'nativeMode') + option('hybrid', 'hybridMode') + option('software', 'softwareMode')) +
    `<p class="advanced-hint" data-advanced-label="modeHelp"></p>` +
    feature('snapshot', check('snapshot-subs', 'snapshotSubtitles') + button('snapshot', 'saveSnapshot')) +
    `<div class="advanced-actions">${button('pip', 'pictureInPicture')}${button('pip-exit', 'exitPictureInPicture')}</div>` + check('media-session', 'mediaSession'))}
</div>`;
export const advancedSettingsStyles = `
.advanced-group{border-top:1px solid color-mix(in srgb,var(--demuxe-foreground) 12%,transparent);margin-top:10px;padding-top:4px}
.advanced-group summary{cursor:pointer;padding:14px 0;font-weight:550;line-height:1.4}
.advanced-group input:not([type=checkbox]){width:100%;min-width:0;box-sizing:border-box;padding:9px;border:1px solid color-mix(in srgb,var(--demuxe-foreground) 16%,transparent);border-radius:5px;background:var(--demuxe-control-background);color:var(--demuxe-foreground)}
.advanced-group select{background:var(--demuxe-control-background);color:var(--demuxe-foreground)}
.advanced-group .advanced-hint{font-size:11px;line-height:1.5;color:var(--demuxe-muted-foreground);overflow-wrap:anywhere;margin:8px 0}
.advanced-hint:empty{display:none}.advanced-actions{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.advanced-group button{white-space:normal;min-height:36px;max-width:100%;padding:8px 10px;text-align:start}
.settings .advanced-group form{border:0;margin:0;padding:0}.advanced-group form>button{margin:0 6px 8px 0}
.advanced-group :disabled{opacity:.5}.advanced-group summary:focus-visible{outline:2px solid var(--demuxe-foreground);outline-offset:2px}
`;
/** Persistent controls use the same public API as an embedding application. */
export class AdvancedSettings {
    root;
    getPlayer;
    run;
    controlState = initialAdvancedControls(advancedLabels);
    owners = new WeakMap();
    get operation() { return this.controlState.operation; }
    get labels() { return this.controlState.labels; }
    transition(command) { const decision = transitionAdvancedControls(this.controlState, command); this.controlState = decision.state; return decision; }
    ownerId(player) { if (!player)
        return null; let id = this.owners.get(player); if (id === undefined) {
        id = this.transition({ type: 'allocate-owner' }).ownerId;
        this.owners.set(player, id);
    } return id; }
    dirty(field) { const control = this.root.getElementById(field); this.transition({ type: 'dirty', field, value: control?.value ?? '' }); }
    clean(fields, operation) { this.reconcile(); this.transition({ type: 'clean', fields: fields.map(field => `advanced-${field}`), operation }); }
    constructor(root, getPlayer, run) {
        this.root = root;
        this.getPlayer = getPlayer;
        this.run = run;
        for (const node of Array.from(this.el('advanced-settings').querySelectorAll('input,select,button')))
            node.disabled = true;
        this.el('advanced-settings').addEventListener('input', event => {
            const target = event.target;
            if (target.id)
                this.dirty(target.id);
        });
        this.el('advanced-settings').addEventListener('change', event => { const target = event.target; if (target.id)
            this.dirty(target.id); }, true);
        const change = (id, action) => this.control(id).addEventListener('change', () => this.act(action));
        const click = (id, action) => this.control(id).addEventListener('click', () => this.act(action));
        const submit = (id, action, fields) => {
            this.el(`advanced-${id}`).addEventListener('submit', event => { event.preventDefault(); this.act(async (p) => { const operation = this.operation; await action(p); this.clean(fields, operation); }); });
        };
        this.control('preset').addEventListener('change', () => {
            if (this.value('preset') === 'custom')
                return;
            this.control('vf').value = this.value('preset');
            this.dirty('advanced-vf');
        });
        this.control('vf').addEventListener('input', () => { this.control('preset').value = 'custom'; });
        submit('video-form', p => p.setVideoFilters(this.value('vf')), ['vf', 'preset']);
        submit('audio-form', p => p.setAudioFilters(this.value('af')), ['af']);
        for (const [id, key] of [['clear-vf', 'vf'], ['clear-af', 'af']])
            click(id, async (p) => {
                const operation = this.operation;
                await (key === 'vf' ? p.setVideoFilters('') : p.setAudioFilters(''));
                this.clean([key, 'preset'], operation);
            });
        change('tone', p => p.setToneMapping(this.checked('tone') ? 'hdr-to-sdr' : 'off'));
        change('mode', p => this.value('mode') === 'auto' ? p.setAutomaticSelection(true) : p.setMode(this.value('mode')));
        change('gain', p => p.setAudioGain(this.numeric('gain')));
        change('audio-delay', p => p.setAudioDelay(this.numeric('audio-delay')));
        change('sub-delay', p => p.setSubtitleDelay(this.numeric('sub-delay')));
        change('sub-visible', p => p.subtitleVisible(this.checked('sub-visible')));
        const styleFields = ['sub-size', 'sub-color', 'sub-border', 'sub-font'];
        submit('style-form', p => {
            const style = {};
            if (this.value('sub-size'))
                style.fontSize = this.numeric('sub-size');
            if (this.value('sub-border'))
                style.borderSize = this.numeric('sub-border');
            if (this.value('sub-color'))
                style.color = this.value('sub-color');
            if (this.value('sub-font'))
                style.fontFamily = this.value('sub-font');
            return p.setSubtitleStyle(style);
        }, styleFields);
        click('style-reset', async (p) => { const operation = this.operation; await p.setSubtitleStyle({}); this.clean(styleFields, operation); });
        change('font-file', async (p) => { const input = this.control('font-file'); const file = input.files?.[0], operation = this.operation; try {
            if (file)
                await p.addFont(file);
        }
        finally {
            if (operation === this.operation)
                input.value = '';
        } });
        change('chapter', p => this.value('chapter') ? p.seekChapter(this.value('chapter')) : undefined);
        change('loop', p => this.value('loop') === 'range' ? p.setLoop(this.range()) : p.setLoop(this.value('loop') === 'all'));
        for (const [id, field] of [['mark-start', 'start'], ['mark-end', 'end']])
            click(id, p => {
                this.control(field).value = String(Math.round(p.state.currentTime * 1000) / 1000);
                this.dirty(`advanced-${field}`);
            });
        click('loop-range', p => p.setLoop(this.range()));
        click('range', p => p.setPlaybackRange(this.range()));
        click('clear-range', p => p.setPlaybackRange(null));
        click('frame-back', p => p.stepFrame(-1));
        click('frame-forward', p => p.stepFrame(1));
        change('quality', p => p.setQuality(this.value('quality') === 'auto' ? { mode: 'auto' } : { mode: 'manual', id: this.value('quality') }));
        submit('quality-form', p => p.setQuality({ mode: 'auto', maxHeight: this.value('max-height') ? this.numeric('max-height') : undefined, maxBandwidth: this.value('max-bandwidth') ? this.numeric('max-bandwidth') : undefined }), ['max-height', 'max-bandwidth']);
        click('live', p => p.seekToLive());
        click('snapshot', async (p) => {
            const source = p.state.sourceId;
            const result = await p.snapshot({ includeSubtitles: this.checked('snapshot-subs') });
            if (this.getPlayer() !== p || p.isDestroyed || p.state.sourceId !== source || !this.root.host.isConnected)
                return;
            const url = URL.createObjectURL(result.blob), link = this.root.ownerDocument.createElement('a');
            link.href = url;
            link.download = `frame-${result.mediaTime.toFixed(3)}.png`;
            this.el('advanced-settings').append(link);
            try {
                link.click();
            }
            finally {
                link.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
        });
        click('pip', p => p.presentation.requestPictureInPicture('documentPictureInPicture' in globalThis ? 'document' : 'video'));
        click('pip-exit', p => p.presentation.exitPictureInPicture());
        change('media-session', p => p.presentation.setMediaSessionEnabled(this.checked('media-session')));
        click('output', async (p) => {
            const media = navigator.mediaDevices;
            if (!media?.selectAudioOutput)
                throw new Error(this.labels.outputUnavailable);
            const source = p.state.sourceId, device = await media.selectAudioOutput();
            if (this.getPlayer() === p && !p.isDestroyed && p.state.sourceId === source && this.root.host.isConnected)
                await p.setAudioOutputDevice(device.deviceId);
        });
        click('output-default', p => p.setAudioOutputDevice(''));
    }
    el(id) { return this.root.getElementById(id); }
    control(id) { return this.el(`advanced-${id}`); }
    value(id) { const control = this.control(id); return advancedControlValue(this.controlState, control.id, control.value).trim(); }
    checked(id) { return this.control(id).checked; }
    numeric(id) { const input = this.control(id); if (!input.value || !input.checkValidity())
        throw new Error(`Invalid value: ${input.closest('label')?.textContent?.trim() ?? id}`); return input.valueAsNumber; }
    range() { return { start: this.numeric('start'), end: this.numeric('end') }; }
    reconcileOwner() {
        const owner = this.getPlayer(), source = owner?.state.sourceId ?? null;
        return this.transition({ type: 'reconcile', ownerId: this.ownerId(owner), sourceId: source });
    }
    reconcile() { this.reconcileOwner(); }
    act(action) {
        this.reconcile();
        const player = this.getPlayer(), decision = this.transition({ type: 'start', ownerId: this.ownerId(player), sourceId: player?.state.sourceId ?? null, destroyed: !!player?.isDestroyed, connected: this.root.host.isConnected, pending: !!player?.state.pendingOperation });
        if (!player || !decision.accepted)
            return;
        const focused = this.root.activeElement;
        const operation = decision.operation;
        // Invoke immediately to preserve browser user activation for PiP/output pickers.
        this.run((async () => {
            try {
                await action(player);
            }
            finally {
                const reconciled = this.reconcileOwner();
                if (this.transition({ type: 'settled', operation }).accepted) {
                    if (this.getPlayer() === player) {
                        this.update(player.state, true);
                        if (focused?.isConnected && !focused.matches(':disabled') && !this.el('settings').hidden && !this.root.activeElement && this.root.ownerDocument.hasFocus() && [this.root.host, this.root.ownerDocument.body, null].includes(this.root.ownerDocument.activeElement))
                            focused.focus({ preventScroll: true });
                    }
                }
                else if (reconciled.changed && !this.controlState.busy) {
                    // Completion may be the first observation of source replacement.
                    // Refresh its controls without restoring the retired owner's focus.
                    const current = this.getPlayer();
                    if (current)
                        this.update(current.state);
                }
            }
        })());
        this.update(player.state);
    }
    label(labels) {
        this.transition({ type: 'labels', labels });
        for (const node of Array.from(this.el('advanced-settings').querySelectorAll('[data-advanced-label]')))
            node.textContent = labels[node.dataset.advancedLabel];
    }
    update(state, force = false) {
        const player = this.getPlayer();
        if (!player)
            return;
        this.reconcile();
        const blocked = advancedControlsBlocked(this.controlState, { destroyed: player.isDestroyed, pending: !!state.pendingOperation, sourceId: state.sourceId });
        for (const node of Array.from(this.el('advanced-settings').querySelectorAll('input,select,button')))
            node.disabled = blocked;
        for (const group of Array.from(this.el('advanced-settings').querySelectorAll('[data-feature]'))) {
            const name = group.dataset.feature, cap = state.capabilities.features[name];
            // Unknown readback/output permissions can only be resolved by attempting the action.
            const disabled = advancedFeatureDisabled(blocked, name, cap);
            const hint = state.sourceId === null ? this.labels.openForSettings : cap.availability === 'available' ? '' : cap.reason;
            const help = group.querySelector('[data-feature-hint]');
            help.textContent = hint;
            if (!help.id)
                help.id = `advanced-help-${name}-${Array.from(group.parentElement.children).indexOf(group)}`;
            for (const control of Array.from(group.querySelectorAll('input,select,button'))) {
                control.disabled = disabled;
                control.setAttribute('aria-describedby', help.id);
            }
        }
        const sync = (id, value, draft = false) => {
            const control = this.control(id);
            if (!advancedShouldSync(this.controlState, control.id, draft, this.root.activeElement === control, force))
                return;
            if (typeof value === 'boolean')
                control.checked = value;
            else
                control.value = String(value);
        };
        const d = player.diagnostics;
        sync('mode', state.automaticSelection ? 'auto' : state.activeMode ?? 'auto');
        sync('vf', d.videoFilters, true);
        sync('af', d.audioFilters, true);
        if (!this.controlState.dirty.includes('advanced-vf') && !this.controlState.dirty.includes('advanced-preset'))
            sync('preset', ['', 'hflip', 'vflip', 'lavfi=[format=gray]', 'negate'].includes(d.videoFilters) ? d.videoFilters : 'custom');
        sync('tone', d.toneMapping === 'hdr-to-sdr');
        sync('gain', d.audioGain ?? 1);
        sync('audio-delay', state.timing.audioDelay);
        sync('sub-delay', state.timing.subtitleDelay);
        sync('sub-visible', state.subtitlesVisible);
        const style = state.timing.subtitleStyle;
        sync('sub-size', style.fontSize ?? '', true);
        sync('sub-color', style.color ?? '', true);
        sync('sub-border', style.borderSize ?? '', true);
        sync('sub-font', style.fontFamily ?? '', true);
        sync('loop', typeof state.loop === 'object' ? 'range' : state.loop ? 'all' : 'off');
        const range = state.playbackRange ?? (typeof state.loop === 'object' ? state.loop : null);
        sync('start', range?.start ?? 0, true);
        sync('end', range?.end ?? state.duration ?? '', true);
        this.el('advanced-loop-state').textContent = typeof state.loop === 'object' ? `${formatTime(state.loop.start)} – ${formatTime(state.loop.end)}` : state.loop ? this.labels.repeatAll : this.labels.loopInactive;
        this.el('advanced-range-state').textContent = state.playbackRange ? `${formatTime(state.playbackRange.start)} – ${formatTime(state.playbackRange.end)}` : this.labels.rangeInactive;
        const chapters = state.mediaInfo.chapters ?? [];
        this.options('chapter', [['', this.labels.chooseChapter], ...chapters.map(c => [c.id, `${formatTime(c.start)} · ${c.title ?? c.id}`])]);
        sync('chapter', '');
        this.control('chapter').disabled ||= chapters.length === 0;
        const streaming = state.streaming;
        this.options('quality', [['auto', this.labels.autoQuality], ...(streaming?.qualities ?? []).map(q => [q.id, [q.height ? `${q.height}p` : q.id, q.bandwidth ? `${Math.round(q.bandwidth / 1000)} kb/s` : '', q.videoCodec ?? q.audioCodec ?? ''].filter(Boolean).join(' · ')])]);
        sync('quality', streaming?.requested.mode === 'manual' ? streaming.requested.id : 'auto');
        sync('max-height', streaming?.requested.mode === 'auto' ? streaming.requested.maxHeight ?? '' : '', true);
        sync('max-bandwidth', streaming?.requested.mode === 'auto' ? streaming.requested.maxBandwidth ?? '' : '', true);
        const video = !!state.mediaInfo.video;
        for (const id of ['frame-back', 'frame-forward', 'snapshot'])
            this.control(id).disabled ||= !video;
        this.control('frame-back').disabled ||= state.currentTime <= 0;
        if (state.playbackRange)
            this.control('clear-range').disabled = blocked;
        if (state.loop)
            this.control('loop').disabled = blocked;
        const locked = state.trackPolicy.subtitles?.locked || state.trackPolicy.subtitles?.allowOff === false;
        this.control('sub-visible').disabled ||= !!locked || state.subtitleTracks.length === 0;
        const picker = !!navigator.mediaDevices?.selectAudioOutput;
        this.control('output').disabled ||= !picker;
        this.el('advanced-output-hint').textContent = picker ? '' : this.labels.outputUnavailable;
        const surface = player.surface;
        this.control('pip').disabled ||= !video || !('documentPictureInPicture' in globalThis) && (!(surface instanceof HTMLVideoElement) || !surface.requestPictureInPicture || surface.disablePictureInPicture || state.subtitlesVisible && !!state.mediaInfo.subtitle);
        this.control('pip-exit').disabled ||= !player.presentation.state.pictureInPicture;
        this.control('media-session').disabled ||= !('mediaSession' in navigator);
        sync('media-session', player.presentation.state.mediaSession);
    }
    options(id, values) {
        const signature = JSON.stringify(values);
        if (!this.transition({ type: 'signature', field: id, value: signature }).changed)
            return;
        const select = this.control(id);
        select.replaceChildren();
        for (const [value, label] of values) {
            const option = this.root.ownerDocument.createElement('option');
            option.value = value;
            option.textContent = label;
            select.append(option);
        }
    }
}
