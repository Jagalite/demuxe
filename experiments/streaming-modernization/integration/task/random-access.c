// SPDX-License-Identifier: GPL-3.0-or-later
#include "random-access.h"
#include <stdint.h>
int demuxe_h264_random_access(const AVPacket *packet,const AVCodecParameters *codec){
    if(!packet||!codec||codec->codec_id!=AV_CODEC_ID_H264||!(packet->flags&AV_PKT_FLAG_KEY)||
       codec->extradata_size<5||!codec->extradata||codec->extradata[0]!=1||packet->size<=0||!packet->data)return 0;
    unsigned length=(codec->extradata[4]&3)+1;size_t at=0,size=packet->size;int idr=0;
    while(at<size){
        if(size-at<length)return 0;uint32_t n=0;
        for(unsigned i=0;i<length;i++)n=(n<<8)|packet->data[at++];
        if(!n||n>size-at)return 0;
        unsigned type=packet->data[at]&31;
        if(packet->data[at]&128)return 0;
        if(type>=1&&type<=4)return 0; // A non-IDR slice invalidates closed-GOP admission.
        if(type==5)idr=1;
        at+=n;
    }
    return idr;
}
