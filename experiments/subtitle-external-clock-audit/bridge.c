// SPDX-License-Identifier: Apache-2.0
// Test-only non-render clock probe; production service is included unchanged.
#include "service-baseline.c"

EMSCRIPTEN_KEEPALIVE int subtitle_probe_times(double pts, double *out) {
 if (!subtitle_service || !out) return -1;
 lock_core(subtitle_service);
 struct MPContext *m = subtitle_service->mpctx;
 struct track *track = m->current_track[0][STREAM_SUB];
 struct dec_sub *sub = track ? track->d_sub : NULL;
 if (sub) {
  struct sd_times t = sub_get_times(sub, pts);
  out[0] = t.start;
  out[1] = t.end;
 }
 unlock_core(subtitle_service);
 return sub ? 1 : 0;
}

EMSCRIPTEN_KEEPALIVE int subtitle_probe_update(double pts) {
 if (!subtitle_service) return -1;
 lock_core(subtitle_service);
 struct MPContext *m = subtitle_service->mpctx;
 int result = -1;
 if (m->playback_initialized && m->current_track[0][STREAM_SUB] &&
     m->current_track[0][STREAM_SUB]->d_sub) {
  m->playback_pts = pts;
  result = update_subtitles(m, pts) ? 1 : 0;
 }
 unlock_core(subtitle_service);
 return result;
}
