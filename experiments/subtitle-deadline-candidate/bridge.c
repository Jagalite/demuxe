// SPDX-License-Identifier: Apache-2.0
// Test-only bounded timing snapshot. Production service remains unchanged.
#include "../../native/subtitles/service.c"
#include <math.h>

// out: active, start, end, nextStart, nextKnown. No render or seek occurs.
EMSCRIPTEN_KEEPALIVE int subtitle_candidate_snapshot(double pts, double *out) {
 if (!subtitle_service || !out || !isfinite(pts)) return -1;
 lock_core(subtitle_service);
 struct MPContext *m = subtitle_service->mpctx;
 struct track *track = m->current_track[0][STREAM_SUB];
 struct dec_sub *sub = track ? track->d_sub : NULL;
 out[0] = 0; out[1] = NAN; out[2] = NAN; out[3] = NAN; out[4] = 0;
 if (m->playback_initialized && sub) {
  // sub_get_times and sub_control each take the subtitle decoder lock.
  // Holding core lock keeps track selection and seek state coherent.
  struct sd_times current = sub_get_times(sub, pts);
  if (current.start != MP_NOPTS_VALUE) {
   out[0] = 1; out[1] = current.start;
  }
  if (current.end != MP_NOPTS_VALUE) out[2] = current.end;
  double next[2] = {pts, 1};
  if (sub_control(sub, SD_CTRL_SUB_STEP, next) > 0 && next[0] > pts + 0.0001) {
   // Keep the raw control value. sd_ass may add a seek tolerance; sd_lavc
   // returns `pts` when it has no future seekpoint, even with success status.
   out[3] = next[0];
   out[4] = 1;
  }
 }
 unlock_core(subtitle_service);
 return sub ? 1 : 0;
}
