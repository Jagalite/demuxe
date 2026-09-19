// SPDX-License-Identifier: GPL-3.0-or-later
// Real libavformat/decoder probe. No mpv clock, audio output, or browser claim.
#include "transition.h"
#include <assert.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavutil/time.h>

struct decoder {
    AVCodecContext *context;
    AVFrame *frame;
    AVRational timebase;
    int representation, frames, regressions, errors, changes;
    double last, max_gap;
};

static int receive(struct decoder *d)
{
    int ret;
    while ((ret = avcodec_receive_frame(d->context, d->frame)) >= 0) {
        if (d->frame->best_effort_timestamp != AV_NOPTS_VALUE) {
            double pts = d->frame->best_effort_timestamp * av_q2d(d->timebase);
            if (d->frames) {
                if (pts <= d->last) d->regressions++;
                if (pts - d->last > d->max_gap) d->max_gap = pts - d->last;
                if (d->context->codec_type == AVMEDIA_TYPE_AUDIO && pts - d->last > 0.03)
                    printf("{\"event\":\"audio-gap\",\"previousPTS\":%.9f,\"pts\":%.9f}\n", d->last, pts);
            }
            d->last = pts;
        }
        d->frames++;
        av_frame_unref(d->frame);
    }
    if (ret != AVERROR_EOF && ret != AVERROR(EAGAIN)) d->errors++;
    return ret;
}

static int decode(struct decoder *d, AVStream *stream, AVPacket *packet)
{
    if (!d->context || d->representation != stream->index) {
        if (d->context) {
            if (avcodec_send_packet(d->context, NULL) < 0) return -1;
            receive(d);
            avcodec_free_context(&d->context);
            d->changes++;
        }
        const AVCodec *codec = avcodec_find_decoder(stream->codecpar->codec_id);
        if (!codec) return -1;
        d->context = avcodec_alloc_context3(codec);
        if (!d->context || avcodec_parameters_to_context(d->context, stream->codecpar) < 0) return -1;
        d->timebase = d->context->pkt_timebase = stream->time_base;
        d->context->thread_count = 1;
        d->representation = stream->index;
        if (avcodec_open2(d->context, codec, NULL) < 0) return -1;
    }
    int ret = avcodec_send_packet(d->context, packet);
    if (ret < 0) { d->errors++; return ret; }
    receive(d);
    return 0;
}

static void select_streams(AVFormatContext *f, struct demuxe_transition *t, int audio)
{
    for (unsigned i = 0; i < f->nb_streams; i++)
        f->streams[i]->discard = (int)i == audio || (int)i == t->active || (int)i == t->candidate
            ? AVDISCARD_DEFAULT : AVDISCARD_ALL;
}

