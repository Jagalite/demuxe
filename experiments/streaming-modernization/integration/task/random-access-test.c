// SPDX-License-Identifier: GPL-3.0-or-later
#include "random-access.h"
#include <assert.h>
int main(void){
    uint8_t extra[]={1,100,0,31,255};uint8_t bytes[]={0,0,0,2,0x65,0};
    AVCodecParameters c={.codec_id=AV_CODEC_ID_H264,.extradata=extra,.extradata_size=5};
    AVPacket p={.data=bytes,.size=6,.flags=AV_PKT_FLAG_KEY};
    assert(demuxe_h264_random_access(&p,&c));
    bytes[4]=0x41;assert(!demuxe_h264_random_access(&p,&c));bytes[4]=0x65;
    p.flags=0;assert(!demuxe_h264_random_access(&p,&c));p.flags=AV_PKT_FLAG_KEY;
    bytes[3]=3;assert(!demuxe_h264_random_access(&p,&c));bytes[3]=0;assert(!demuxe_h264_random_access(&p,&c));bytes[3]=2;
    p.size=5;assert(!demuxe_h264_random_access(&p,&c));p.size=6;
    c.codec_id=AV_CODEC_ID_HEVC;assert(!demuxe_h264_random_access(&p,&c));c.codec_id=AV_CODEC_ID_H264;
    bytes[4]=0xe5;assert(!demuxe_h264_random_access(&p,&c));bytes[4]=0x65;
    uint8_t mixed[]={0,0,0,2,0x65,0,0,0,0,2,0x41,0};p.data=mixed;p.size=12;assert(!demuxe_h264_random_access(&p,&c));
    return 0;
}
