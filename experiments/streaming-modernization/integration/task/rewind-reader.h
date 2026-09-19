// SPDX-License-Identifier: GPL-3.0-or-later
#pragma once
#include <stdint.h>
// Local parser lookbehind, not arbitrary resource seeking. Memory is fixed per
// open child container; network consumption never rewinds or duplicates a read.
#define DEMUXE_REWIND_BYTES 65536
struct demuxe_rewind_reader {
    void *opaque;
    int (*read)(void *,uint8_t *,int);
    int64_t position,produced;
    uint8_t bytes[DEMUXE_REWIND_BYTES];
};
int demuxe_rewind_read(void *,uint8_t *,int);
int64_t demuxe_rewind_seek(void *,int64_t,int);