int main(int argc, char **argv)
{
    if (argc != 2 && argc != 3) return 2;
    int fixed = argc == 3 && !strcmp(argv[2], "--fixed");
    AVFormatContext *f = NULL;
    AVDictionary *options = NULL;
    av_dict_set(&options, "strict_io", "1", 0);
    if (getenv("DEMUXE_PROBE_CONTINUOUS_FMP4"))
        av_dict_set(&options, "continuous_fmp4", "1", 0);
    av_dict_set(&options, "extension_picky", "0", 0);
    av_dict_set(&options, "allowed_extensions", "ALL", 0);
    int ret = avformat_open_input(&f, argv[1], NULL, &options);
    av_dict_free(&options);
    if (ret < 0 || avformat_find_stream_info(f, NULL) < 0) return 3;
    // Fixture-only grouping; real integration must use manifest group metadata.
    int videos[3], n = 0, audio = -1;
    for (unsigned i = 0; i < f->nb_streams; i++) {
        if (f->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_VIDEO && n < 3) videos[n++] = i;
        if (f->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_AUDIO && audio < 0) audio = i;
    }
    if (n != 3 || audio < 0) return 4;
    for (int i = 0; i < n; i++) for (int j = i + 1; j < n; j++)
        if (f->streams[videos[i]]->codecpar->width > f->streams[videos[j]]->codecpar->width) {
            int swap = videos[i]; videos[i] = videos[j]; videos[j] = swap;
        }
    struct demuxe_transition transition;
    demuxe_transition_init(&transition, 1, videos[0], 4 * 1024 * 1024);
    select_streams(f, &transition, audio);
    struct decoder video = {.frame = av_frame_alloc(), .representation = -1};
    struct decoder sound = {.frame = av_frame_alloc(), .representation = -1};
    AVPacket *packet = av_packet_alloc();
    int requested = 0, accepted = 0, rejected = 0;
    const double requests[] = {3, 9, 15};
    const int targets[] = {2, 1, 0};
    double max_read_ms = 0;
    while (1) {
        int64_t started = av_gettime_relative();
        ret = av_read_frame(f, packet);
        double elapsed = (av_gettime_relative() - started) / 1000.0;
        if (elapsed > max_read_ms) max_read_ms = elapsed;
        if (elapsed > 100)
            printf("{\"event\":\"demux-wait\",\"milliseconds\":%.3f,\"videoPTS\":%.9f,\"audioPTS\":%.9f,\"preparing\":%s}\n",
                   elapsed, video.last, sound.last, transition.candidate >= 0 ? "true" : "false");
        if (ret < 0) break;
        AVStream *stream = f->streams[packet->stream_index];
        if (packet->stream_index == audio) {
            if (decode(&sound, stream, packet) < 0) break;
        } else if (stream->codecpar->codec_type == AVMEDIA_TYPE_VIDEO) {
            int prior_active = transition.active;
            enum demuxe_transition_phase phase = transition.phase;
            AVPacket *owned = av_packet_alloc();
            if (!owned) { ret = AVERROR(ENOMEM); break; }
            av_packet_move_ref(owned, packet);
            demuxe_transition_push(&transition, 1, stream->index, owned, stream->time_base);
            if (transition.active != prior_active) {
                accepted++;
                printf("{\"event\":\"accepted\",\"stream\":%d,\"oldVideoPTS\":%.9f,\"audioPTS\":%.9f,\"preparedBytes\":%zu}\n",
                       transition.active, video.last, sound.last, transition.peak_bytes);
                select_streams(f, &transition, audio);
            } else if (phase == DEMUXE_PREPARING && transition.phase == DEMUXE_REJECTED) {
                rejected++;
                printf("{\"event\":\"rejected\",\"reason\":\"%s\"}\n", transition.reason);
                select_streams(f, &transition, audio);
            }
            struct demuxe_packet output;
            while ((output = demuxe_transition_take(&transition)).packet) {
                int decoded = decode(&video, f->streams[output.representation], output.packet);
                av_packet_free(&output.packet);
                if (decoded < 0) goto done;
            }
        }
        av_packet_unref(packet);
        if (!fixed && requested < 3 && video.last >= requests[requested] && transition.candidate < 0) {
            int target = videos[targets[requested]];
            assert(demuxe_transition_request(&transition, 1, requested + 1, target));
            requested++;
            select_streams(f, &transition, audio);
            printf("{\"event\":\"request\",\"stream\":%d,\"videoPTS\":%.9f}\n", target, video.last);
        }
    }
done:
    if (video.context) { avcodec_send_packet(video.context, NULL); receive(&video); }
    if (sound.context) { avcodec_send_packet(sound.context, NULL); receive(&sound); }
    int expected = fixed ? 0 : 3;
    int passed = ret == AVERROR_EOF && requested == expected && accepted == expected && !rejected &&
                 !video.errors && !sound.errors && !video.regressions && !sound.regressions &&
                 video.max_gap < 0.05 && sound.max_gap < 0.03 && video.last > 23 && sound.last > 23;
    printf("{\"event\":\"result\",\"passed\":%s,\"eof\":%s,\"formatLifetimes\":1,\"requested\":%d,\"accepted\":%d,\"rejected\":%d,"
           "\"videoFrames\":%d,\"audioFrames\":%d,\"videoChanges\":%d,\"audioChanges\":%d,\"videoRegressions\":%d,\"audioRegressions\":%d,"
           "\"videoErrors\":%d,\"audioErrors\":%d,\"videoEnd\":%.9f,\"audioEnd\":%.9f,\"videoMaxGap\":%.9f,\"audioMaxGap\":%.9f,\"peakPreparedBytes\":%zu,\"maxDemuxReadMs\":%.3f}\n",
           passed ? "true" : "false", ret == AVERROR_EOF ? "true" : "false", requested, accepted, rejected,
           video.frames, sound.frames, video.changes, sound.changes, video.regressions, sound.regressions,
           video.errors, sound.errors, video.last, sound.last, video.max_gap, sound.max_gap, transition.peak_bytes, max_read_ms);
    demuxe_transition_destroy(&transition);
    av_packet_free(&packet);
    avcodec_free_context(&video.context); avcodec_free_context(&sound.context);
    av_frame_free(&video.frame); av_frame_free(&sound.frame);
    avformat_close_input(&f);
    return passed ? 0 : 1;
}
