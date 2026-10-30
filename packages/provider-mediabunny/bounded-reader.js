// SPDX-License-Identifier: Apache-2.0
/** Source lease shared by inspection and preview. Never owns transport policy. */
export function createBoundedReader(source, {signal, maxBytes = 512 * 1024, maxReads = 32, timeoutMs = 10000} = {}) {
  if (!Number.isSafeInteger(source.size) || source.size < 0 || typeof source.read !== 'function') throw new TypeError('Invalid byte source');
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || !Number.isSafeInteger(maxReads) || maxReads < 1 || !Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) throw new TypeError('Invalid read budget');
  const controller = new AbortController();
  let bytes = 0, reads = 0, failure, failed = false, closed = false, closing;
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', abort, {once: true});
  if (signal?.aborted) abort();
  const timer = setTimeout(() => controller.abort(new DOMException('Source deadline exceeded', 'TimeoutError')), timeoutMs);
  const check = () => {
    if (closed) throw new DOMException('Source lease closed', 'AbortError');
    controller.signal.throwIfAborted();
    if (failed) throw failure;
  };
  const bounded = work => new Promise((resolve, reject) => {
    const cancel = () => { controller.signal.removeEventListener('abort', cancel); reject(controller.signal.reason); };
    controller.signal.addEventListener('abort', cancel, {once: true});
    if (controller.signal.aborted) cancel();
    work.then(resolve, reject).finally(() => controller.signal.removeEventListener('abort', cancel));
  });
  return {
    size: source.size,
    signal: controller.signal,
    get bytesRead() { return bytes; },
    get reads() { return reads; },
    get failure() { return failure; },
    get hasFailure() { return failed; },
    check,
    async run(work, discard) {
      check();
      const pending = Promise.resolve().then(() => { check(); return work(); }).then(value => {
        try { check(); } catch (error) { discard?.(value); throw error; }
        return value;
      });
      const value = await bounded(pending); check(); return value;
    },
    async read(offset, length) {
      check();
      if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || length > source.size - offset) throw new RangeError('Invalid source range');
      if (!length) return new Uint8Array();
      if (reads >= maxReads || length > maxBytes - bytes) {
        failure = Object.assign(new Error('Source read budget exceeded'), {code: 'INSPECTION_BUDGET'});
        failed = true;
        throw failure;
      }
      // Reserve before awaiting so concurrent reads cannot exceed the budget.
      reads++; bytes += length;
      try {
        const value = await bounded(Promise.resolve().then(() => { check(); return source.read(offset, length, controller.signal); }));
        check();
        if (!(value instanceof Uint8Array) || value.byteLength !== length) throw new Error('Source returned an incomplete byte range');
        return value;
      } catch (error) { if (!failed) { failure = error; failed = true; } throw failure; }
    },
    close() {
      if (closing) return closing;
      let resolveClose, rejectClose;
      // Reserve retirement before abort dispatch can reenter through a source's
      // listener. Every caller observes one promise and one owned close call.
      closing = new Promise((resolve, reject) => { resolveClose = resolve; rejectClose = reject; });
      closed = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      controller.abort(new DOMException('Source lease closed', 'AbortError'));
      if (source.ownership !== 'owned' || !source.close) { resolveClose(); return closing; }
      const closeTimer = setTimeout(() => rejectClose(new DOMException('Source close deadline exceeded', 'TimeoutError')), 3000);
      Promise.resolve().then(() => source.close()).then(() => { clearTimeout(closeTimer); resolveClose(); }, error => { clearTimeout(closeTimer); rejectClose(error); });
      return closing;
    },
  };
}
