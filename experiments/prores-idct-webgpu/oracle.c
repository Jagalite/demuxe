/* SPDX-License-Identifier: Apache-2.0
 * Experiment-only batch oracle calling the locked FFmpeg 9.0.2 ProRes DSP.
 * Input: repeated 64 little-endian i16 coefficients + 64 little-endian i16
 * scaled quantizers. Output: repeated 64 little-endian u16 pixels. */
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

#include "libavcodec/proresdsp.h"

int main(void)
{
    ProresDSPContext dsp = {0};
    int16_t block[64], qmat[64];
    uint16_t pixels[64];
    ff_proresdsp_init(&dsp, 10);
    if (!dsp.idct_put) {
        fputs("FFmpeg ProRes 10-bit IDCT unavailable\n", stderr);
        return 2;
    }
    for (;;) {
        size_t n = fread(block, sizeof(block[0]), 64, stdin);
        if (!n && feof(stdin)) break;
        if (n != 64 || fread(qmat, sizeof(qmat[0]), 64, stdin) != 64) {
            fputs("truncated oracle input\n", stderr);
            return 2;
        }
        dsp.idct_put(pixels, 16, block, qmat);
        if (fwrite(pixels, sizeof(pixels[0]), 64, stdout) != 64) {
            perror("oracle output");
            return 2;
        }
    }
    if (ferror(stdin) || fflush(stdout)) {
        perror("oracle stream");
        return 2;
    }
    return 0;
}
