/* SPDX-License-Identifier: Apache-2.0
 * Validation-only FFmpeg 9.0.2 swscale RGBA reference from decoded YUV. */
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "libavutil/pixfmt.h"
#include "libswscale/swscale.h"

int main(int argc, char **argv)
{
    if (argc != 7) {
        fputs("usage: reference_rgb frames.yuv frame width height 709|601 limited|full\n", stderr);
        return 2;
    }
    const int frame = atoi(argv[2]), width = atoi(argv[3]), height = atoi(argv[4]);
    const int matrix = !strcmp(argv[5], "709") ? SWS_CS_ITU709 :
                       !strcmp(argv[5], "601") ? SWS_CS_ITU601 : -1;
    const int full = !strcmp(argv[6], "full") ? 1 :
                     !strcmp(argv[6], "limited") ? 0 : -1;
    if (frame < 0 || width < 2 || width % 2 || height < 1 ||
        matrix < 0 || full < 0) return 2;
    const size_t frame_bytes = (size_t)width * height * 4;
    FILE *source = fopen(argv[1], "rb");
    uint8_t *yuv = malloc(frame_bytes), *rgba = malloc(frame_bytes);
    struct SwsContext *sws = NULL;
    int ret = 1;
    if (!source || !yuv || !rgba) goto done;
    if (fseeko(source, (off_t)frame * frame_bytes, SEEK_SET) ||
        fread(yuv, 1, frame_bytes, source) != frame_bytes) goto done;
    sws = sws_getContext(width, height, AV_PIX_FMT_YUV422P10LE,
                         width, height, AV_PIX_FMT_RGBA, SWS_BILINEAR,
                         NULL, NULL, NULL);
    if (!sws) goto done;
    const int *coefficients = sws_getCoefficients(matrix);
    if (sws_setColorspaceDetails(sws, coefficients, full,
                                 coefficients, 1, 0, 1 << 16, 1 << 16) < 0)
        goto done;
    const uint8_t *planes[4] = {yuv, yuv + (size_t)width * height * 2,
        yuv + (size_t)width * height * 3, NULL};
    const int input_stride[4] = {width * 2, width, width, 0};
    uint8_t *output_planes[4] = {rgba, NULL, NULL, NULL};
    const int output_stride[4] = {width * 4, 0, 0, 0};
    if (sws_scale(sws, planes, input_stride, 0, height,
                  output_planes, output_stride) != height)
        goto done;
    if (fwrite(rgba, 1, frame_bytes, stdout) != frame_bytes || fflush(stdout))
        goto done;
    ret = 0;
done:
    if (ret) fputs("FFmpeg 9.0.2 RGB reference failed\n", stderr);
    sws_freeContext(sws);
    if (source) fclose(source);
    free(yuv);free(rgba);
    return ret;
}
