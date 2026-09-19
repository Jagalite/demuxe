// SPDX-License-Identifier: GPL-3.0-or-later
#include "common/demuxe-quality.h"
#include <assert.h>
int main(void){struct demuxe_quality_history h={0};struct demuxe_quality_tag a={1,1,2},b={1,2,0};
 demuxe_quality_remember(&h,1,a);demuxe_quality_remember(&h,2,b);
 assert(demuxe_quality_take(&h,2).request==2);assert(demuxe_quality_take(&h,1).representation==2);assert(!demuxe_quality_take(&h,1).source);
 demuxe_quality_remember(&h,3,a);demuxe_quality_remember(&h,3,b);assert(!demuxe_quality_take(&h,3).source);
 demuxe_quality_remember(&h,4,a);assert(demuxe_quality_take(&h,4.0000001).source==1);
 for(int i=0;i<DEMUXE_QUALITY_HISTORY+1;i++)demuxe_quality_remember(&h,100+i,a);
 assert(!demuxe_quality_take(&h,100).source);assert(demuxe_quality_take(&h,101).source==1);
 memset(&h,0,sizeof(h));assert(!demuxe_quality_take(&h,102).source);return 0;}
