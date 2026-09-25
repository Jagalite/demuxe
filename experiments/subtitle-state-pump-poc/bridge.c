// SPDX-License-Identifier: Apache-2.0
// Test-only state pump built against the current mpv subtitle service.
#include "service-snapshot.c"

EMSCRIPTEN_KEEPALIVE int subtitle_poc_update(double pts) {
 if (!subtitle_service) return -1;
 lock_core(subtitle_service);
 struct MPContext *m = subtitle_service->mpctx;
 int result = -1;
 if (m->playback_initialized && m->current_track[0][STREAM_SUB] &&
     m->current_track[0][STREAM_SUB]->d_sub) {
  sub_set_timing_changed_cb(m->current_track[0][STREAM_SUB]->d_sub,
                            subtitle_timing_changed, NULL);
  m->playback_pts = pts;
  result = update_subtitles(m, pts) ? 1 : 0;
 }
 unlock_core(subtitle_service);
 return result;
}
