/* SPDX-License-Identifier: LGPL-2.1-or-later */
#include "periods.h"
#include <errno.h>
#include <limits.h>
#include <stdio.h>
#include <string.h>
#include <libavutil/avutil.h>
#include <libavutil/mathematics.h>
/* DASH uses fixed durations. Calendar years/months have no exact duration on
 * the media timeline and are deliberately rejected. No floating point parse. */
int demuxe_dash_duration_us(const char *s,int64_t *out)
{
    if(!s||*s++!='P')return AVERROR_INVALIDDATA;
    int time=0,seen=0,order=0;int64_t total=0;
    while(*s){
        if(*s=='T'){if(time)return AVERROR_INVALIDDATA;time=1;s++;if(!*s)return AVERROR_INVALIDDATA;continue;}
        if(*s<'0'||*s>'9')return AVERROR_INVALIDDATA;
        int64_t whole=0,fraction=0,scale=1;
        while(*s>='0'&&*s<='9'){int d=*s++-'0';if(whole>(INT64_MAX-d)/10)return AVERROR_INVALIDDATA;whole=whole*10+d;}
        if(*s=='.'){
            s++;if(*s<'0'||*s>'9')return AVERROR_INVALIDDATA;
            while(*s>='0'&&*s<='9'){
                int d=*s++-'0';
                if(scale<1000000){fraction=fraction*10+d;scale*=10;}
                else if(d)return AVERROR(ENOSYS); /* reject precision loss */
            }
        }
        int rank;int64_t seconds;
        if(*s=='D'&&!time){rank=1;seconds=86400;}
        else if(*s=='H'&&time){rank=2;seconds=3600;}
        else if(*s=='M'&&time){rank=3;seconds=60;}
        else if(*s=='S'&&time){rank=4;seconds=1;}
        else return AVERROR_INVALIDDATA;
        if(rank<=order)return AVERROR_INVALIDDATA;
        order=rank;seen=1;s++;if(fraction&&*s)return AVERROR_INVALIDDATA;
        if(whole>INT64_MAX/(seconds*1000000))return AVERROR_INVALIDDATA;
        int64_t value=whole*seconds*1000000,part=fraction*seconds*(1000000/scale);
        if(value>INT64_MAX-part||total>INT64_MAX-value-part)return AVERROR_INVALIDDATA;
        total+=value+part;
    }
    if(!seen)return AVERROR_INVALIDDATA;
    *out=total;return 0;
}
static int duration_property(xmlNodePtr node,const char *name,int64_t *value)
{
    xmlChar *text=xmlGetProp(node,(const xmlChar*)name);if(!text){*value=AV_NOPTS_VALUE;return 0;}
    int r=demuxe_dash_duration_us((const char*)text,value);xmlFree(text);return r;
}
int demuxe_dash_collect_periods(xmlNodePtr root,struct demuxe_dash_periods *out)
{
    if(!root||xmlStrcmp(root->name,(const xmlChar*)"MPD"))return AVERROR_INVALIDDATA;
    memset(out,0,sizeof(*out));
    xmlChar *kind=xmlGetProp(root,(const xmlChar*)"type");
    if(kind&&xmlStrcmp(kind,(const xmlChar*)"dynamic")&&xmlStrcmp(kind,(const xmlChar*)"static")){xmlFree(kind);return AVERROR_INVALIDDATA;}
    out->dynamic=kind&&!xmlStrcmp(kind,(const xmlChar*)"dynamic");xmlFree(kind);
    int r=duration_property(root,"mediaPresentationDuration",&out->duration_us);if(r<0)return r;
    for(xmlNodePtr n=xmlFirstElementChild(root);n;n=xmlNextElementSibling(n)){
        if(xmlStrcmp(n->name,(const xmlChar*)"Period"))continue;
        if(xmlHasNsProp(n,(const xmlChar*)"href",(const xmlChar*)"http://www.w3.org/1999/xlink"))return AVERROR(ENOSYS);
        if(out->count==DEMUXE_DASH_PERIOD_LIMIT)return AVERROR(ENOBUFS);
        struct demuxe_dash_period *p=&out->values[out->count];p->node=n;
        r=duration_property(n,"start",&p->start_us);if(r<0)return r;
        r=duration_property(n,"duration",&p->duration_us);if(r<0)return r;
        if(p->start_us==AV_NOPTS_VALUE){
            if(!out->count)p->start_us=0;
            else{
                struct demuxe_dash_period *previous=p-1;
                if(previous->duration_us==AV_NOPTS_VALUE||previous->start_us>INT64_MAX-previous->duration_us)return AVERROR_INVALIDDATA;
                p->start_us=previous->start_us+previous->duration_us;
            }
        }
        if(out->count){
            struct demuxe_dash_period *previous=p-1;
            if(p->start_us<=previous->start_us)return AVERROR_INVALIDDATA;
            if(previous->duration_us==AV_NOPTS_VALUE)previous->duration_us=p->start_us-previous->start_us;
            else if(previous->duration_us>p->start_us-previous->start_us)return AVERROR_INVALIDDATA;
        }
        xmlChar *id=xmlGetProp(n,(const xmlChar*)"id");
        if(id){size_t length=strlen((const char*)id);if(!length||length>=sizeof(p->id)){xmlFree(id);return AVERROR_INVALIDDATA;}memcpy(p->id,id,length+1);xmlFree(id);}
        else snprintf(p->id,sizeof(p->id),"start:%lld",(long long)p->start_us);
        for(int i=0;i<out->count;i++)if(!strcmp(p->id,out->values[i].id))return AVERROR_INVALIDDATA;
        out->count++;
    }
    if(!out->count)return AVERROR_INVALIDDATA;
    struct demuxe_dash_period *last=&out->values[out->count-1];
    if(last->duration_us==AV_NOPTS_VALUE&&out->duration_us!=AV_NOPTS_VALUE){
        if(out->duration_us<=last->start_us)return AVERROR_INVALIDDATA;
        last->duration_us=out->duration_us-last->start_us;
    }
    for(int i=0;i<out->count;i++){
        struct demuxe_dash_period *p=&out->values[i];
        if(p->duration_us==AV_NOPTS_VALUE){if(!out->dynamic)return AVERROR_INVALIDDATA;continue;}
        if(p->duration_us<=0||p->start_us>INT64_MAX-p->duration_us)return AVERROR_INVALIDDATA;
        if(out->duration_us!=AV_NOPTS_VALUE&&p->start_us+p->duration_us>out->duration_us)return AVERROR_INVALIDDATA;
    }
    return 0;
}
int demuxe_dash_map_timestamp(int64_t ticks,int64_t offset,int timescale,int64_t start,int64_t *out)
{
    if(timescale<=0||offset<0||start<0||ticks<INT64_MIN+offset)return AVERROR_INVALIDDATA;
    int64_t mapped=av_rescale_rnd(ticks-offset,1000000,timescale,AV_ROUND_NEAR_INF);
    if(mapped==INT64_MIN||mapped>INT64_MAX-start)return AVERROR_INVALIDDATA;
    *out=mapped+start;return 0;
}
