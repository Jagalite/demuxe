/* SPDX-License-Identifier: Apache-2.0
 * Read first decoded-frame color metadata with the locked FFmpeg 9.0.2 build. */
#include <stdio.h>

#include "libavcodec/avcodec.h"
#include "libavformat/avformat.h"
#include "libavutil/pixdesc.h"

int main(int argc, char **argv)
{
    AVFormatContext *format = NULL;
    AVCodecContext *decoder = NULL;
    AVPacket *packet = NULL;
    AVFrame *frame = NULL;
    const AVCodec *codec;
    int stream, result = 1;
    if (argc != 2) return 2;
    if (avformat_open_input(&format, argv[1], NULL, NULL) < 0 ||
        avformat_find_stream_info(format, NULL) < 0) goto done;
    stream = av_find_best_stream(format, AVMEDIA_TYPE_VIDEO, -1, -1, NULL, 0);
    if (stream < 0 || format->streams[stream]->codecpar->codec_id != AV_CODEC_ID_PRORES)
        goto done;
    codec = avcodec_find_decoder(AV_CODEC_ID_PRORES);
    if (!codec || !(decoder = avcodec_alloc_context3(codec))) goto done;
    if (avcodec_parameters_to_context(decoder, format->streams[stream]->codecpar) < 0 ||
        avcodec_open2(decoder, codec, NULL) < 0) goto done;
    packet = av_packet_alloc();frame = av_frame_alloc();
    if (!packet || !frame) goto done;
    while (av_read_frame(format, packet) >= 0) {
        if (packet->stream_index == stream) {
            if (avcodec_send_packet(decoder, packet) < 0) goto done;
            if (avcodec_receive_frame(decoder, frame) == 0) {
                printf("{\"width\":%d,\"height\":%d,\"pixelFormat\":\"%s\","
                       "\"matrixCode\":%d,\"rangeCode\":%d,"
                       "\"primariesCode\":%d,\"transferCode\":%d,"
                       "\"chromaLocationCode\":%d,\"sampleAspectRatio\":\"%d:%d\"}\n",
                       frame->width, frame->height, av_get_pix_fmt_name(frame->format),
                       frame->colorspace, frame->color_range, frame->color_primaries,
                       frame->color_trc, frame->chroma_location,
                       frame->sample_aspect_ratio.num, frame->sample_aspect_ratio.den);
                result = 0;
                break;
            }
        }
        av_packet_unref(packet);
    }
done:
    if (result) fputs("FFmpeg color probe failed\n", stderr);
    av_frame_free(&frame);av_packet_free(&packet);
    avcodec_free_context(&decoder);avformat_close_input(&format);
    return result;
}
