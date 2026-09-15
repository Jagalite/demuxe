// SPDX-License-Identifier: GPL-2.0-or-later
// Demux-owned packet transition prototype. No clock, transport, or decoder API.
#pragma once
#include <stdint.h>
#include <stddef.h>
#include <libavcodec/packet.h>
#include <libavutil/rational.h>
#define DEMUXE_TRANSITION_PACKETS 256
struct demuxe_packet {AVPacket *packet;AVRational timebase;int representation;};
struct demuxe_packet_queue {struct demuxe_packet packets[DEMUXE_TRANSITION_PACKETS];size_t bytes;unsigned count;};
enum demuxe_transition_phase {DEMUXE_STABLE,DEMUXE_PREPARING,DEMUXE_ACCEPTED,DEMUXE_REJECTED};
struct demuxe_transition {
 uint64_t source,request,latest_request;
 int active,candidate;
 enum demuxe_transition_phase phase;
 const char *reason;
 int64_t last_pts,old_key,new_key;
 AVRational last_tb,old_tb,new_tb;
 size_t budget,peak_bytes;
 struct demuxe_packet_queue old_packets,new_packets,ready;
};
void demuxe_transition_init(struct demuxe_transition *,uint64_t source,int active,size_t budget);
// Returns false for a stale source/request. Does not take ownership of a URL/ID.
int demuxe_transition_request(struct demuxe_transition *,uint64_t source,uint64_t request,int representation);
// Takes ownership of packet on every return. Only video packets enter this seam;
// audio/subtitles remain in the existing demux output path.
void demuxe_transition_push(struct demuxe_transition *,uint64_t source,int representation,AVPacket *,AVRational);
// Caller takes ownership of the returned packet; drain before pushing another.
struct demuxe_packet demuxe_transition_take(struct demuxe_transition *);
// Cancelling preparation releases withheld old packets, never loses them.
void demuxe_transition_cancel(struct demuxe_transition *,const char *reason);
void demuxe_transition_destroy(struct demuxe_transition *);
