// SPDX-License-Identifier: GPL-3.0-or-later
#ifndef DEMUXE_CUE_BUDGET_H
#define DEMUXE_CUE_BUDGET_H
#include <stdint.h>
#include <stddef.h>
#include <errno.h>
#include <limits.h>
#define DEMUXE_CUE_SLOTS 4096
#define DEMUXE_CUE_BYTES (512u * 1024u)
#define DEMUXE_CUE_HISTORY_US 60000000LL
struct demuxe_cue_budget {
    struct {int64_t end;size_t cost;} entries[DEMUXE_CUE_SLOTS];
    size_t bytes;
};
// Called only after the owning demuxer maps a subtitle onto its accepted timeline.
// A fresh component group on seek/source replacement resets this admission state.
static inline int demuxe_cue_admit(struct demuxe_cue_budget *b,int64_t pts,int64_t duration,size_t payload){
    if(duration<0||pts>INT64_MAX-duration||payload>16384)return EINVAL;
    int64_t deadline=pts<INT64_MIN+DEMUXE_CUE_HISTORY_US?INT64_MIN:pts-DEMUXE_CUE_HISTORY_US;
    size_t cost=payload+512;int slot=-1;
    for(int i=0;i<DEMUXE_CUE_SLOTS;i++){
        if(b->entries[i].cost&&b->entries[i].end<deadline){b->bytes-=b->entries[i].cost;b->entries[i].cost=0;}
        if(!b->entries[i].cost)slot=i;
    }
    if(slot<0||cost>DEMUXE_CUE_BYTES-b->bytes)return ENOBUFS;
    b->entries[slot].end=pts+duration;b->entries[slot].cost=cost;b->bytes+=cost;return 0;
}
#endif
