// SPDX-License-Identifier: GPL-3.0-or-later
// Native libavformat characterization only: no mpv clock, decoding or playback.
#include <libavformat/avformat.h>
#include <libavutil/error.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int fail(int code) {
    char text[AV_ERROR_MAX_STRING_SIZE];
    av_strerror(code, text, sizeof(text));
    fprintf(stderr, "%s\n", text);
    return 1;
}

int main(int argc, char **argv) {
    if (argc != 2 && argc != 3) return 2;
    AVFormatContext *format = NULL;
    AVDictionary *options = NULL;
    av_dict_set(&options, "strict", "experimental", 0);
    av_dict_set(&options, "extension_picky", "0", 0);
    int ret = avformat_open_input(&format, argv[1], NULL, &options);
    av_dict_free(&options);
    if (ret < 0) return fail(ret);
    ret = avformat_find_stream_info(format, NULL);
    if (ret < 0) { avformat_close_input(&format); return fail(ret); }
    if (argc == 3 && !strcmp(argv[2], "--seek")) {
        ret = av_seek_frame(format, -1, 4 * AV_TIME_BASE, AVSEEK_FLAG_BACKWARD);
        printf("{\"event\":\"live-seek\",\"target\":4,\"result\":%d}\n", ret);
        avformat_close_input(&format);
        return ret < 0 ? fail(ret) : 0;
    }
    int videos[64], count = 0, audio = -1;
    for (unsigned i = 0; i < format->nb_streams; i++) {
        AVStream *stream = format->streams[i];
        if (stream->codecpar->codec_type == AVMEDIA_TYPE_VIDEO && count < 64)
            videos[count++] = i;
        if (stream->codecpar->codec_type == AVMEDIA_TYPE_AUDIO && audio < 0)
            audio = i;
        stream->discard = AVDISCARD_ALL;
    }
    if (count < 2) { avformat_close_input(&format); return 3; }
    int selected = videos[0], phase = 0, announced = 0;
    format->streams[selected]->discard = AVDISCARD_DEFAULT;
    if (audio >= 0) format->streams[audio]->discard = AVDISCARD_DEFAULT;
    AVPacket *packet = av_packet_alloc();
    if (!packet) { avformat_close_input(&format); return 4; }
    double audio_end = 0;
    while ((ret = av_read_frame(format, packet)) >= 0) {
        AVStream *stream = format->streams[packet->stream_index];
        double pts = packet->pts == AV_NOPTS_VALUE ? -1 : packet->pts * av_q2d(stream->time_base);
        if (packet->stream_index == audio && pts > audio_end) audio_end = pts;
        if (packet->stream_index == selected && pts >= 0) {
            if (!announced) {
                printf("{\"event\":\"first-packet\",\"phase\":%d,\"stream\":%d,\"pts\":%.6f,\"key\":%s,\"audioPTS\":%.6f}\n",
                       phase, selected, pts, packet->flags & AV_PKT_FLAG_KEY ? "true" : "false", audio_end);
                announced = 1;
            }
            if ((phase == 0 && pts >= 5) || (phase == 1 && pts >= 10)) {
                format->streams[selected]->discard = AVDISCARD_ALL;
                selected = phase == 0 ? videos[count - 1] : videos[0];
                format->streams[selected]->discard = AVDISCARD_DEFAULT;
                phase++;
                announced = 0;
                printf("{\"event\":\"request\",\"phase\":%d,\"stream\":%d,\"pts\":%.6f}\n", phase, selected, pts);
            }
        }
        av_packet_unref(packet);
    }
    printf("{\"event\":\"end\",\"phase\":%d,\"audioPTS\":%.6f,\"eof\":%s}\n", phase, audio_end, ret == AVERROR_EOF ? "true" : "false");
    av_packet_free(&packet);
    avformat_close_input(&format);
    return ret == AVERROR_EOF && phase == 2 && announced ? 0 : 1;
}
