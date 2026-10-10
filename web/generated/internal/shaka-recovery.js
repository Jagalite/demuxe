// SPDX-License-Identifier: Apache-2.0
import { initialShakaRecovery, transitionShakaRecovery, shakaRecoverySnapshot } from './machine/shaka-recovery.js';
/** Observe one source's pinned Shaka networking engine without replacing its
 * scheduler, promises or abort operations. Only an actual retry event enters
 * recovery; settlement of the whole logical request leaves it, even in backoff.
 * URL/header/error payloads never cross the public recovery boundary. */
export class ShakaRecovery {
    player;
    network;
    timeoutCode;
    changed;
    control = initialShakaRecovery();
    ids = new WeakMap();
    failures = [];
    original;
    forward;
    constructor(player, network, timeoutCode, changed) {
        this.player = player;
        this.network = network;
        this.timeoutCode = timeoutCode;
        this.changed = changed;
        this.original = network.request;
        this.forward = (...args) => {
            if (!this.control.active)
                return this.original.apply(network, args);
            this.move({ type: 'begin' });
            const id = this.control.serial, request = args[1];
            this.ids.set(request, id);
            const finish = () => { if (this.ids.get(request) === id)
                this.ids.delete(request); this.move({ type: 'settle', id }); };
            try {
                const operation = this.original.apply(network, args);
                // Keep the exact PendingRequest (including abort and progress accounting).
                void operation.promise.then(finish, finish);
                return operation;
            }
            catch (error) {
                finish();
                throw error;
            }
        };
        try {
            network.request = this.forward;
            player.addEventListener('downloadfailed', this.failed);
            network.addEventListener('retry', this.retry);
        }
        catch (error) {
            this.destroy();
            throw error;
        }
    }
    move(command) {
        const before = this.control.retrying.length;
        this.control = transitionShakaRecovery(this.control, command);
        if (before !== this.control.retrying.length)
            try {
                this.changed();
            }
            catch { }
    }
    failed = (event) => {
        if (!this.control.active)
            return;
        const e = event;
        const id = this.ids.get(e.request);
        if (id === undefined || !this.control.requests.includes(id))
            return;
        const failure = { id, error: e.error, aborted: e.aborted === true };
        this.failures.push(failure);
        // In Shaka 5.2.11 downloadfailed and retry are dispatched in the same failure
        // handler. Do not let an unrelated later retry reuse an old failed download.
        queueMicrotask(() => { this.failures = this.failures.filter(value => value !== failure); });
    };
    retry = (event) => {
        const error = event.error;
        const code = error?.code;
        // Connection/stall timeouts replace the plugin's error after downloadfailed.
        const failure = this.failures.slice().reverse().find(value => value.error === error || value.aborted && code === this.timeoutCode);
        if (!failure)
            return;
        this.failures = this.failures.filter(value => value !== failure);
        // Later listeners may cancel the retry. Publish only after dispatch completes.
        queueMicrotask(() => { if (!event.defaultPrevented)
            this.move({ type: 'retry', id: failure.id }); });
    };
    get snapshot() { return shakaRecoverySnapshot(this.control); }
    destroy() {
        if (!this.control.active)
            return;
        // Revoke authority first. Pending promise handlers and queued events go inert.
        this.control = transitionShakaRecovery(this.control, { type: 'retire' });
        this.failures = [];
        this.ids = new WeakMap();
        for (const release of [() => this.player.removeEventListener('downloadfailed', this.failed), () => this.network.removeEventListener('retry', this.retry), () => { if (this.network.request === this.forward)
                this.network.request = this.original; }])
            try {
                release();
            }
            catch { }
    }
}
