// SPDX-License-Identifier: GPL-3.0-or-later
#pragma once
#include "container-task.h"
struct demuxe_adaptive_session;
struct demuxe_adaptive_stats {
    uint64_t source,request,accepted_request;
    int logical_stream,active_stream,requested_stream,preparing_stream;
    int switch_error;
    int live,window_known,window_error,recovery_needed;
    int64_t window_start_us,window_end_us;
    uint64_t window_revision;
    int64_t boundary_us;
    int64_t max_feed_us,max_components_us,max_candidate_us,max_retire_us;
    unsigned accepted_switches;
    size_t active_packet_bytes,candidate_packet_bytes,component_packet_bytes;
};
// All calls except the transport's interrupt callback execute on the owning
// demux thread. Thread-external user intent must first enter an engine queue.
struct demuxe_adaptive_session *demuxe_adaptive_create(AVFormatContext *,int logical_stream,
    int initial_stream,uint64_t source,struct demuxe_task_io);
int demuxe_adaptive_request(struct demuxe_adaptive_session *,uint64_t source,uint64_t request,int stream);
int demuxe_adaptive_read(struct demuxe_adaptive_session *,struct demuxe_prepared_packet *);
int demuxe_adaptive_seek(struct demuxe_adaptive_session *,int64_t presentation_us);
int demuxe_adaptive_poll(struct demuxe_adaptive_session *);
void demuxe_adaptive_tracks_changed(struct demuxe_adaptive_session *);
void demuxe_adaptive_stats(struct demuxe_adaptive_session *,struct demuxe_adaptive_stats *);
void demuxe_adaptive_destroy(struct demuxe_adaptive_session *);
