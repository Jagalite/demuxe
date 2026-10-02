// SPDX-License-Identifier: Apache-2.0
import { previewImageBlob } from '../preview/images.js';
import { formatTime } from './interaction.js';
/** UI-only hover owner. No decoder, media seek, or playback controls live here. */
export class ScrubberPreview {
    timeline;
    panel;
    image;
    label;
    api;
    controller;
    presentation;
    presentingImage;
    pending;
    displayedImage;
    hoverSerial = 0;
    serial = 0;
    url;
    move = (event) => {
        if (event.pointerType === 'touch' || this.timeline.disabled) {
            this.hide();
            return;
        }
        const api = this.api();
        if (!api)
            return;
        const rect = this.timeline.getBoundingClientRect(), min = Number(this.timeline.min), max = Number(this.timeline.max);
        if (!rect.width || max <= min)
            return;
        const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), time = min + fraction * (max - min);
        const parent = this.panel.parentElement.getBoundingClientRect();
        const half = Math.min(120, parent.width / 2);
        this.panel.style.left = `${Math.max(half, Math.min(parent.width - half, event.clientX - parent.left))}px`;
        // Sample continuous motion without repeatedly cancelling the decoder before
        // it can produce an image. Only the latest waiting position is retained.
        if (this.panel.hidden) {
            this.image.hidden = true;
            this.label.textContent = `${formatTime(time)} · …`;
            this.panel.hidden = false;
        }
        void this.sample(api, time, ++this.hoverSerial);
    };
    constructor(timeline, panel, image, label, api) {
        this.timeline = timeline;
        this.panel = panel;
        this.image = image;
        this.label = label;
        this.api = api;
        timeline.addEventListener('pointermove', this.move);
        timeline.addEventListener('pointerleave', this.hide);
        timeline.addEventListener('pointercancel', this.hide);
    }
    get maxDistance() {
        const strategy = this.api()?.strategy, span = Number(this.timeline.max) - Number(this.timeline.min);
        if (strategy?.type === 'interval')
            return (strategy.every ?? 5) * (strategy.unit === 'minutes' ? 60 : 1) / 2 + 1;
        if (strategy?.type === 'adaptive' || strategy?.type === 'uniform')
            return span / (2 * (strategy.samples ?? (strategy.type === 'adaptive' ? 24 : 48))) + 1;
        if (strategy)
            return 1;
        return span / 96 + 1;
    }
    distanceForGeneration(api) { return api.strategy?.type === 'adaptive' ? (api.strategy.every ?? 5) / 2 + 1 : this.maxDistance; }
    async sample(api, time, serial) {
        // Cache lookup bypasses an unrelated slow decode without cancelling it on
        // every mouse movement. A hit can be painted as soon as the image is ready.
        try {
            const frame = await api.getFrame({ time, width: 240, height: 135, maxDistance: this.maxDistance, cacheOnly: true });
            if (serial !== this.hoverSerial)
                return;
            if (frame) {
                this.serial++;
                this.pending = undefined;
                void this.show(frame);
                // Show broad coverage immediately, then refine an adaptive hover to
                // the five-second neighborhood instead of leaving a distant sample.
                if (api.strategy?.type === 'adaptive' && Math.abs(frame.time - time) > this.distanceForGeneration(api)) {
                    this.pending = { api, time };
                    void this.next();
                }
                return;
            }
        }
        catch {
            if (serial !== this.hoverSerial)
                return;
        }
        this.pending = { api, time };
        void this.next();
    }
    async next() {
        if (this.controller || !this.pending)
            return;
        const { api, time } = this.pending;
        this.pending = undefined;
        const controller = this.controller = new AbortController(), serial = ++this.serial;
        try {
            const frame = await api.getFrame({ time, width: 240, height: 135, signal: controller.signal, maxDistance: this.distanceForGeneration(api) });
            if (controller.signal.aborted || serial !== this.serial)
                return;
            // Image downloads must not hold the generation lane: the next result can
            // supersede a stalled authored image, including an immediate cache hit.
            if (frame)
                void this.show(frame);
            else
                this.clearImage();
        }
        catch {
            if (serial === this.serial)
                this.clearImage();
        }
        finally {
            if (this.controller === controller) {
                this.controller = undefined;
                void this.next();
            }
        }
    }
    async show(frame) {
        // Repeated cache hits within one bucket share an in-flight image download.
        if (this.presentation && this.presentingImage === frame.image)
            return;
        this.presentation?.abort();
        const controller = this.presentation = new AbortController();
        this.presentingImage = frame.image;
        // Provider completion does not bound the separate image download/decode.
        const deadline = setTimeout(() => { if (this.presentation === controller)
            this.clearImage(); }, 5000);
        const cancelDeadline = () => clearTimeout(deadline);
        controller.signal.addEventListener('abort', cancelDeadline, { once: true });
        try {
            if (frame.image !== this.displayedImage) {
                const blob = await previewImageBlob(frame.image, controller.signal);
                if (controller.signal.aborted)
                    return;
                const url = URL.createObjectURL(blob), image = this.image.ownerDocument.createElement('img');
                image.src = url;
                const cancel = () => { image.removeAttribute('src'); URL.revokeObjectURL(url); };
                controller.signal.addEventListener('abort', cancel, { once: true });
                try {
                    // Keep the previous image painted until its replacement is decoded.
                    await image.decode();
                    if (controller.signal.aborted)
                        return;
                    const previous = this.url;
                    this.url = url;
                    this.image.src = url;
                    this.image.hidden = false;
                    this.displayedImage = frame.image;
                    if (previous)
                        URL.revokeObjectURL(previous);
                }
                finally {
                    controller.signal.removeEventListener('abort', cancel);
                    image.removeAttribute('src');
                    if (this.url !== url)
                        URL.revokeObjectURL(url);
                }
            }
            if (controller.signal.aborted)
                return;
            this.label.textContent = `${frame.temporalAccuracy === 'approximate' ? '≈ ' : ''}${formatTime(frame.actualTime ?? frame.time)}`;
            this.panel.hidden = false;
        }
        catch {
            if (!controller.signal.aborted)
                this.clearImage();
        }
        finally {
            clearTimeout(deadline);
            controller.signal.removeEventListener('abort', cancelDeadline);
            if (this.presentation === controller) {
                this.presentation = undefined;
                this.presentingImage = undefined;
            }
        }
    }
    clearImage() { this.presentation?.abort(); this.presentation = undefined; this.presentingImage = undefined; this.panel.hidden = true; this.image.removeAttribute('src'); if (this.url)
        URL.revokeObjectURL(this.url); this.url = undefined; this.displayedImage = undefined; }
    hide = () => { this.hoverSerial++; this.serial++; this.pending = undefined; this.controller?.abort(); this.controller = undefined; this.clearImage(); };
    destroy() { this.hide(); this.timeline.removeEventListener('pointermove', this.move); this.timeline.removeEventListener('pointerleave', this.hide); this.timeline.removeEventListener('pointercancel', this.hide); }
}
