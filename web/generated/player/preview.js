// SPDX-License-Identifier: Apache-2.0
import { previewImageBlob } from '../preview/images.js';
import { initialScrubber, transitionScrubber, scrubberDistance, scrubberPointer } from '../internal/machine/scrubber.js';
import { formatTime } from './interaction.js';
/** UI-only hover owner. No decoder, media seek, or playback controls live here. */
export class ScrubberPreview {
    timeline;
    panel;
    image;
    label;
    api;
    targetLabel;
    control = initialScrubber();
    generators = new Map();
    presentations = new Map();
    ownerIds = new WeakMap();
    imageIds = new WeakMap();
    pendingApi;
    displayedURL;
    transition(command) { const result = transitionScrubber(this.control, command); this.control = result.state; return result; }
    identity(map, value) { let id = map.get(value); if (id === undefined) {
        id = this.transition({ type: 'allocate' }).id;
        map.set(value, id);
    } return id; }
    abort(map, id) { if (id === undefined)
        return; const controller = map.get(id); map.delete(id); controller?.abort(); }
    applyClear(decision) {
        const cleared = this.control;
        const actions = [() => this.abort(this.generators, decision.abortGeneration), () => this.abort(this.presentations, decision.abortPresentation)];
        if (decision.clear) {
            const displayed = this.displayedURL;
            this.displayedURL = undefined;
            actions.push(() => { if (this.control === cleared)
                this.panel.hidden = true; }, () => { if (this.control === cleared)
                this.image.removeAttribute('src'); }, () => displayed?.release());
        }
        // Cleanup operations are independent: a hostile DOM shim must not retain other handles.
        for (const action of actions)
            try {
                action();
            }
            catch { }
    }
    move = (event) => {
        if (event.pointerType === 'touch' || this.timeline.disabled) {
            this.hide();
            return;
        }
        const api = this.api();
        if (!api)
            return;
        const rect = this.timeline.getBoundingClientRect(), parent = this.panel.parentElement.getBoundingClientRect();
        const style = getComputedStyle(this.timeline), scale = rect.width / parseFloat(style.width);
        const thumbWidth = parseFloat(style.getPropertyValue('--timeline-thumb-size')) * scale;
        const pointer = scrubberPointer({ touch: false, disabled: false, left: rect.left, width: rect.width, thumbWidth, step: Number(this.timeline.step), min: Number(this.timeline.min), max: Number(this.timeline.max), x: event.clientX, parentLeft: parent.left, parentWidth: parent.width });
        if (pointer.time === undefined)
            return;
        this.panel.style.left = `${pointer.left}px`;
        if (this.targetLabel)
            this.targetLabel.textContent = formatTime(pointer.time);
        const hover = this.transition({ type: 'hover' });
        if (hover.id === undefined)
            return;
        if (hover.placeholder) {
            this.image.hidden = true;
            this.label.textContent = `${formatTime(pointer.time)} · …`;
            this.panel.hidden = false;
        }
        void this.sample(api, pointer.time, hover.id).catch(() => { });
    };
    constructor(timeline, panel, image, label, api, targetLabel) {
        this.timeline = timeline;
        this.panel = panel;
        this.image = image;
        this.label = label;
        this.api = api;
        this.targetLabel = targetLabel;
        try {
            timeline.addEventListener('pointermove', this.move);
            timeline.addEventListener('pointerleave', this.hide);
            timeline.addEventListener('pointercancel', this.hide);
        }
        catch (error) {
            this.destroy();
            throw error;
        }
    }
    distance(api, generation = false) { return scrubberDistance(api.strategy, Number(this.timeline.max) - Number(this.timeline.min), generation); }
    async sample(api, time, hover) {
        const owner = this.identity(this.ownerIds, api);
        let frame = null;
        try {
            frame = await api.getFrame({ time, width: 240, height: 135, maxDistance: this.distance(api), cacheOnly: true });
        }
        catch { }
        const refine = !!frame && api.strategy?.type === 'adaptive' && Math.abs(frame.time - time) > this.distance(api, true);
        const decision = this.transition({ type: 'cache', hover, target: { owner, time }, hit: !!frame, refine });
        if (!decision.accepted)
            return;
        this.pendingApi = this.control.pending ? api : undefined;
        if (decision.show && frame)
            void this.show(frame);
        void this.next();
    }
    async next() {
        const api = this.pendingApi, decision = this.transition({ type: 'generate' });
        if (!decision.generate || !api)
            return;
        this.pendingApi = undefined;
        const request = decision.generate;
        let controller;
        try {
            controller = new AbortController();
            if (this.control.generation?.id !== request.id) {
                controller.abort();
                return;
            }
            this.generators.set(request.id, controller);
            const signal = controller.signal, distance = this.distance(api, true);
            if (this.control.generation?.id !== request.id || signal.aborted)
                return;
            const frame = await api.getFrame({ time: request.time, width: 240, height: 135, signal, maxDistance: distance });
            const completed = this.transition({ type: 'generated', id: request.id, aborted: signal.aborted, hasFrame: !!frame });
            if (completed.show && frame)
                void this.show(frame);
            else if (completed.clear)
                this.clearImage();
        }
        catch {
            if (this.transition({ type: 'generated', id: request.id, aborted: controller?.signal.aborted ?? false, hasFrame: false }).accepted)
                this.clearImage();
        }
        finally {
            this.generators.delete(request.id);
            if (this.transition({ type: 'generation-finished', id: request.id }).accepted)
                void this.next();
        }
    }
    async show(frame) {
        const image = this.identity(this.imageIds, frame.image), decision = this.transition({ type: 'show', image });
        if (!decision.presentation)
            return;
        const { id, needsImage } = decision.presentation;
        let controller, deadline;
        let signal, cancelDeadline;
        let acquiredURL;
        const current = () => this.control.presentation?.id === id && !signal?.aborted;
        try {
            this.abort(this.presentations, decision.abortPresentation);
            if (!current())
                return;
            controller = new AbortController();
            if (!current()) {
                controller.abort();
                return;
            }
            this.presentations.set(id, controller);
            signal = controller.signal;
            if (!current())
                return;
            deadline = setTimeout(() => this.applyClear(this.transition({ type: 'deadline', id })), 5000);
            if (!current())
                return;
            cancelDeadline = () => { if (deadline !== undefined)
                clearTimeout(deadline); };
            signal.addEventListener('abort', cancelDeadline, { once: true });
            if (!current())
                return;
            if (needsImage) {
                const blob = await previewImageBlob(frame.image, signal);
                if (!current())
                    return;
                const url = URL.createObjectURL(blob);
                let released = false;
                const release = () => { if (!released) {
                    released = true;
                    URL.revokeObjectURL(url);
                } };
                const resource = acquiredURL = { url, release };
                if (!current())
                    return;
                const decoded = this.image.ownerDocument.createElement('img');
                const cancel = () => { try {
                    decoded.removeAttribute('src');
                }
                finally {
                    release();
                } };
                try {
                    if (!current())
                        return;
                    decoded.src = url;
                    if (!current())
                        return;
                    signal.addEventListener('abort', cancel, { once: true });
                    if (!current())
                        return;
                    await decoded.decode();
                    if (!current() || !this.transition({ type: 'decoded', id }).accepted)
                        return;
                    const previous = this.displayedURL;
                    this.displayedURL = resource;
                    try {
                        this.image.src = url;
                        if (current())
                            this.image.hidden = false;
                    }
                    finally {
                        previous?.release();
                    }
                }
                finally {
                    try {
                        signal.removeEventListener('abort', cancel);
                    }
                    catch { }
                    try {
                        decoded.removeAttribute('src');
                    }
                    catch { }
                    if (this.displayedURL !== resource)
                        release();
                }
            }
            if (!current() || !this.transition({ type: 'presented', id }).accepted)
                return;
            this.label.textContent = `${frame.temporalAccuracy === 'approximate' ? '≈ ' : ''}${formatTime(frame.actualTime ?? frame.time)}`;
            if (current())
                this.panel.hidden = false;
        }
        catch {
            this.applyClear(this.transition({ type: 'presentation-failed', id }));
        }
        finally {
            if (acquiredURL && this.displayedURL !== acquiredURL)
                try {
                    acquiredURL.release();
                }
                catch { }
            if (deadline !== undefined)
                try {
                    clearTimeout(deadline);
                }
                catch { }
            if (signal && cancelDeadline)
                try {
                    signal.removeEventListener('abort', cancelDeadline);
                }
                catch { }
            this.presentations.delete(id);
            this.transition({ type: 'presentation-finished', id });
        }
    }
    clearImage() { this.applyClear(this.transition({ type: 'clear' })); }
    hide = () => { this.pendingApi = undefined; this.applyClear(this.transition({ type: 'hide' })); };
    destroy() { this.pendingApi = undefined; this.applyClear(this.transition({ type: 'destroy' })); for (const [name, listener] of [['pointermove', this.move], ['pointerleave', this.hide], ['pointercancel', this.hide]])
        try {
            this.timeline.removeEventListener(name, listener);
        }
        catch { } }
}
