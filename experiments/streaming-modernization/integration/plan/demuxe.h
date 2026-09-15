/* SPDX-License-Identifier: LGPL-2.1-or-later
 * Private pinned Demuxe integration ABI, not a stable FFmpeg public API.
 * Calls execute only on the owning parent demux thread. Returned plans contain
 * no pointers into mutable parser state and may be handed to a container task.
 */
#ifndef AVFORMAT_DEMUXE_H
#define AVFORMAT_DEMUXE_H
#include "avformat.h"
#define AV_DEMUXE_PLAN_ABI 1
#define AV_DEMUXE_URL_SIZE 4096
struct AVDemuxeRepresentation {
    int abi, stream_index, bandwidth, live, segments;
    int64_t first_sequence;
    char group[256], id[128];
};
struct AVDemuxeSegment {
    int abi, stream_index;
    int64_t sequence, start_us, duration_us;
    int64_t offset, size, init_offset, init_size;
    char url[AV_DEMUXE_URL_SIZE], init_url[AV_DEMUXE_URL_SIZE];
};
/* sequence >= 0 requests an exact sequence; -1 finds the segment containing
 * target_us. EOF is outside the finite window; ENOSYS means unsupported input.
 * This seam never downloads a manifest or mutates the parent's read position.
 */
int av_demuxe_hls_representation(AVFormatContext *, int, struct AVDemuxeRepresentation *);
int av_demuxe_hls_segment(AVFormatContext *, int, int64_t, int64_t, struct AVDemuxeSegment *);
int av_demuxe_dash_representation(AVFormatContext *, int, struct AVDemuxeRepresentation *);
int av_demuxe_dash_segment(AVFormatContext *, int, int64_t, int64_t, struct AVDemuxeSegment *);
#endif
