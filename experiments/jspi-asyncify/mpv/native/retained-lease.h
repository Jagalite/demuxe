// SPDX-License-Identifier: MIT
#ifndef DEMUXE_PRIVATE_RETAINED_LEASE_H
#define DEMUXE_PRIVATE_RETAINED_LEASE_H
#include <stdint.h>
#include <libavutil/frame.h>
// This private mp_image carrier never crosses the FFmpeg side-data boundary.
// mp_image refs/copies retain its AVBufferRef; AVFrame stores it as opaque_ref,
// which av_frame_copy_props preserves even when ordinary side data is copied.
#define DEMUXE_RETAINED_OPAQUE_REF (-17485)
int demuxe_retained_lease(AVFrame *frame, uint32_t generation, uint32_t id, size_t params_bytes);
int demuxe_retained_has_lease(const AVBufferRef *opaque, size_t params_bytes);
AVBufferRef *demuxe_retained_copy_opaque(const AVBufferRef *opaque, const void *params, size_t params_bytes);
#endif
