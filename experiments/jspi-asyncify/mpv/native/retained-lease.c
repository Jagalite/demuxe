// SPDX-License-Identifier: MIT
#include <errno.h>
#include <string.h>
#include <libavutil/buffer.h>
#include <libavutil/mem.h>
#include "retained-lease.h"

#ifdef __EMSCRIPTEN__
__attribute__((import_module("demuxe_decoder"), import_name("demuxe_decoder_release_v1")))
#endif
void demuxe_decoder_release_v1(uint32_t generation, uint32_t id);

struct retained_lease { uint32_t generation, id; };
static const uint8_t tag[16] = {0xe4,0x28,0xa1,0x74,0x5b,0x32,0x4c,0xea,0xa8,0x39,0xd7,0x44,0x6c,0x92,0xf5,0x13};
static void released(void *opaque, uint8_t *data)
{
    struct retained_lease *lease = (void *)data;
    uint32_t generation = lease->generation, id = lease->id;
    av_free(data);
    // Acknowledgment never suspends or invokes the native scheduler recursively.
    demuxe_decoder_release_v1(generation, id);
}

static void opaque_released(void *opaque, uint8_t *data)
{
    AVBufferRef *lease = opaque;
    av_free(data);
    av_buffer_unref(&lease);
}

int demuxe_retained_has_lease(const AVBufferRef *opaque, size_t params_bytes)
{
    return params_bytes <= SIZE_MAX - sizeof(tag) && opaque &&
        opaque->size == params_bytes + sizeof(tag) &&
        !memcmp(opaque->data + params_bytes, tag, sizeof(tag));
}

static AVBufferRef *wrap(AVBufferRef *lease, const void *params, size_t params_bytes)
{
    if (params_bytes > SIZE_MAX - sizeof(tag)) return NULL;
    uint8_t *data = av_mallocz(params_bytes + sizeof(tag));
    AVBufferRef *owned = av_buffer_ref(lease);
    if (!data || !owned) { av_free(data); av_buffer_unref(&owned); return NULL; }
    if (params) memcpy(data, params, params_bytes);
    memcpy(data + params_bytes, tag, sizeof(tag));
    AVBufferRef *result = av_buffer_create(data, params_bytes + sizeof(tag), opaque_released, owned, AV_BUFFER_FLAG_READONLY);
    if (!result) opaque_released(owned, data);
    return result;
}

AVBufferRef *demuxe_retained_copy_opaque(const AVBufferRef *opaque, const void *params, size_t params_bytes)
{
    if (demuxe_retained_has_lease(opaque, params_bytes))
        return wrap(av_buffer_get_opaque(opaque), params, params_bytes);
    AVBufferRef *result = av_buffer_alloc(params_bytes);
    if (result) memcpy(result->data, params, params_bytes);
    return result;
}

int demuxe_retained_lease(AVFrame *frame, uint32_t generation, uint32_t id, size_t params_bytes)
{
    if (!generation || generation > INT32_MAX || !id || id > INT32_MAX || frame->opaque_ref)
        return AVERROR(EINVAL);
    struct retained_lease *lease = av_malloc(sizeof(*lease));
    if (!lease) {
        demuxe_decoder_release_v1(generation, id);
        return AVERROR(ENOMEM);
    }
    *lease = (struct retained_lease){generation, id};
    AVBufferRef *root = av_buffer_create((void *)lease, sizeof(*lease), released, NULL, AV_BUFFER_FLAG_READONLY);
    if (!root) {
        released(NULL, (void *)lease);
        return AVERROR(ENOMEM);
    }
    // mpv reserves the opaque_ref prefix for mp_image_params. A tagged wrapper
    // preserves those bytes while retaining a separate immutable identity root.
    frame->opaque_ref = wrap(root, NULL, params_bytes);
    av_buffer_unref(&root);
    return frame->opaque_ref ? 0 : AVERROR(ENOMEM);
}
