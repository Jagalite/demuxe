// SPDX-License-Identifier: GPL-2.0-or-later
#include "webvtt-map.h"
#include <assert.h>
#include <stdio.h>
#include <string.h>
static struct demuxe_webvtt_map parse(const char *text){struct demuxe_webvtt_map map;assert(!demuxe_webvtt_header(text,strlen(text),&map));return map;}
static void invalid(const char *text){struct demuxe_webvtt_map map;assert(demuxe_webvtt_header(text,strlen(text),&map)<0);}
int main(void){
 int64_t value;struct demuxe_webvtt_map map=parse("WEBVTT\n\n");assert(!map.present);
 map=parse("WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:00:02.000,MPEGTS:900000\n\n");assert(map.present&&map.local_us==2000000&&map.mpegts==900000);
 assert(!demuxe_webvtt_timestamp(&map,2250000,10000000,&value)&&value==10250000);
 map=parse("WEBVTT\r\nX-TIMESTAMP-MAP=MPEGTS:180000,LOCAL:00:00:00.000\r\n\r\n");
 assert(!demuxe_webvtt_timestamp(&map,250000,95445000000LL,&value)&&value==95445967689LL);
 map=parse("WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:8589844592,LOCAL:00:00:00.000\n\n");
 assert(!demuxe_webvtt_timestamp(&map,250000,-1000000,&value)&&value==-750000);
 invalid("WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:00:00.000,MPEGTS:8589934592\n\n");
 invalid("WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:60:00.000,MPEGTS:1\n\n");
 invalid("WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:00:00.00,MPEGTS:1\n\n");
 invalid("WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:00:00.000\n\n");
 invalid("WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:00:00.000,MPEGTS:1,MPEGTS:2\n\n");
 invalid("WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:00:00.000,MPEGTS:1\nX-TIMESTAMP-MAP=LOCAL:00:00:00.000,MPEGTS:1\n\n");
 puts("WebVTT map parsing, media clock mapping, wrap and validation passed");return 0;
}
