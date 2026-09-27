// SPDX-License-Identifier: Apache-2.0
/** Cross-origin module workers need a same-origin Blob entry point. */
export declare function runtimeWorker(url: URL, options?: WorkerOptions, WorkerClass?: typeof Worker, helperURL?: URL): Worker;
/** Install only inside a CDN worker, covering nested workers and Emscripten pthreads. */
export declare function installRuntimeWorkers(): void;
