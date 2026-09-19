// SPDX-License-Identifier: GPL-3.0-or-later
#include "rewind-reader.h"
#include <string.h>
#include <errno.h>
#include <libavformat/avio.h>
#include <libavutil/error.h>
int demuxe_rewind_read(void *opaque,uint8_t *out,int capacity){
    struct demuxe_rewind_reader *r=opaque;
    if(capacity<=0)return AVERROR(EINVAL);
    if(r->position<r->produced){
        int64_t available=r->produced-r->position;
        int at=r->position%DEMUXE_REWIND_BYTES;
        int n=capacity;
        if(n>available)n=available;
        if(n>DEMUXE_REWIND_BYTES-at)n=DEMUXE_REWIND_BYTES-at;
        memcpy(out,r->bytes+at,n);r->position+=n;return n;
    }
    if(capacity>DEMUXE_REWIND_BYTES)capacity=DEMUXE_REWIND_BYTES;
    if(r->produced>INT64_MAX-capacity)return AVERROR(EOVERFLOW);
    int n=r->read(r->opaque,out,capacity);
    if(n<=0)return n; // Preserve starvation, failure, cancellation and EOF.
    if(n>capacity)return AVERROR_INVALIDDATA;
    int at=r->produced%DEMUXE_REWIND_BYTES,first=n;
    if(first>DEMUXE_REWIND_BYTES-at)first=DEMUXE_REWIND_BYTES-at;
    memcpy(r->bytes+at,out,first);memcpy(r->bytes,out+first,n-first);
    r->position=r->produced+=n;return n;
}
int64_t demuxe_rewind_seek(void *opaque,int64_t offset,int whence){
    struct demuxe_rewind_reader *r=opaque;
    if(whence==AVSEEK_SIZE)return AVERROR(ENOSYS);
    whence&=~AVSEEK_FORCE;
    if(whence==SEEK_CUR){
        if((offset>0&&r->position>INT64_MAX-offset)||(offset<0&&offset< -r->position))return AVERROR(EINVAL);
        offset+=r->position;
    }else if(whence!=SEEK_SET)return AVERROR(ESPIPE);
    int64_t start=r->produced>DEMUXE_REWIND_BYTES?r->produced-DEMUXE_REWIND_BYTES:0;
    if(offset<start||offset>r->produced)return AVERROR(ESPIPE);
    return r->position=offset;
}
