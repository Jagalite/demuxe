// SPDX-License-Identifier: GPL-3.0-or-later
// LAB ONLY. Compile as the replacement client.c translation unit.
#include "/Volumes/seed2/Projects/webmpv/build/sources/mpv/player/client.c"
#include <emscripten.h>
#include "sub/dec_sub.h"
#include "sub/osd.h"
static mpv_handle *lab;
extern void web_subtitle_size(int,int);
extern void web_subtitle_render(struct osd_state *,double);
EMSCRIPTEN_KEEPALIVE int lab_create(void) {
 lab=mpv_create();if(!lab)return -1;
 const char *opts[][2]={{"config","no"},{"terminal","no"},{"idle","yes"},{"keep-open","yes"},{"pause","yes"},{"track-auto-selection","no"},{"vid","no"},{"aid","no"},{"sub-fonts-dir","/fonts"},{"sub-font","DejaVu Sans"},{"sub-ass-override","no"},{"demuxer-max-bytes","4194304"},{"demuxer-max-back-bytes","1048576"},{"cache","no"},{"access-references","no"}};
 for(unsigned i=0;i<sizeof(opts)/sizeof(opts[0]);i++){int r=mpv_set_option_string(lab,opts[i][0],opts[i][1]);if(r<0)return r;}
 return mpv_initialize(lab);
}
EMSCRIPTEN_KEEPALIVE int lab_open(void){const char *cmd[]={"loadfile","/media.mkv","replace",NULL};return mpv_command(lab,cmd);}
EMSCRIPTEN_KEEPALIVE int lab_loaded(void){int r=0;mpv_event *e;while((e=mpv_wait_event(lab,0))->event_id){if(e->event_id==MPV_EVENT_FILE_LOADED)r=1;if(e->event_id==MPV_EVENT_END_FILE&&((mpv_event_end_file*)e->data)->error<0)r=-1;}return r;}
EMSCRIPTEN_KEEPALIVE int lab_select(int id){int64_t no=-2,n=id;mpv_set_property(lab,"sid",MPV_FORMAT_INT64,&no);return mpv_set_property(lab,"sid",MPV_FORMAT_INT64,&n);}
EMSCRIPTEN_KEEPALIVE int lab_render(double pts,int w,int h) {
 lock_core(lab);struct MPContext *m=lab->mpctx;
 int r=-1;
 if(m->playback_initialized && m->current_track[0][STREAM_SUB] && m->current_track[0][STREAM_SUB]->d_sub){
  m->playback_pts=pts;
  bool ready=update_subtitles(m,pts);
  web_subtitle_size(w,h);web_subtitle_render(m->osd,pts);r=ready?1:0;
 }
 unlock_core(lab);return r;
}
EMSCRIPTEN_KEEPALIVE int lab_seek(double pts){char time[64];snprintf(time,sizeof(time),"%.6f",pts);const char *c[]={"seek",time,"absolute+exact",NULL};return mpv_command(lab,c);}
EMSCRIPTEN_KEEPALIVE int lab_av_chains(void){lock_core(lab);int n=!!lab->mpctx->vo_chain+!!lab->mpctx->ao_chain;unlock_core(lab);return n;}
EMSCRIPTEN_KEEPALIVE int lab_delay(double delay){return mpv_set_property(lab,"sub-delay",MPV_FORMAT_DOUBLE,&delay);}
EMSCRIPTEN_KEEPALIVE void lab_close(void){if(lab){mpv_terminate_destroy(lab);lab=NULL;}}
