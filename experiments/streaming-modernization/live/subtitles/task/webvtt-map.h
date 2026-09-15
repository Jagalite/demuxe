// SPDX-License-Identifier: GPL-2.0-or-later
#pragma once
#include <stddef.h>
#include <stdint.h>
struct demuxe_webvtt_map {int present;uint64_t mpegts;int64_t local_us;};
int demuxe_webvtt_header(const char *,size_t,struct demuxe_webvtt_map *);
int demuxe_webvtt_timestamp(const struct demuxe_webvtt_map *,int64_t cue_us,int64_t reference_us,int64_t *mapped_us);
