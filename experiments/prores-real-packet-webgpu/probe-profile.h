// SPDX-License-Identifier: Apache-2.0
/* Experiment-only FFmpeg 9.0.2 Software stage elapsed-time profiler.
 * Emscripten maps CLOCK_THREAD_CPUTIME_ID to a monotonic wall clock. */
#ifndef DEMUXE_PRORES_SOFTWARE_PROFILE_H
#define DEMUXE_PRORES_SOFTWARE_PROFILE_H
#include <stdint.h>
#include <time.h>
static uint64_t probe_coeff_ns, probe_recon_ns, probe_frame_ns, probe_components;
static uint64_t probe_serial_ns;
static uint32_t probe_frame_index;
static int probe_is_profile(void) { return 1; }
static int probe_is_extract(void) { return 0; }
static int probe_is_capture(void) { return 0; }
static uint64_t probe_now_ns(void) {
    struct timespec t;
    clock_gettime(CLOCK_THREAD_CPUTIME_ID, &t);
    return (uint64_t)t.tv_sec * 1000000000ULL + t.tv_nsec;
}
static void probe_frame_header(const AVCodecContext *avctx, const ProresContext *ctx,
                               const AVPacket *packet) {
    (void)avctx; (void)ctx; (void)packet;
}
static void probe_slice_header(const ProresContext *ctx, const SliceContext *slice,
                               int jobnr, int qscale, int hdr_size,
                               int y_size, int u_size, int v_size) {
    (void)ctx; (void)slice; (void)jobnr; (void)qscale;
    (void)hdr_size; (void)y_size; (void)u_size; (void)v_size;
}
static void probe_component(const ProresContext *ctx, const SliceContext *slice,
                            int component, const int16_t *blocks, int block_count) {
    (void)ctx; (void)slice; (void)component; (void)blocks; (void)block_count;
}
static void probe_finish(void) { }
/* Four u64 counters, read by the experiment worker before engine shutdown. */
uint64_t *web_prores_profile_ptr(void) {
    static uint64_t snapshot[4];
    snapshot[0] = probe_frame_ns;
    snapshot[1] = probe_coeff_ns;
    snapshot[2] = probe_recon_ns;
    snapshot[3] = probe_components;
    return snapshot;
}
#endif
