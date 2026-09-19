// SPDX-License-Identifier: GPL-3.0-or-later
#pragma once
#include "container-task.h"
struct demuxe_component_group;
// Owning-demux-thread selected audio/subtitle packet executors. No clock or
// manifest copy is retained here; the parent FFmpeg context remains authoritative.
struct demuxe_component_group *demuxe_components_create(AVFormatContext *,uint64_t,
    struct demuxe_task_io);
int demuxe_components_sync(struct demuxe_component_group *,int64_t target_us);
int demuxe_components_refresh(struct demuxe_component_group *);
int demuxe_components_take(struct demuxe_component_group *,struct demuxe_prepared_packet *);
size_t demuxe_components_queued_bytes(struct demuxe_component_group *);
void demuxe_components_destroy(struct demuxe_component_group *);
