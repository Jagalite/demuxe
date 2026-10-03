// SPDX-License-Identifier: Apache-2.0
import { PlayerError } from './errors.js';
import { createShakaRuntime, joinShakaRuntime, acquireShakaRuntime, releaseShakaRuntimeAcquisition, leaveShakaRuntime, finishShakaRuntime, shakaRuntimeLoad, shakaRuntimeDeadline } from './machine/shaka-runtime.js';
const aborted = () => new PlayerError('ABORTED', 'Shaka runtime loading cancelled');
/** Shared runtime policy has one module lifetime; executable code, promises,
 * script nodes, fetch controllers and object URLs stay in this adapter. */
export class ShakaRuntimeLoader {
    state = createShakaRuntime();
    handles = new Map();
    load(base, signal) {
        if (signal.aborted)
            return Promise.reject(aborted());
        const url = new URL('web/vendor/shaka-player.js', base).href, now = performance.now(), joined = joinShakaRuntime(this.state, url, now);
        this.state = joined.state;
        if (!joined.accepted)
            return Promise.reject(new PlayerError('ASSET_LOAD_FAILED', joined.error));
        const { load, consumer, start } = joined;
        let handle = this.handles.get(load);
        if (start) {
            let resolve, reject;
            const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
            void promise.catch(() => { });
            handle = { promise, resolve, reject };
            this.handles.set(load, handle);
        }
        const owned = handle;
        const result = new Promise((resolve, reject) => {
            const release = () => {
                const outcome = leaveShakaRuntime(this.state, load, consumer);
                this.state = outcome.state;
                if (!outcome.accepted)
                    return false;
                try {
                    signal.removeEventListener('abort', cancel);
                }
                catch { }
                if (outcome.cancel)
                    this.cancel(load, owned);
                return true;
            };
            const cancel = () => { if (release())
                reject(aborted()); };
            try {
                signal.addEventListener('abort', cancel, { once: true });
            }
            catch (error) {
                release();
                reject(error);
            }
            if (signal.aborted)
                cancel();
            owned.promise.then(runtime => { if (release())
                resolve(runtime); }, error => { if (release())
                reject(error); });
        });
        // Install both the shared promise and its first consumer before any fetch,
        // timer or DOM callback can synchronously create another consumer or retire it.
        if (start && this.current(load))
            this.start(load, owned, url);
        return result;
    }
    current(id) { return shakaRuntimeLoad(this.state, id)?.phase === 'pending'; }
    cleanup(handle, abort) {
        const timer = handle.timer, script = handle.script, blob = handle.blob, controller = handle.controller;
        handle.timer = undefined;
        handle.timerToken = undefined;
        handle.script = undefined;
        handle.blob = undefined;
        const tasks = [() => { if (timer !== undefined)
                clearTimeout(timer); }, () => { if (script)
                script.onload = null; }, () => { if (script)
                script.onerror = null; }, () => { script?.remove(); }, () => { if (blob)
                URL.revokeObjectURL(blob); }, () => { if (abort)
                controller?.abort(); }];
        for (const task of tasks)
            try {
                task();
            }
            catch { /* Finish every owned release before settling consumers. */ }
    }
    cancel(id, handle) { if (!shakaRuntimeLoad(this.state, id))
        this.handles.delete(id); this.cleanup(handle, true); handle.reject(aborted()); }
    finish(id, handle, error, runtime) {
        const result = finishShakaRuntime(this.state, id, !error);
        this.state = result.state;
        if (!result.accepted)
            return;
        if (error && !shakaRuntimeLoad(this.state, id)?.acquiring)
            this.handles.delete(id);
        this.cleanup(handle, !!error);
        if (error)
            handle.reject(error);
        else
            handle.resolve(runtime);
    }
    deadline(id, handle, delay) {
        const token = {};
        handle.timerToken = token;
        try {
            const timer = setTimeout(() => {
                if (handle.timerToken !== token)
                    return;
                handle.timer = undefined;
                handle.timerToken = undefined;
                const now = performance.now(), next = shakaRuntimeDeadline(this.state, id, now);
                if (!next.current)
                    return;
                if (next.remaining > 0)
                    this.deadline(id, handle, next.remaining);
                else
                    this.finish(id, handle, new PlayerError('ASSET_LOAD_FAILED', 'Shaka runtime loading timed out'));
            }, delay);
            if (handle.timerToken === token)
                handle.timer = timer;
            else
                clearTimeout(timer);
        }
        catch {
            this.finish(id, handle, new PlayerError('ASSET_LOAD_FAILED', 'Shaka runtime loading failed'));
        }
    }
    start(id, handle, url) {
        try {
            handle.controller = new AbortController();
            if (!this.current(id)) {
                handle.controller.abort();
                return;
            }
            this.deadline(id, handle, 15000);
        }
        catch {
            this.finish(id, handle, new PlayerError('ASSET_LOAD_FAILED', 'Shaka runtime loading failed'));
            return;
        }
        if (!this.current(id))
            return;
        this.state = acquireShakaRuntime(this.state, id);
        void (async () => {
            const response = await fetch(url, { signal: handle.controller.signal, credentials: 'same-origin', redirect: 'error' });
            if (!this.current(id)) {
                try {
                    await response.body?.cancel();
                }
                catch { }
                return;
            }
            if (!response.ok)
                throw Error('Shaka asset response failed');
            const code = await response.text();
            if (!this.current(id))
                return;
            const blob = URL.createObjectURL(new Blob(['if(document.currentScript?.isConnected){\n', code, '\n}'], { type: 'text/javascript' }));
            if (!this.current(id)) {
                try {
                    URL.revokeObjectURL(blob);
                }
                catch { }
                return;
            }
            handle.blob = blob;
            const script = document.createElement('script');
            if (!this.current(id)) {
                try {
                    script.remove();
                }
                catch { }
                return;
            }
            handle.script = script;
            script.src = blob;
            script.async = true;
            script.onload = () => { if (!this.current(id))
                return; const runtime = globalThis.shaka; this.finish(id, handle, runtime?.Player ? undefined : new PlayerError('ASSET_LOAD_FAILED', 'Shaka runtime is unavailable'), runtime); };
            script.onerror = () => this.finish(id, handle, new PlayerError('ASSET_LOAD_FAILED', 'Shaka runtime execution failed'));
            if (this.current(id)) {
                document.head.append(script);
                if (!this.current(id))
                    try {
                        script.remove();
                    }
                    catch { }
            }
        })().catch(() => this.finish(id, handle, new PlayerError('ASSET_LOAD_FAILED', 'Shaka runtime loading failed'))).finally(() => { this.state = releaseShakaRuntimeAcquisition(this.state, id); if (shakaRuntimeLoad(this.state, id)?.phase !== 'ready' && !this.current(id))
            this.handles.delete(id); });
    }
}
const shared = new ShakaRuntimeLoader();
export function runtimeAt(base, signal) { return shared.load(base, signal); }
