// SPDX-License-Identifier: MIT
// Run against libavutil on the host, or the adapted mp_image object and exact
// private dependency libraries with DEMUXE_TEST_MPV in an isolated Wasm link.
#include <assert.h>
#include <stdint.h>
#include <string.h>
#include <libavutil/frame.h>
#include <libavutil/buffer.h>
#include "retained-lease.h"
#ifdef DEMUXE_TEST_MPV
#include <emscripten.h>
#include "mpv_talloc.h"
#include "video/mp_image.h"
#define EXPORTED EMSCRIPTEN_KEEPALIVE
#define PARAMS_BYTES sizeof(struct mp_image_params)
#else
#define EXPORTED
#define PARAMS_BYTES 128
static unsigned releases;
void demuxe_decoder_release_v1(uint32_t generation, uint32_t id)
{
    assert(generation == 7 && id == 41);
    releases++;
}
#endif

static AVFrame *input(void)
{
    AVFrame *frame = av_frame_alloc();
    assert(frame);
    frame->format = AV_PIX_FMT_YUV420P;
    frame->width = frame->height = 2;
    assert(av_frame_get_buffer(frame, 32) == 0);
    assert(demuxe_retained_lease(frame, 7, 41, PARAMS_BYTES) == 0);
    assert(demuxe_retained_has_lease(frame->opaque_ref, PARAMS_BYTES));
#ifdef DEMUXE_TEST_MPV
    struct mp_image_params *params = (void *)frame->opaque_ref->data;
    params->stereo3d = 1; params->light = 2;
    params->no_dovi = params->no_enhancement_layer = true;
#endif
    return frame;
}

// Staged calls let JS assert that the release import runs only after the last
// native reference, rather than merely checking native return values.
static AVFrame *first, *copy, *props;
EXPORTED int demuxe_test_lease_begin(void)
{
    assert(!first && !copy && !props);
    first = input();
    copy = av_frame_clone(first);
    props = av_frame_alloc();
    assert(copy && props && av_frame_copy_props(props, first) == 0);
    assert(copy->opaque_ref && props->opaque_ref);
    av_frame_free(&first);
    return av_buffer_get_ref_count(copy->opaque_ref);
}
EXPORTED int demuxe_test_lease_copy_release(void)
{
    av_frame_free(&copy);
    return av_buffer_get_ref_count(props->opaque_ref);
}
EXPORTED void demuxe_test_lease_finish(void) { av_frame_free(&props); }

#ifdef DEMUXE_TEST_MPV
static struct mp_image *image, *reference, *pixels;
EXPORTED int demuxe_test_lease_mpv_begin(void)
{
    assert(!image && !reference && !pixels && !copy && !props);
    first = input();
    image = mp_image_from_av_frame(first);
    assert(image);
    assert(image->params.stereo3d == 1 && image->params.light == 2);
    assert(image->params.no_dovi && image->params.no_enhancement_layer);
    reference = mp_image_new_ref(image);
    pixels = mp_image_new_copy(image);
    assert(reference && pixels);
    av_frame_free(&first);
    talloc_free(image); image = NULL;
    pixels->params.stereo3d = 2; pixels->params.light = 3;
    pixels->params.no_dovi = false;
    copy = mp_image_to_av_frame(pixels);
    assert(copy && copy->opaque_ref);
    struct mp_image_params *params = (void *)copy->opaque_ref->data;
    assert(params->stereo3d == 2 && params->light == 3);
    assert(!params->no_dovi && params->no_enhancement_layer);
    image = mp_image_from_av_frame(copy);
    assert(image && image->params.stereo3d == 2 && image->params.light == 3);
    assert(!image->params.no_dovi && image->params.no_enhancement_layer);
    talloc_free(image); image = NULL;
    // Ordinary FFmpeg side data must not contain the private mp_image carrier.
    for (int i = 0; i < copy->nb_side_data; i++)
        assert((int)copy->side_data[i]->type != DEMUXE_RETAINED_OPAQUE_REF);
    props = av_frame_alloc();
    assert(props && av_frame_copy_props(props, copy) == 0 && props->opaque_ref);
    talloc_free(pixels); pixels = NULL;
    av_frame_free(&copy);
    return av_buffer_get_ref_count(props->opaque_ref);
}
EXPORTED int demuxe_test_lease_mpv_release(void)
{
    talloc_free(reference); reference = NULL;
    return av_buffer_get_ref_count(props->opaque_ref);
}
#else
int main(void)
{
    assert(demuxe_test_lease_begin() == 2 && releases == 0);
    assert(demuxe_test_lease_copy_release() == 1 && releases == 0);
    demuxe_test_lease_finish();
    assert(releases == 1);
    demuxe_test_lease_finish();
    assert(releases == 1);
    AVFrame *next = input();
    uint8_t params[PARAMS_BYTES]; memset(params, 0xa5, sizeof(params));
    AVBufferRef *wrapped = demuxe_retained_copy_opaque(next->opaque_ref, params, sizeof(params));
    assert(wrapped && demuxe_retained_has_lease(wrapped, sizeof(params)));
    assert(!memcmp(wrapped->data, params, sizeof(params)));
    AVBufferRef *another = demuxe_retained_copy_opaque(wrapped, params, sizeof(params));
    // Copies retain the same root directly, never an accumulating wrapper chain.
    assert(((AVBufferRef *)av_buffer_get_opaque(wrapped))->buffer == ((AVBufferRef *)av_buffer_get_opaque(another))->buffer);
    av_frame_free(&next); av_buffer_unref(&wrapped);
    assert(releases == 1);
    av_buffer_unref(&another); assert(releases == 2);
    AVBufferRef *plain = demuxe_retained_copy_opaque(NULL, params, sizeof(params));
    assert(plain && plain->size == sizeof(params) && !demuxe_retained_has_lease(plain, sizeof(params)));
    assert(!memcmp(plain->data, params, sizeof(params)));av_buffer_unref(&plain);
    return 0;
}
#endif
