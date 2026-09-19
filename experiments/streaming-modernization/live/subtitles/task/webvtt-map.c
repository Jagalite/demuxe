// SPDX-License-Identifier: GPL-3.0-or-later
#include "webvtt-map.h"
#include <string.h>
#include <limits.h>
#include <libavutil/error.h>
static int number(const char **text,const char *end,uint64_t limit,uint64_t *value,int *digits){
    const char *p=*text;uint64_t n=0;int count=0;
    while(p<end&&*p>='0'&&*p<='9'){
        if(n>(limit-(*p-'0'))/10)return AVERROR_INVALIDDATA;
        n=n*10+(*p++-'0');count++;
    }
    if(!count)return AVERROR_INVALIDDATA;
    *text=p;*value=n;if(digits)*digits=count;return 0;
}
static int local_time(const char *p,const char *end,int64_t *value){
    uint64_t hours,minutes,seconds,millis;int digits;
    if(number(&p,end,INT64_MAX/3600000000LL,&hours,&digits)<0||digits<2||p==end||*p++!=':')return AVERROR_INVALIDDATA;
    if(number(&p,end,59,&minutes,&digits)<0||digits!=2||p==end||*p++!=':')return AVERROR_INVALIDDATA;
    if(number(&p,end,59,&seconds,&digits)<0||digits!=2||p==end||*p++!='.')return AVERROR_INVALIDDATA;
    if(number(&p,end,999,&millis,&digits)<0||digits!=3||p!=end)return AVERROR_INVALIDDATA;
    __int128 result=(__int128)hours*3600000000LL+minutes*60000000+seconds*1000000+millis*1000;
    if(result>INT64_MAX)return AVERROR_INVALIDDATA;*value=result;return 0;
}
int demuxe_webvtt_header(const char *text,size_t size,struct demuxe_webvtt_map *out){
    *out=(struct demuxe_webvtt_map){0};const char *p=text,*end=text+size;
    while(p<end){
        const char *line=p;while(p<end&&*p!='\r'&&*p!='\n')p++;const char *stop=p;
        if(p<end&&*p=='\r')p++;if(p<end&&*p=='\n')p++;
        if(stop==line)break;
        const char prefix[]="X-TIMESTAMP-MAP=";
        if((size_t)(stop-line)<sizeof(prefix)-1||memcmp(line,prefix,sizeof(prefix)-1))continue;
        if(out->present)return AVERROR_INVALIDDATA;
        line+=sizeof(prefix)-1;int local=0,mpeg=0;
        while(line<stop){
            const char *comma=memchr(line,',',stop-line),*last=comma?comma:stop;
            if(last-line>6&&!memcmp(line,"LOCAL:",6)){
                if(local++||local_time(line+6,last,&out->local_us)<0)return AVERROR_INVALIDDATA;
            }else if(last-line>7&&!memcmp(line,"MPEGTS:",7)){
                const char *number_at=line+7;
                if(mpeg++||number(&number_at,last,((uint64_t)1<<33)-1,&out->mpegts,NULL)<0||number_at!=last)return AVERROR_INVALIDDATA;
            }else return AVERROR_INVALIDDATA;
            if(!comma)break;line=comma+1;if(line==stop)return AVERROR_INVALIDDATA;
        }
        if(local!=1||mpeg!=1)return AVERROR_INVALIDDATA;out->present=1;
    }
    return 0;
}
int demuxe_webvtt_timestamp(const struct demuxe_webvtt_map *map,int64_t cue,int64_t reference,int64_t *out){
    if(!map->present){*out=cue;return 0;}
    // Unwrap the 33-bit media clock near this accepted segment's raw video
    // timeline, preserving its shared discontinuity offset in the owner.
    __int128 base=(__int128)map->mpegts*1000000+((__int128)cue-map->local_us)*90000;
    __int128 wrap=((__int128)1<<33)*1000000,delta=(__int128)reference*90000-base;
    __int128 epoch=delta>=0?(delta+wrap/2)/wrap:-((-delta+wrap/2)/wrap);
    __int128 value=base+epoch*wrap;value=value>=0?(value+45000)/90000:-((-value+45000)/90000);
    if(value<INT64_MIN||value>INT64_MAX)return AVERROR_INVALIDDATA;*out=value;return 0;
}
