// SPDX-License-Identifier: GPL-2.0-or-later
#pragma once
#include <stdint.h>
#include <math.h>
#include <string.h>
// Internal identity travels with packets and frames. Zero source means unknown.
struct demuxe_quality_tag {uint64_t source,request;int representation;};
#define DEMUXE_QUALITY_HISTORY 512
struct demuxe_quality_history {
    unsigned next;
    struct {double pts;struct demuxe_quality_tag tag;} entries[DEMUXE_QUALITY_HISTORY];
};
static inline void demuxe_quality_remember(struct demuxe_quality_history *h,double pts,struct demuxe_quality_tag tag){
    if(!tag.source||!isfinite(pts))return;
    // This history labels output; exhaustion degrades to unknown, never infers
    // the requested representation or invents a playback timeline.
    unsigned at=h->next++%DEMUXE_QUALITY_HISTORY;
    h->entries[at].pts=pts;h->entries[at].tag=tag;
}
static inline struct demuxe_quality_tag demuxe_quality_take(struct demuxe_quality_history *h,double pts){
    struct demuxe_quality_tag result={0};int found=-1;
    if(!isfinite(pts))return result;
    for(unsigned i=0;i<DEMUXE_QUALITY_HISTORY;i++){
        if(!h->entries[i].tag.source||fabs(h->entries[i].pts-pts)>0.0000005)continue;
        if(found>=0){ // Ambiguous timestamps must not mislabel a frame.
            h->entries[i].tag.source=0;h->entries[found].tag.source=0;result.source=0;
        }else{found=i;result=h->entries[i].tag;}
    }
    if(found>=0)h->entries[found].tag.source=0;
    return result;
}
