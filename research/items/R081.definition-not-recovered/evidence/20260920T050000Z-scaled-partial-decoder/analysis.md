<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Scaling the actual partial decoder beyond 64 x 64

Both new profiles use actual compressed MPEG 2 syntax: one DC-only I picture and 32
motion-only P pictures, with chroma-aligned motion and exact independent FFmpeg
pictures. The 256 x 256 stream has 1,536 parsed DC blocks and 8,192 P macroblocks; the
512 x 512 stream has 6,144 DC blocks and 32,768 P macroblocks. A separate Python observer
and the timed browser entropy parser agree. The browser reconstructs from these
quantized coefficients and motion symbols; no FFmpeg-decoded pixel plane feeds
either timed candidate or baseline.

The CPU baseline uses typed-array fills for inverse DC and coalesces adjacent
same-motion macroblocks into contiguous row copies. It is materially cheaper
than the old pixel-by-pixel integer-arithmetic reference. The persistent CPU
baseline reuses both picture buffers, matching the GPU's opportunity to retain
its device/pipelines/buffers. Both modes include fresh entropy parsing per job.
GPU reference pictures stay resident across all 32 predictive reconstructions;
only the required final CPU-visible YUV output is read back in timed jobs.

All 33 pictures match independently decoded FFmpeg output at each size, not merely
the last frame. Wrong DC and wrong motion change output; a new valid source
execution restores exact pixels after each wrong state; dimension mismatch and
closed owners reject. All 88 timed CPU/GPU final outputs are exact. Existing
64 x 64 results remain unchanged.

Performance fails at both sizes and both ownership lifetimes. Every one of 44 GPU
jobs is slower than its matched CPU job. Median cold GPU/CPU ratio is 2.078947 at
256 x 256 and 1.887640 at 512 x 512. Persistent warm medians are 1.656250 and 1.818182;
charging device/setup plus all 11 jobs and final teardown gives total ratios
1.704023 and 1.783516. Median CPU/GPU job costs are 3.6/7.5 ms and 8.4/16.9 ms cold,
3.2/5.2 ms and 8.0/14.6 ms persistent. Explicit GPU allocations retained 1,251,840 and
5,005,824 bytes versus 196,608 and 786,432 CPU picture-buffer bytes; shared parsed
syntax/JS runtime allocations are additional and not included in those buffer
counts.

Chrome 152.0.7977.83 used the ordinary Apple Metal 3 WebGPU adapter. Tests ran in a
coordinated quiet team GPU/CPU window, headless and without activating a display
window. Prepared source/oracle loading and browser startup are common excluded
setup, while cold GPU adapter/device/pipelines, metadata preparation/transfer,
all reconstruction, synchronized final readback and explicit owner teardown are
charged. Persistent warm rows never substitute for the charged total.

Decision: stop this restricted partial-decode reconstruction profile. Scaling
from 64 to 256 and 512 pixels per dimension and retaining a GPU owner did not reverse
the negative result against a reasonable optimized CPU implementation. This is
not a universal statement about GPU video decoding: arbitrary AC transforms,
fractional prediction, B pictures, higher resolutions, other output contracts,
GPU-resident presentation and integrated production routing remain unqualified.
The precise reopening condition is a materially different faithful workload or
kernel/output contract that clears independent full-picture correctness and the
matched end-to-end cost gate.

Measurement boundary clarification: per-fixture preparation elapsed time is saved
in preparation.json. Browser startup is excluded common setup and was not timed
separately, despite the protocol's planned separate setup reporting. The cold
comparison means a fresh GPU adapter/device/pipelines inside an already running
browser. This omission cannot support an application-startup claim; it does not
turn any observed slower GPU job into a performance benefit. Buffer destruction
and CPU reference release are API-level teardown, not measured physical-memory
reclamation or forced garbage collection.

