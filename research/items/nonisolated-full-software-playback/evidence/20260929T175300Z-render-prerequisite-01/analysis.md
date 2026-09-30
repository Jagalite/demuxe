# Interpretation

Both private backends passed three cycles through the existing native Software RGB renderer entry points. No isolation or SharedArrayBuffer was present; the Asyncify arm also lacked both JSPI APIs. Each cycle ended with zero live/retained tasks, wait keys and timers, and all 24 coroutine slots free.

The current renderer is usable at the idle initialization/lifecycle boundary without a new scheduler or frame-transfer architecture. This narrows the next experiment to actual decoder output plus an asynchronous host loop. It does not prove that codec decode workloads remain responsive, that decoded-frame conversion is correct, or that A/V synchronization works.

The native entry points and private libraries were linked, but no video codec build was added and no media executed. The worker checked a 64x64 black RGB buffer and an invalid-size rejection; it did not draw to a canvas. Software remains excluded by current production runtime policy.

Disposition: pursue the next bounded MPEG-2 video-only experiment, then synchronized stereo A/V. Do not infer all-format support, restore the earlier removed generic non-isolated plan, or derive a calendar estimate from this probe.
