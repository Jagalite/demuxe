// SPDX-License-Identifier: LGPL-2.1-or-later
// Pinned mpv client translation unit with timestamp-driven subtitle ownership.
#include "player/client.c"
#include <emscripten.h>
#include "stream_bridge.h"
#include "sub/dec_sub.h"
#include "sub/osd.h"
#include "demux/demux.h"
#include <string.h>
#include <math.h>
#include <stdatomic.h>
#include <emscripten/threading_legacy.h>
static mpv_handle *subtitle_service;
static atomic_uint timing_epoch;
static atomic_bool timing_pending;
static atomic_bool timing_live;
EM_JS(void, subtitle_timing_post, (unsigned epoch), {
 postMessage({type:'subtitleTimingChanged',epoch});
});
static void subtitle_timing_deliver(void) {
 atomic_store(&timing_pending, false);
 if (atomic_load(&timing_live))
  subtitle_timing_post(atomic_load(&timing_epoch));
}
// Called under dec_sub's lock, potentially from a pthread. Never call mpv here.
static void subtitle_timing_changed(void *unused) {
 (void)unused;
 if (!atomic_load(&timing_live)) return;
 atomic_fetch_add(&timing_epoch, 1);
 if (!atomic_exchange(&timing_pending, true))
  emscripten_async_run_in_main_runtime_thread(EM_FUNC_SIG_V, subtitle_timing_deliver);
}
static void subtitle_timing_invalidate(void) {
 atomic_fetch_add(&timing_epoch, 1);
}
extern void web_subtitle_size(int,int);
extern void web_subtitle_render(struct osd_state *,double);
EMSCRIPTEN_KEEPALIVE int subtitle_service_create(void) {
 atomic_store(&timing_live, false);
 subtitle_timing_invalidate();
 subtitle_service=mpv_create();if(!subtitle_service)return -1;
 const char *opts[][2]={{"config","no"},{"terminal","no"},{"idle","yes"},{"keep-open","yes"},{"pause","yes"},{"track-auto-selection","no"},{"vid","no"},{"aid","no"},{"sub-fonts-dir","/fonts"},{"sub-font","DejaVu Sans"},{"sub-ass-override","no"},{"demuxer-max-bytes","4194304"},{"demuxer-max-back-bytes","1048576"},{"cache","no"},{"demuxer-readahead-secs","0"},{"access-references","no"}};
 for(unsigned i=0;i<sizeof(opts)/sizeof(opts[0]);i++){int r=mpv_set_option_string(subtitle_service,opts[i][0],opts[i][1]);if(r<0)return r;}
 int result=mpv_initialize(subtitle_service);
 if(result>=0)result=web_register_stream(subtitle_service);
 if(result>=0)atomic_store(&timing_live,true);
 return result;
}
EMSCRIPTEN_KEEPALIVE int subtitle_service_open(void){subtitle_timing_invalidate();const char *cmd[]={"loadfile","brange://source","replace",NULL};return mpv_command(subtitle_service,cmd);}
EMSCRIPTEN_KEEPALIVE int subtitle_service_loaded(void){int r=0;mpv_event *e;while((e=mpv_wait_event(subtitle_service,0))->event_id){if(e->event_id==MPV_EVENT_FILE_LOADED)r=1;if(e->event_id==MPV_EVENT_END_FILE&&((mpv_event_end_file*)e->data)->error<0)r=-1;}return r;}
EMSCRIPTEN_KEEPALIVE int subtitle_service_select(int id){
 subtitle_timing_invalidate();
 int off=mpv_set_property_string(subtitle_service,"sid","no");
 if(id<=0)return off;
 int64_t selected=id;return mpv_set_property(subtitle_service,"sid",MPV_FORMAT_INT64,&selected);
}
EMSCRIPTEN_KEEPALIVE int subtitle_service_render(double pts,int w,int h) {
 lock_core(subtitle_service);struct MPContext *m=subtitle_service->mpctx;
 int r=-1;
 if(m->playback_initialized && m->current_track[0][STREAM_SUB] && m->current_track[0][STREAM_SUB]->d_sub){
  sub_set_timing_changed_cb(m->current_track[0][STREAM_SUB]->d_sub,subtitle_timing_changed,NULL);
  m->playback_pts=pts;
  bool ready=update_subtitles(m,pts);
  web_subtitle_size(w,h);web_subtitle_render(m->osd,pts);r=ready?1:0;
 }
 unlock_core(subtitle_service);return r;
}
// Keep subtitle demux/decoder state current without touching libass pixels.
EMSCRIPTEN_KEEPALIVE int subtitle_service_update(double pts){
 if(!subtitle_service||!isfinite(pts))return -1;
 lock_core(subtitle_service);struct MPContext *m=subtitle_service->mpctx;
 int r=-1;
 if(m->playback_initialized && m->current_track[0][STREAM_SUB] && m->current_track[0][STREAM_SUB]->d_sub){
  sub_set_timing_changed_cb(m->current_track[0][STREAM_SUB]->d_sub,subtitle_timing_changed,NULL);
  m->playback_pts=pts;r=update_subtitles(m,pts)?1:0;
 }
 unlock_core(subtitle_service);return r;
}
EMSCRIPTEN_KEEPALIVE int subtitle_service_static_profile(void){
 if(!subtitle_service)return 0;
 lock_core(subtitle_service);struct MPContext *m=subtitle_service->mpctx;
 struct track *track=m->playback_initialized?m->current_track[0][STREAM_SUB]:NULL;
 int qualified=track&&track->d_sub&&sub_static_timing_qualified(track->d_sub);
 unlock_core(subtitle_service);return qualified;
}
// The worker drives a bounded asynchronous EOF scan through update_subtitles.
EMSCRIPTEN_KEEPALIVE int subtitle_service_ass_scan_needed(void){
 if(!subtitle_service)return 0;
 lock_core(subtitle_service);struct MPContext *m=subtitle_service->mpctx;
 struct track *track=m->playback_initialized?m->current_track[0][STREAM_SUB]:NULL;
 int needed=track&&track->d_sub&&track->demuxer&&track->demuxer->seekable&&
            sub_static_timing_ass_preload_needed(track->d_sub);
 unlock_core(subtitle_service);return needed;
}
EMSCRIPTEN_KEEPALIVE int subtitle_service_ass_scan_complete(void){
 if(!subtitle_service)return 0;
 lock_core(subtitle_service);struct MPContext *m=subtitle_service->mpctx;
 struct track *track=m->playback_initialized?m->current_track[0][STREAM_SUB]:NULL;
 int complete=track&&track->d_sub&&sub_static_timing_mark_full_scan(track->d_sub);
 unlock_core(subtitle_service);return complete;
}
// Internal bounded query. Return -1 for unsupported/no selected text decoder,
// -2 if decode changed the timing set across both bounded attempts, 0 for no
// known future boundary, 1 when *next is a media-time boundary.
// *epoch is invalidated by decoded events, seek, track/source changes, reset
// and close. No renderer, subtitle text, or public sub-lines property is read.
EMSCRIPTEN_KEEPALIVE int subtitle_service_next_raw_boundary(double pts,double *next,unsigned *epoch){
 if(!subtitle_service||!next||!epoch||!isfinite(pts))return -1;
 lock_core(subtitle_service);struct MPContext *m=subtitle_service->mpctx;
 struct track *track=m->playback_initialized?m->current_track[0][STREAM_SUB]:NULL;
 struct dec_sub *sub=track?track->d_sub:NULL;
 int result=-1;unsigned snapshot_epoch=atomic_load(&timing_epoch);*next=MP_NOPTS_VALUE;
 if(sub){
  sub_set_timing_changed_cb(sub,subtitle_timing_changed,NULL);
  for(int attempt=0;attempt<2;attempt++){
   unsigned before=atomic_load(&timing_epoch);
   bool supported=sub_next_raw_boundary(sub,pts,next);
   unsigned after=atomic_load(&timing_epoch);
   snapshot_epoch=after;
   if(before==after){result=supported?(*next==MP_NOPTS_VALUE?0:1):-1;break;}
   result=-2;
  }
 }
 *epoch=snapshot_epoch;
 unlock_core(subtitle_service);return result;
}
EMSCRIPTEN_KEEPALIVE int subtitle_service_seek(double pts){subtitle_timing_invalidate();char time[64];snprintf(time,sizeof(time),"%.6f",pts);const char *c[]={"seek",time,"absolute+exact",NULL};return mpv_command(subtitle_service,c);}
EMSCRIPTEN_KEEPALIVE int subtitle_service_av_chains(void){lock_core(subtitle_service);int n=!!subtitle_service->mpctx->vo_chain+!!subtitle_service->mpctx->ao_chain;unlock_core(subtitle_service);return n;}
EMSCRIPTEN_KEEPALIVE int subtitle_service_delay(double delay){return mpv_set_property(subtitle_service,"sub-delay",MPV_FORMAT_DOUBLE,&delay);}
// Only used by internal fidelity tests. Caption text is never added to public
// diagnostics or persisted; the visible overlay remains the production output.
EMSCRIPTEN_KEEPALIVE int subtitle_service_text(char *out,int capacity){
 if(!out||capacity<1||capacity>4096)return -1;
 char *value=mpv_get_property_string(subtitle_service,"sub-text");
 if(!value){out[0]=0;return 0;}
 size_t length=strlen(value);
 if(length>=(size_t)capacity){mpv_free(value);return -1;}
 memcpy(out,value,length+1);mpv_free(value);return (int)length;
}
EMSCRIPTEN_KEEPALIVE void subtitle_service_close(void){atomic_store(&timing_live,false);subtitle_timing_invalidate();if(subtitle_service){mpv_terminate_destroy(subtitle_service);subtitle_service=NULL;}}

EMSCRIPTEN_KEEPALIVE int subtitle_service_track_count(void){lock_core(subtitle_service);int n=subtitle_service->mpctx->num_tracks;unlock_core(subtitle_service);return n;}
EMSCRIPTEN_KEEPALIVE int subtitle_service_track_id(int index){lock_core(subtitle_service);struct MPContext *m=subtitle_service->mpctx;int n=index>=0&&index<m->num_tracks&&m->tracks[index]->type==STREAM_SUB?m->tracks[index]->user_tid:-1;unlock_core(subtitle_service);return n;}
EMSCRIPTEN_KEEPALIVE int subtitle_service_track_index(int index){lock_core(subtitle_service);struct MPContext *m=subtitle_service->mpctx;int n=index>=0&&index<m->num_tracks&&m->tracks[index]->stream?m->tracks[index]->ff_index:-1;unlock_core(subtitle_service);return n;}

EMSCRIPTEN_KEEPALIVE void subtitle_service_block(int blocked){lock_core(subtitle_service);struct MPContext *m=subtitle_service->mpctx;if(m->demuxer)demux_block_reading(m->demuxer,blocked);unlock_core(subtitle_service);}
