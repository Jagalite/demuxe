// SPDX-License-Identifier: Apache-2.0
/* Experiment-only FFmpeg 9.0.2 entropy output into the final GPU input layout.
 * The mailbox is owned by the decoder thread until the ticket is acknowledged. */
#ifndef DEMUXE_LIVE_PRORES_DIRECT_H
#define DEMUXE_LIVE_PRORES_DIRECT_H
#include <stdint.h>
#include <stddef.h>
#include <string.h>
#include <time.h>
#include "browser_decoder_bridge.h"
#ifndef PRORES_STAGE_PROFILE
#define PRORES_STAGE_PROFILE 1
#endif

#define DIRECT_HEADER_BYTES 64u
#define DIRECT_DESCRIPTOR_CAPACITY 8192u
#define DIRECT_MATRIX_BYTES 128u
static uint32_t probe_frame_index;
static uint64_t probe_coeff_ns, probe_recon_ns, probe_frame_ns, probe_components;
static uint64_t probe_serial_ns;
static uint32_t probe_next_slice, probe_next_word;
static int probe_invalid;
static int probe_is_profile(void) { return PRORES_STAGE_PROFILE; }
static int probe_is_extract(void) { return 1; }
static int probe_is_capture(void) { return 0; }
static uint64_t probe_now_ns(void) {
    struct timespec t;
    clock_gettime(CLOCK_THREAD_CPUTIME_ID, &t);
    return (uint64_t)t.tv_sec * 1000000000ULL + t.tv_nsec;
}
static uint32_t *probe_header(void) { return (uint32_t *)web_decoder.packet; }
static void probe_frame_header(const AVCodecContext *avctx, const ProresContext *ctx,
                               const AVPacket *packet) {
    uint32_t *h = probe_header();
    uint32_t mb_count = ((uint32_t)avctx->width + 15) / 16 *
                        (((uint32_t)avctx->height + 15) / 16);
    uint32_t coeff_bytes = mb_count * 1024;
    uint32_t descriptor_offset = DIRECT_HEADER_BYTES + coeff_bytes;
    (void)packet;
    probe_coeff_ns = probe_recon_ns = probe_frame_ns = probe_components = probe_serial_ns = 0;
    probe_next_slice = probe_next_word = 0;
    probe_invalid = avctx->width != 640 || avctx->height != 360 ||
                    ctx->frame_type != 0 || coeff_bytes > 1024 * 1024 ||
                    descriptor_offset + DIRECT_DESCRIPTOR_CAPACITY + DIRECT_MATRIX_BYTES > WEB_DEC_PACKET_MAX;
    memset(h, 0, DIRECT_HEADER_BYTES);
    h[0] = 0x31505044u; /* DPP1 */
    h[1] = probe_frame_index;
    h[2] = avctx->width;
    h[3] = avctx->height;
    h[4] = DIRECT_HEADER_BYTES;
    h[5] = coeff_bytes;
    h[6] = descriptor_offset;
    h[7] = descriptor_offset + DIRECT_DESCRIPTOR_CAPACITY;
    h[8] = h[7] + DIRECT_MATRIX_BYTES;
    h[12] = ctx->frame_type;
}
static void probe_slice_header(const ProresContext *ctx, const SliceContext *slice,
                               int jobnr, int qscale, int hdr_size,
                               int y_size, int u_size, int v_size) {
    uint64_t start = probe_is_profile() ? probe_now_ns() : 0;
    uint32_t *h = probe_header();
    uint32_t *d = (uint32_t *)(web_decoder.packet + h[6]);
    (void)hdr_size; (void)y_size; (void)u_size; (void)v_size;
    if (probe_invalid || ctx->first_field != 1 || jobnr != probe_next_slice ||
        (uint32_t)(jobnr + 1) * 32 > DIRECT_DESCRIPTOR_CAPACITY ||
        !slice->mb_count || slice->mb_count > 8 ||
        slice->mb_x + slice->mb_count > 40 || slice->mb_y >= 23 ||
        probe_next_word + slice->mb_count * 256 > h[5] / 4) {
        probe_invalid = 1;
        return;
    }
    d += jobnr * 8;
    d[0] = probe_next_word; d[1] = slice->mb_x; d[2] = slice->mb_y;
    d[3] = slice->mb_count; d[4] = qscale;
    d[5] = d[6] = d[7] = 0;
    if (!jobnr) {
        memcpy(web_decoder.packet + h[7], ctx->qmat_luma, 64);
        memcpy(web_decoder.packet + h[7] + 64, ctx->qmat_chroma, 64);
    } else if (memcmp(web_decoder.packet + h[7], ctx->qmat_luma, 64) ||
               memcmp(web_decoder.packet + h[7] + 64, ctx->qmat_chroma, 64)) {
        probe_invalid = 1; return;
    }
    probe_next_word += slice->mb_count * 256;
    probe_next_slice++;
    h[9] = probe_next_slice;
    if (slice->mb_count > h[10]) h[10] = slice->mb_count;
    if (probe_is_profile()) probe_serial_ns += probe_now_ns() - start;
}
static int16_t *probe_direct_block(const ProresContext *ctx, const SliceContext *slice,
                                    int component, int block_index) {
    const uint32_t *h = probe_header();
    int slice_index = slice - ctx->slices;
    if (probe_invalid || slice_index < 0 || (uint32_t)slice_index >= probe_next_slice ||
        component < 0 || component > 2 || block_index < 0) return NULL;
    const uint32_t *d = (const uint32_t *)(web_decoder.packet + h[6]) + slice_index * 8;
    int blocks_per_mb = component ? 2 : 4;
    int mb = block_index / blocks_per_mb;
    if ((uint32_t)mb >= d[3]) return NULL;
    uint32_t offset = h[4] + d[0] * 4 + mb * 1024 +
                      (component == 1 ? 512 : component == 2 ? 768 : 0) +
                      (block_index % blocks_per_mb) * 128;
    if (offset + 128 > h[4] + h[5]) return NULL;
    return (int16_t *)(web_decoder.packet + offset);
}
static void probe_component(const ProresContext *ctx, const SliceContext *slice,
                            int component, const int16_t *blocks, int block_count) {
    (void)ctx; (void)slice; (void)component; (void)blocks; (void)block_count;
}
static void probe_finish(void) { }
const uint8_t *web_prores_capture(size_t *size) {
    const uint32_t *h = probe_header();
    *size = !probe_invalid && probe_next_word * 4 == h[5] && probe_next_slice > 0 ? h[8] : 0;
    return web_decoder.packet;
}
uint64_t web_prores_entropy_ns(void) { return probe_coeff_ns; }
uint64_t web_prores_serial_ns(void) { return probe_serial_ns; }
uint64_t web_prores_frame_ns(void) { return probe_frame_ns; }
#endif
