/* SPDX-License-Identifier: Apache-2.0
 * Experiment-only raw-frame reference from the normal FFmpeg 9.0.2 decoder.
 * Writes tightly packed planar yuv422p10le frames to stdout. */
#include <stdio.h>
#include <stdlib.h>

#include "libavcodec/avcodec.h"
#include "libavformat/avformat.h"
#include "libavutil/pixfmt.h"

static int write_frame(const AVFrame *frame, int *count)
{
    if (frame->format != AV_PIX_FMT_YUV422P10LE ||
        frame->width != 640 || frame->height != 360) {
        fprintf(stderr, "unexpected frame format/dimensions: %d %dx%d\n",
                frame->format, frame->width, frame->height);
        return -1;
    }
    for (int plane = 0; plane < 3; plane++) {
        const int row_bytes = (plane == 0 ? frame->width : frame->width / 2) * 2;
        for (int y = 0; y < frame->height; y++) {
            if (fwrite(frame->data[plane] + y * frame->linesize[plane], 1,
                       row_bytes, stdout) != row_bytes) {
                perror("raw frame write");
                return -1;
            }
        }
    }
    (*count)++;
    return 0;
}

static int receive_frames(AVCodecContext *decoder, AVFrame *frame, int *count)
{
    int ret;
    while ((ret = avcodec_receive_frame(decoder, frame)) == 0) {
        if (write_frame(frame, count) < 0) return -1;
        av_frame_unref(frame);
    }
    return ret == AVERROR(EAGAIN) || ret == AVERROR_EOF ? 0 : ret;
}

int main(int argc, char **argv)
{
    AVFormatContext *format = NULL;
    AVCodecContext *decoder = NULL;
    AVPacket *packet = NULL;
    AVFrame *frame = NULL;
    const AVCodec *codec;
    int stream, count = 0, ret = 1;
    if (argc != 2) {
        fputs("usage: decode_frames fixture.mov > frames.yuv\n", stderr);
        return 2;
    }
    if (avformat_open_input(&format, argv[1], NULL, NULL) < 0 ||
        avformat_find_stream_info(format, NULL) < 0) goto done;
    stream = av_find_best_stream(format, AVMEDIA_TYPE_VIDEO, -1, -1, NULL, 0);
    if (stream < 0 || format->streams[stream]->codecpar->codec_id != AV_CODEC_ID_PRORES)
        goto done;
    codec = avcodec_find_decoder(AV_CODEC_ID_PRORES);
    if (!codec || !(decoder = avcodec_alloc_context3(codec))) goto done;
    if (avcodec_parameters_to_context(decoder, format->streams[stream]->codecpar) < 0)
        goto done;
    decoder->thread_count = 1;
    if (avcodec_open2(decoder, codec, NULL) < 0) goto done;
    packet = av_packet_alloc();
    frame = av_frame_alloc();
    if (!packet || !frame) goto done;
    while (av_read_frame(format, packet) >= 0) {
        if (packet->stream_index == stream) {
            if (avcodec_send_packet(decoder, packet) < 0 ||
                receive_frames(decoder, frame, &count) < 0) goto done;
        }
        av_packet_unref(packet);
    }
    if (avcodec_send_packet(decoder, NULL) < 0 ||
        receive_frames(decoder, frame, &count) < 0) goto done;
    if (count != 180 || fflush(stdout)) goto done;
    fprintf(stderr, "decoded_frames=%d decoder=%s\n", count, codec->name);
    ret = 0;
done:
    if (ret) fputs("normal FFmpeg decoder failed\n", stderr);
    av_frame_free(&frame);
    av_packet_free(&packet);
    avcodec_free_context(&decoder);
    avformat_close_input(&format);
    return ret;
}
