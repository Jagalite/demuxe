// SPDX-License-Identifier: LGPL-2.1-or-later
// Experimental audio-only mpv service. PCM stays in private Wasm memory until copied.
#include "player/client.c"
#include <emscripten.h>
#include "stream_bridge.h"
#include "audio_bridge.h"
#include <math.h>
static mpv_handle *audio_service;
EMSCRIPTEN_KEEPALIVE int private_audio_create(int rate) {
    if(audio_service || rate<8000 || rate>192000)return -1;
    atomic_store(&web_audio.rate,rate);
    audio_service=mpv_create();if(!audio_service)return -1;
    const char *opts[][2]={{"config","no"},{"terminal","no"},{"idle","yes"},{"keep-open","yes"},
        {"pause","yes"},{"vid","no"},{"sid","no"},{"ao","browser"},{"audio-channels","stereo"},
        {"demuxer-max-bytes","4194304"},{"demuxer-max-back-bytes","1048576"},
        {"cache","no"},{"access-references","no"}};
    for(unsigned i=0;i<sizeof(opts)/sizeof(opts[0]);i++){
        int r=mpv_set_option_string(audio_service,opts[i][0],opts[i][1]);if(r<0)return r;
    }
    int r=mpv_initialize(audio_service);if(r>=0)r=web_register_stream(audio_service);return r;
}
EMSCRIPTEN_KEEPALIVE int private_audio_open(void){const char *cmd[]={"loadfile","brange://source","replace",NULL};return mpv_command(audio_service,cmd);}
EMSCRIPTEN_KEEPALIVE int private_audio_loaded(void){
    int r=0;mpv_event *e;
    while((e=mpv_wait_event(audio_service,0))->event_id){
        if(e->event_id==MPV_EVENT_FILE_LOADED)r=1;
        if(e->event_id==MPV_EVENT_END_FILE&&((mpv_event_end_file*)e->data)->error<0)r=-1;
    }return r;
}
EMSCRIPTEN_KEEPALIVE int private_audio_pause(int paused){return mpv_set_property(audio_service,"pause",MPV_FORMAT_FLAG,&paused);}
EMSCRIPTEN_KEEPALIVE int private_audio_speed(double speed){if(!isfinite(speed)||speed<0.25||speed>4)return -1;return mpv_set_property(audio_service,"speed",MPV_FORMAT_DOUBLE,&speed);}
EMSCRIPTEN_KEEPALIVE int private_audio_seek(double pts){
    if(!isfinite(pts)||pts<0)return -1;
    char time[64];snprintf(time,sizeof(time),"%.6f",pts);const char *cmd[]={"seek",time,"absolute+exact",NULL};return mpv_command(audio_service,cmd);
}
EMSCRIPTEN_KEEPALIVE double private_audio_time(void){double value=-1;mpv_get_property(audio_service,"time-pos",MPV_FORMAT_DOUBLE,&value);return value;}
EMSCRIPTEN_KEEPALIVE int private_audio_eof(void){int value=0;mpv_get_property(audio_service,"eof-reached",MPV_FORMAT_FLAG,&value);return value;}
EMSCRIPTEN_KEEPALIVE int private_audio_chains(void){lock_core(audio_service);int value=!!audio_service->mpctx->ao_chain+2*!!audio_service->mpctx->vo_chain;unlock_core(audio_service);return value;}
EMSCRIPTEN_KEEPALIVE uintptr_t private_audio_ptr(void){return (uintptr_t)&web_audio;}
EMSCRIPTEN_KEEPALIVE void private_audio_close(void){if(audio_service){mpv_terminate_destroy(audio_service);audio_service=NULL;}}
