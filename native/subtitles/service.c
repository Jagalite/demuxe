// SPDX-License-Identifier: GPL-3.0-or-later
// Pinned mpv client translation unit with timestamp-driven subtitle ownership.
#include "player/client.c"
#include <emscripten.h>
#include "stream_bridge.h"
#include "sub/dec_sub.h"
#include "sub/osd.h"
#include "demux/demux.h"
static mpv_handle *subtitle_service;
extern void web_subtitle_size(int,int);
extern void web_subtitle_render(struct osd_state *,double);
EMSCRIPTEN_KEEPALIVE int subtitle_service_create(void) {
 subtitle_service=mpv_create();if(!subtitle_service)return -1;
 const char *opts[][2]={{"config","no"},{"terminal","no"},{"idle","yes"},{"keep-open","yes"},{"pause","yes"},{"track-auto-selection","no"},{"vid","no"},{"aid","no"},{"sub-fonts-dir","/fonts"},{"sub-font","DejaVu Sans"},{"sub-ass-override","no"},{"demuxer-max-bytes","4194304"},{"demuxer-max-back-bytes","1048576"},{"cache","no"},{"demuxer-readahead-secs","0"},{"access-references","no"}};
 for(unsigned i=0;i<sizeof(opts)/sizeof(opts[0]);i++){int r=mpv_set_option_string(subtitle_service,opts[i][0],opts[i][1]);if(r<0)return r;}
 int result=mpv_initialize(subtitle_service);
 return result<0?result:web_register_stream(subtitle_service);
}
EMSCRIPTEN_KEEPALIVE int subtitle_service_open(void){const char *cmd[]={"loadfile","brange://source","replace",NULL};return mpv_command(subtitle_service,cmd);}
EMSCRIPTEN_KEEPALIVE int subtitle_service_loaded(void){int r=0;mpv_event *e;while((e=mpv_wait_event(subtitle_service,0))->event_id){if(e->event_id==MPV_EVENT_FILE_LOADED)r=1;if(e->event_id==MPV_EVENT_END_FILE&&((mpv_event_end_file*)e->data)->error<0)r=-1;}return r;}
EMSCRIPTEN_KEEPALIVE int subtitle_service_select(int id){int64_t no=-2,n=id;mpv_set_property(subtitle_service,"sid",MPV_FORMAT_INT64,&no);return mpv_set_property(subtitle_service,"sid",MPV_FORMAT_INT64,&n);}
EMSCRIPTEN_KEEPALIVE int subtitle_service_render(double pts,int w,int h) {
 lock_core(subtitle_service);struct MPContext *m=subtitle_service->mpctx;
 int r=-1;
 if(m->playback_initialized && m->current_track[0][STREAM_SUB] && m->current_track[0][STREAM_SUB]->d_sub){
  m->playback_pts=pts;
  bool ready=update_subtitles(m,pts);
  web_subtitle_size(w,h);web_subtitle_render(m->osd,pts);r=ready?1:0;
 }
 unlock_core(subtitle_service);return r;
}
EMSCRIPTEN_KEEPALIVE int subtitle_service_seek(double pts){char time[64];snprintf(time,sizeof(time),"%.6f",pts);const char *c[]={"seek",time,"absolute+exact",NULL};return mpv_command(subtitle_service,c);}
EMSCRIPTEN_KEEPALIVE int subtitle_service_av_chains(void){lock_core(subtitle_service);int n=!!subtitle_service->mpctx->vo_chain+!!subtitle_service->mpctx->ao_chain;unlock_core(subtitle_service);return n;}
EMSCRIPTEN_KEEPALIVE int subtitle_service_delay(double delay){return mpv_set_property(subtitle_service,"sub-delay",MPV_FORMAT_DOUBLE,&delay);}
EMSCRIPTEN_KEEPALIVE void subtitle_service_close(void){if(subtitle_service){mpv_terminate_destroy(subtitle_service);subtitle_service=NULL;}}

EMSCRIPTEN_KEEPALIVE int subtitle_service_track_count(void){lock_core(subtitle_service);int n=subtitle_service->mpctx->num_tracks;unlock_core(subtitle_service);return n;}
EMSCRIPTEN_KEEPALIVE int subtitle_service_track_id(int index){lock_core(subtitle_service);struct MPContext *m=subtitle_service->mpctx;int n=index>=0&&index<m->num_tracks&&m->tracks[index]->type==STREAM_SUB?m->tracks[index]->user_tid:-1;unlock_core(subtitle_service);return n;}
EMSCRIPTEN_KEEPALIVE int subtitle_service_track_index(int index){lock_core(subtitle_service);struct MPContext *m=subtitle_service->mpctx;int n=index>=0&&index<m->num_tracks&&m->tracks[index]->stream?m->tracks[index]->ff_index:-1;unlock_core(subtitle_service);return n;}

EMSCRIPTEN_KEEPALIVE void subtitle_service_block(int blocked){lock_core(subtitle_service);struct MPContext *m=subtitle_service->mpctx;if(m->demuxer)demux_block_reading(m->demuxer,blocked);unlock_core(subtitle_service);}
