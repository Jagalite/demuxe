// SPDX-License-Identifier: Apache-2.0
/* Experiment-only FFmpeg 9.0.2 pre-IDCT capture. The decoder and this buffer
 * live in the isolated playback Wasm; neither is linked into production. */
#ifndef DEMUXE_LIVE_PRORES_PROBE_H
#define DEMUXE_LIVE_PRORES_PROBE_H
#include <stdint.h>
#include <stddef.h>
#include <string.h>
#include <stdlib.h>
#include <time.h>
#ifndef PRORES_STAGE_PROFILE
#define PRORES_STAGE_PROFILE 1
#endif

#define PROBE_LIMIT (4 * 1024 * 1024)
static uint8_t probe_capture[PROBE_LIMIT];
static size_t probe_length;
static uint32_t probe_frame_index;
static int probe_overflow;
static uint64_t probe_coeff_ns, probe_recon_ns, probe_frame_ns, probe_components;
static uint64_t probe_serial_ns;
static int probe_is_profile(void) { return PRORES_STAGE_PROFILE; }
static int probe_is_extract(void) { return 1; }
static int probe_is_capture(void) { return 1; }
static uint64_t probe_now_ns(void) {
    struct timespec t;
    clock_gettime(CLOCK_THREAD_CPUTIME_ID, &t);
    return (uint64_t)t.tv_sec * 1000000000ULL + t.tv_nsec;
}
static void probe_bytes(const void *data, size_t count) {
    if (count > PROBE_LIMIT - probe_length) { probe_overflow = 1; return; }
    memcpy(probe_capture + probe_length, data, count);
    probe_length += count;
}
static void probe_u32(uint32_t value) {
    uint8_t data[4] = {value, value >> 8, value >> 16, value >> 24};
    probe_bytes(data, 4);
}
static void probe_i64(int64_t value) {
    probe_u32((uint32_t)value); probe_u32((uint64_t)value >> 32);
}
static void probe_frame_header(const AVCodecContext *avctx, const ProresContext *ctx,
                               const AVPacket *packet) {
    probe_length = 0; probe_overflow = 0;
    probe_coeff_ns = probe_recon_ns = probe_frame_ns = probe_components = probe_serial_ns = 0;
    probe_bytes("DPC1FRAM", 8);
    probe_u32(probe_frame_index); probe_u32(avctx->width); probe_u32(avctx->height);
    probe_u32(ctx->frame_type); probe_i64(packet->pts);
}
static void probe_slice_header(const ProresContext *ctx, const SliceContext *slice,
                               int jobnr, int qscale, int hdr_size,
                               int y_size, int u_size, int v_size) {
    uint64_t begin = probe_is_profile() ? probe_now_ns() : 0;
    probe_bytes("SLIC", 4); probe_u32(probe_frame_index);
    probe_u32(!ctx->first_field); probe_u32(jobnr); probe_u32(slice->mb_x);
    probe_u32(slice->mb_y); probe_u32(slice->mb_count); probe_u32(qscale);
    probe_u32(y_size); probe_u32(u_size); probe_u32(v_size); probe_u32(hdr_size);
    probe_bytes(ctx->scan, 64); probe_bytes(ctx->qmat_luma, 64);
    probe_bytes(ctx->qmat_chroma, 64);
    if (probe_is_profile()) probe_serial_ns += probe_now_ns() - begin;
}
static void probe_component(const ProresContext *ctx, const SliceContext *slice,
                            int component, const int16_t *blocks, int block_count) {
    uint64_t begin = probe_is_profile() ? probe_now_ns() : 0;
    probe_bytes("COMP", 4); probe_u32(probe_frame_index);
    probe_u32(!ctx->first_field); probe_u32(slice - ctx->slices);
    probe_u32(component); probe_u32(block_count);
    for (int i = 0; i < block_count * 64; i++) {
        uint16_t value = (uint16_t)blocks[i];
        uint8_t data[2] = {value, value >> 8};
        probe_bytes(data, 2);
    }
    if (probe_is_profile()) probe_serial_ns += probe_now_ns() - begin;
}
static void probe_finish(void) { }
const uint8_t *web_prores_capture(size_t *size) {
    *size = probe_overflow ? 0 : probe_length;
    return probe_capture;
}
uint64_t web_prores_entropy_ns(void) { return probe_coeff_ns; }
uint64_t web_prores_serial_ns(void) { return probe_serial_ns; }
uint64_t web_prores_frame_ns(void) { return probe_frame_ns; }
#endif
