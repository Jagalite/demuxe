// SPDX-License-Identifier: Apache-2.0
/* Experiment-only instrumentation included in an isolated FFmpeg 9.0.2 build.
 * This file is never compiled into Demuxe or its production FFmpeg build. */
#ifndef DEMUXE_PRORES_COEFFICIENT_PROBE_H
#define DEMUXE_PRORES_COEFFICIENT_PROBE_H

#include <inttypes.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

enum ProbeMode { PROBE_OFF, PROBE_REFERENCE, PROBE_EXTRACT,
                 PROBE_PROFILE_FULL, PROBE_PROFILE_EXTRACT };

static enum ProbeMode probe_mode(void)
{
    static int initialized;
    static enum ProbeMode mode;
    const char *value;
    if (initialized)
        return mode;
    initialized = 1;
    value = getenv("DEMUXE_PRORES_MODE");
    if (!value)
        return mode;
    if (!strcmp(value, "reference")) mode = PROBE_REFERENCE;
    else if (!strcmp(value, "extract")) mode = PROBE_EXTRACT;
    else if (!strcmp(value, "profile-full")) mode = PROBE_PROFILE_FULL;
    else if (!strcmp(value, "profile-extract")) mode = PROBE_PROFILE_EXTRACT;
    else {
        fprintf(stderr, "unknown DEMUXE_PRORES_MODE: %s\n", value);
        exit(2);
    }
    return mode;
}

static int probe_is_capture(void)
{
    return probe_mode() == PROBE_REFERENCE || probe_mode() == PROBE_EXTRACT;
}

static int probe_is_extract(void)
{
    return probe_mode() == PROBE_EXTRACT || probe_mode() == PROBE_PROFILE_EXTRACT;
}

static int probe_is_profile(void)
{
    return probe_mode() == PROBE_PROFILE_FULL || probe_mode() == PROBE_PROFILE_EXTRACT;
}

static FILE *probe_file;
static uint32_t probe_frame_index;
static uint64_t probe_frame_ns, probe_coeff_ns, probe_recon_ns;
static uint64_t probe_components;

static uint64_t probe_now_ns(void)
{
    struct timespec ts;
    if (clock_gettime(CLOCK_THREAD_CPUTIME_ID, &ts)) {
        perror("clock_gettime(CLOCK_THREAD_CPUTIME_ID)");
        exit(2);
    }
    return (uint64_t)ts.tv_sec * UINT64_C(1000000000) + ts.tv_nsec;
}

static void probe_bytes(const void *data, size_t count)
{
    if (fwrite(data, 1, count, probe_file) != count) {
        perror("ProRes coefficient capture write");
        exit(2);
    }
}

static void probe_u32(uint32_t value)
{
    const uint8_t data[4] = { value, value >> 8, value >> 16, value >> 24 };
    probe_bytes(data, sizeof(data));
}

static void probe_i64(int64_t value)
{
    uint64_t bits = (uint64_t)value;
    probe_u32((uint32_t)bits);
    probe_u32((uint32_t)(bits >> 32));
}

static void probe_open(void)
{
    const char *path = getenv("DEMUXE_PRORES_CAPTURE");
    if (probe_file)
        return;
    if (!path || !*path) {
        fprintf(stderr, "DEMUXE_PRORES_CAPTURE is required for capture modes\n");
        exit(2);
    }
    probe_file = fopen(path, "wb");
    if (!probe_file) {
        perror(path);
        exit(2);
    }
    probe_bytes("DPC1", 4);
}

static void probe_frame_header(const AVCodecContext *avctx, const ProresContext *ctx,
                               const AVPacket *packet)
{
    if (!probe_is_capture())
        return;
    probe_open();
    probe_bytes("FRAM", 4);
    probe_u32(probe_frame_index);
    probe_u32(avctx->width);
    probe_u32(avctx->height);
    probe_u32(ctx->frame_type);
    probe_i64(packet->pts);
}

static void probe_slice_header(const ProresContext *ctx, const SliceContext *slice,
                               int jobnr, int qscale, int hdr_size,
                               int y_size, int u_size, int v_size)
{
    if (!probe_is_capture())
        return;
    probe_bytes("SLIC", 4);
    probe_u32(probe_frame_index);
    probe_u32(!ctx->first_field);
    probe_u32(jobnr);
    probe_u32(slice->mb_x);
    probe_u32(slice->mb_y);
    probe_u32(slice->mb_count);
    probe_u32(qscale);
    probe_u32(y_size);
    probe_u32(u_size);
    probe_u32(v_size);
    probe_u32(hdr_size);
    probe_bytes(ctx->scan, 64);
    probe_bytes(ctx->qmat_luma, 64);
    probe_bytes(ctx->qmat_chroma, 64);
}

static void probe_component(const ProresContext *ctx, const SliceContext *slice,
                            int component, const int16_t *blocks, int block_count)
{
    int i;
    if (!probe_is_capture())
        return;
    probe_bytes("COMP", 4);
    probe_u32(probe_frame_index);
    probe_u32(!ctx->first_field);
    probe_u32(slice - ctx->slices);
    probe_u32(component);
    probe_u32(block_count);
    for (i = 0; i < block_count * 64; i++) {
        uint16_t value = (uint16_t)blocks[i];
        const uint8_t data[2] = { value, value >> 8 };
        probe_bytes(data, sizeof(data));
    }
}

static void probe_finish(void)
{
    if (probe_file) {
        if (fclose(probe_file)) {
            perror("ProRes coefficient capture close");
            exit(2);
        }
        probe_file = NULL;
    }
    if (probe_is_profile())
        fprintf(stderr, "PRORES_PROFILE mode=%s frames=%" PRIu32
                " components=%" PRIu64 " frame_cpu_ns=%" PRIu64
                " coeff_cpu_ns=%" PRIu64 " recon_cpu_ns=%" PRIu64 "\n",
                probe_is_extract() ? "extract" : "full", probe_frame_index,
                probe_components, probe_frame_ns, probe_coeff_ns, probe_recon_ns);
}

#endif
