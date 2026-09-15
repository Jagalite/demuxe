// SPDX-License-Identifier: GPL-2.0-or-later
#pragma once
#include <stddef.h>
#include <stdint.h>
#include <libavformat/avformat.h>
#include <libavformat/demuxe.h>
struct demuxe_container_task;
struct demuxe_codec;
struct demuxe_prepared_packet {
    AVPacket *packet;
    struct demuxe_codec *codec;
    AVRational timebase;
    int64_t sequence;
    int representation;
    uint64_t source, request;
};
struct demuxe_task_io {
    void *opaque;
    int (*open)(void *, AVFormatContext *, AVIOContext **, const char *, AVDictionary **);
    void (*close)(void *, AVFormatContext *, AVIOContext **);
    void (*retire)(void *, const char *);
};
struct demuxe_task_stats {
    size_t queued_bytes, peak_queued_bytes;
    unsigned queued_packets, queued_plans, containers;
    uint64_t consumed_bytes;
    int error, finished;
};
enum demuxe_container_kind { DEMUXE_CONTAINER_MOV, DEMUXE_CONTAINER_WEBVTT };
struct demuxe_container_task *demuxe_task_create_media(uint64_t source,uint64_t request,
    size_t packet_budget,struct demuxe_task_io io,enum AVMediaType media_type,
    enum demuxe_container_kind container);
struct demuxe_container_task *demuxe_task_create(uint64_t source,uint64_t request,
    size_t packet_budget,struct demuxe_task_io io);
// Single owning demux-thread producer; plans are copied, never retained by pointer.
int demuxe_task_plan(struct demuxe_container_task *,const struct AVDemuxeSegment *);
void demuxe_task_end(struct demuxe_container_task *);
// 1 packet, 0 temporarily empty, or a negative terminal error/EOF. wait_ms=0 polls.
int demuxe_task_take(struct demuxe_container_task *,struct demuxe_prepared_packet *,unsigned wait_ms);
void demuxe_packet_release(struct demuxe_prepared_packet *);
size_t demuxe_codec_bytes(const AVCodecParameters *);
const AVCodecParameters *demuxe_packet_codec(const struct demuxe_prepared_packet *);
void demuxe_task_stats(struct demuxe_container_task *,struct demuxe_task_stats *);
void demuxe_task_cancel(struct demuxe_container_task *);
void demuxe_task_destroy(struct demuxe_container_task *);
