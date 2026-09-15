/* SPDX-License-Identifier: LGPL-2.1-or-later */
#include "periods.h"
#include <assert.h>
#include <string.h>
#include <libavutil/avutil.h>
static int parse(const char *text,struct demuxe_dash_periods *p){
 xmlDocPtr doc=xmlReadMemory(text,strlen(text),"fixture.mpd",NULL,XML_PARSE_NONET);assert(doc);
 int r=demuxe_dash_collect_periods(xmlDocGetRootElement(doc),p);xmlFreeDoc(doc);return r;
}
int main(void){
 int64_t n;assert(!demuxe_dash_duration_us("P1DT2H3M4.125S",&n)&&n==93784125000LL);
 assert(!demuxe_dash_duration_us("PT0.000001S",&n)&&n==1);
 for(const char **s=(const char*[]){"PT","P1M","PT1S2H","PT1.5H30M","PT-1S","PT0.0000001S","PT999999999999999999999999S",NULL};*s;s++)assert(demuxe_dash_duration_us(*s,&n)<0);
 assert(!demuxe_dash_duration_us("PT1.5H",&n)&&n==5400000000LL);
 struct demuxe_dash_periods p;
 assert(!parse("<MPD type='static' mediaPresentationDuration='PT4.5S'><Period id='a' duration='PT1.25S'/><Period id='b' duration='PT2.5S'/><Period id='c'/></MPD>",&p));
 assert(p.count==3&&p.values[1].start_us==1250000&&p.values[2].start_us==3750000&&p.values[2].duration_us==750000);
 assert(!parse("<MPD type='dynamic'><Period id='live' start='PT100.125S'/></MPD>",&p)&&p.values[0].duration_us==AV_NOPTS_VALUE);
 assert(parse("<MPD><Period id='a' duration='PT2S'/><Period id='a' duration='PT2S'/></MPD>",&p)<0);
 assert(parse("<MPD><Period duration='PT2S'/><Period start='PT1S' duration='PT2S'/></MPD>",&p)<0);
 assert(!demuxe_dash_map_timestamp(90000,45000,90000,1250000,&n)&&n==1750000);
 assert(!demuxe_dash_map_timestamp(44000,45000,90000,1250000,&n)&&n==1238889); /* retained preroll */
 assert(demuxe_dash_map_timestamp(INT64_MIN,1,90000,0,&n)<0);
 assert(demuxe_dash_map_timestamp(INT64_MAX,0,1,1,&n)<0);
 return 0;
}
