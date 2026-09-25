// SPDX-License-Identifier: Apache-2.0
// Test-only timing probes. The production subtitle service is included unchanged.
#include "../../native/subtitles/service.c"
#include <math.h>
#include <stdint.h>
#include <stdatomic.h>
#include <emscripten/threading_legacy.h>

extern void sub_set_timing_changed_cb(struct dec_sub *, void (*)(void *), void *);
extern unsigned sub_poc_decodes(void), sub_poc_registered_decodes(void), sub_poc_setters(void);
EMSCRIPTEN_KEEPALIVE unsigned subtitle_poc_all_decodes(void) { return sub_poc_decodes(); }
EMSCRIPTEN_KEEPALIVE unsigned subtitle_poc_registered_decodes(void) { return sub_poc_registered_decodes(); }
EMSCRIPTEN_KEEPALIVE unsigned subtitle_poc_timing_setters(void) { return sub_poc_setters(); }
static atomic_uint decode_notifications, discovery_messages;
static atomic_bool discovery_pending;
EM_JS(void, notify_subtitle_timing_changed, (), { postMessage({type:'subtitleTimingChanged'}); });
static void timing_changed_main(void) {
 atomic_store(&discovery_pending, false);
 if (!subtitle_service) return;
 atomic_fetch_add(&discovery_messages, 1);
 notify_subtitle_timing_changed();
}
static void timing_changed_callback(void *unused) {
 (void)unused;
 atomic_fetch_add(&decode_notifications, 1);
 if (!atomic_exchange(&discovery_pending, true))
  emscripten_async_run_in_main_runtime_thread(EM_FUNC_SIG_V, timing_changed_main);
}
EMSCRIPTEN_KEEPALIVE unsigned subtitle_poc_decode_notifications(void) { return atomic_load(&decode_notifications); }
EMSCRIPTEN_KEEPALIVE unsigned subtitle_poc_discovery_messages(void) { return atomic_load(&discovery_messages); }

// Test-only probe for mpv's ordinary client wakeups. These are event-queue
// notifications, not subtitle visual deadlines.
static atomic_uint client_wakeups;
static void count_client_wakeup(void *unused) { (void)unused; atomic_fetch_add(&client_wakeups, 1); }
EMSCRIPTEN_KEEPALIVE void subtitle_poc_watch_client(void) {
 if (subtitle_service) mpv_set_wakeup_callback(subtitle_service, count_client_wakeup, NULL);
}
EMSCRIPTEN_KEEPALIVE unsigned subtitle_poc_client_wakeups(void) { return atomic_load(&client_wakeups); }

// This callback is emitted by the native service's own deadline, with no
// event list or subtitle text crossing into Demuxe. The browser PTS remains
// authoritative when the existing render path runs after the wakeup.
EM_JS(void, notify_subtitle_wakeup, (double target), { postMessage({type:'subtitleWake',target}); });
static int deadline_epoch, deadline_wakeups, deadline_arms;
static double deadline_target;
static void deadline_fired(void *arg) {
 if ((int)(intptr_t)arg != deadline_epoch || !subtitle_service) return;
 deadline_wakeups++;
 notify_subtitle_wakeup(deadline_target);
}
EMSCRIPTEN_KEEPALIVE void subtitle_poc_cancel_deadline(void) { deadline_epoch++; }
EMSCRIPTEN_KEEPALIVE double subtitle_poc_arm_deadline(double pts, double rate) {
 deadline_epoch++;
 if (!subtitle_service || !isfinite(pts) || !(rate > 0)) return NAN;
 double next = INFINITY;
 lock_core(subtitle_service);
 struct MPContext *m = subtitle_service->mpctx;
 struct track *track = m->current_track[0][STREAM_SUB];
 struct dec_sub *sub = track ? track->d_sub : NULL;
 if (sub) sub_set_timing_changed_cb(sub, timing_changed_callback, NULL);
 struct sub_lines *lines = sub ? sub_get_lines(sub) : NULL;
 if (lines) {
  for (int i = 0; i < lines->num_entries; i++) {
   double a = lines->entries[i].start, b = lines->entries[i].end;
   if (isfinite(a) && a > pts + .0005 && a < next) next = a;
   if (isfinite(b) && b > pts + .0005 && b < next) next = b;
  }
  talloc_free(lines);
 }
 unlock_core(subtitle_service);
 if (isfinite(next)) {
  deadline_target = next;
  int delay = (int)ceil((next - pts) * 1000.0 / rate);
  emscripten_async_call(deadline_fired, (void *)(intptr_t)deadline_epoch, delay < 1 ? 1 : delay);
  deadline_arms++;
 }
 return next;
}
EMSCRIPTEN_KEEPALIVE int subtitle_poc_deadline_wakeups(void) { return deadline_wakeups; }
EMSCRIPTEN_KEEPALIVE int subtitle_poc_deadline_arms(void) { return deadline_arms; }

// Test-only discovery check: advance mpv's subtitle packet/decode state at
// browser PTS without calling the bitmap/text renderer.
EMSCRIPTEN_KEEPALIVE int subtitle_poc_discover(double pts) {
 if (!subtitle_service || !isfinite(pts)) return -1;
 lock_core(subtitle_service);
 struct MPContext *m = subtitle_service->mpctx;
 m->playback_pts = pts;
 int ready = m->playback_initialized ? update_subtitles(m, pts) : -1;
 unlock_core(subtitle_service);
 return ready;
}

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
