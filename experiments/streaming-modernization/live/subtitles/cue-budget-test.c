// SPDX-License-Identifier: GPL-2.0-or-later
#include "task/cue-budget.h"
#include <assert.h>
#include <stdlib.h>
#include <stdio.h>
int main(void){
 struct demuxe_cue_budget *b=calloc(1,sizeof(*b));assert(b);
 for(int n=0;n<100000;n++)assert(!demuxe_cue_admit(b,n*2000000LL,2000000,32));
 assert(b->bytes<20000);free(b);b=calloc(1,sizeof(*b));assert(b);
 for(int n=0;n<32;n++)assert(!demuxe_cue_admit(b,0,INT64_MAX,15872));
 assert(b->bytes==DEMUXE_CUE_BYTES);
 assert(demuxe_cue_admit(b,0,1,1)==ENOBUFS);
 assert(demuxe_cue_admit(b,INT64_MAX,1,1)==EINVAL);
 assert(demuxe_cue_admit(b,0,-1,1)==EINVAL);
 assert(demuxe_cue_admit(b,0,1,16385)==EINVAL);
 free(b);b=calloc(1,sizeof(*b));assert(b);
 assert(!demuxe_cue_admit(b,0,1,1));assert(!demuxe_cue_admit(b,60000002,1,1));assert(b->bytes==513);
 free(b);puts("PASS rolling history, active-cue retention, density, overflow, fresh seek state");
}
