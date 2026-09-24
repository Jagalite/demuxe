// SPDX-License-Identifier: Apache-2.0
// Test-only timing probes. The production subtitle service is included unchanged.
#include "../../native/subtitles/service.c"
#include <math.h>

EMSCRIPTEN_KEEPALIVE int subtitle_poc_current(double *out) {
 if (!subtitle_service || !out) return -1;
 double start=NAN,end=NAN;
 int a=mpv_get_property(subtitle_service,"sub-start/full",MPV_FORMAT_DOUBLE,&start);
 int b=mpv_get_property(subtitle_service,"sub-end/full",MPV_FORMAT_DOUBLE,&end);
 out[0]=start;out[1]=end;
 return (a>=0?1:0)|(b>=0?2:0);
}

// mpv's subtitle-step control queries its existing in-memory event timeline.
// The control writes a target timestamp but does not seek or change the track.
EMSCRIPTEN_KEEPALIVE int subtitle_poc_step(double now,int skip,double *out) {
 if(!subtitle_service || !out || skip==0)return -1;
 lock_core(subtitle_service);
 struct MPContext *m=subtitle_service->mpctx;
 struct track *track=m->current_track[0][STREAM_SUB];
 struct dec_sub *sub=track?track->d_sub:NULL;
 double a[2]={now,skip};
 int r=sub?sub_control(sub,SD_CTRL_SUB_STEP,a):0;
 unlock_core(subtitle_service);
 *out=r>0?a[0]:NAN;
 return r;
}

// mpv's sub-lines is an in-memory text event list. Copy timestamps only.
EMSCRIPTEN_KEEPALIVE int subtitle_poc_lines(double *out,int capacity) {
 if (!subtitle_service || !out || capacity<1 || capacity>512) return -1;
 mpv_node node={0};
 int error=mpv_get_property(subtitle_service,"sub-lines",MPV_FORMAT_NODE,&node);
 if(error<0)return error;
 int count=0;
 if(node.format==MPV_FORMAT_NODE_ARRAY && node.u.list){
  for(int i=0;i<node.u.list->num && count<capacity;i++){
   mpv_node *line=&node.u.list->values[i];
   if(line->format!=MPV_FORMAT_NODE_MAP || !line->u.list)continue;
   double start=NAN,end=NAN;
   for(int j=0;j<line->u.list->num;j++){
    char *key=line->u.list->keys[j];mpv_node *value=&line->u.list->values[j];
    if(value->format!=MPV_FORMAT_DOUBLE)continue;
    if(strcmp(key,"start")==0)start=value->u.double_;
    if(strcmp(key,"end")==0)end=value->u.double_;
   }
   if(isfinite(start)){out[2*count]=start;out[2*count+1]=end;count++;}
  }
 }
 mpv_free_node_contents(&node);
 return count;
}
