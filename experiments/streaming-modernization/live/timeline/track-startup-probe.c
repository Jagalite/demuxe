// SPDX-License-Identifier: GPL-2.0-or-later
// Compile the actual patched reselect_demux_stream with observable demux calls.
#include <assert.h>
#include <stdbool.h>
#define MP_NOPTS_VALUE (-1e20)
#define STREAM_SUB 2
struct demuxer { bool can_clip_seek_preroll; };
struct track { void *stream; struct demuxer *demuxer; int type; bool selected; };
struct MPContext { double playback_pts, video_pts, last_seek_pts, offset; int play_dir; };
static double received;
static bool refreshed, enabled;
static double get_current_time(struct MPContext *c) { return c->playback_pts == MP_NOPTS_VALUE ? c->last_seek_pts : c->playback_pts*c->play_dir; }
static double get_track_seek_offset(struct MPContext *c, struct track *t) { return c->offset; }
static void demuxer_refresh_track(struct demuxer *d, void *s, double pts) { received=pts;refreshed=true; }
static void demuxer_select_track(struct demuxer *d, void *s, double pts, bool selected) { received=pts;enabled=selected; }
#include "track-refresh-function.c"
int main(void) {
 struct demuxer d={true};struct track t={(void*)1,&d,0,true};
 struct MPContext c={MP_NOPTS_VALUE,22,0,0,1};
 reselect_demux_stream(&c,&t,false);assert(received==22&&enabled);
 c.video_pts=0;c.last_seek_pts=24;
 reselect_demux_stream(&c,&t,false);assert(received==0);
 c.video_pts=MP_NOPTS_VALUE;
 reselect_demux_stream(&c,&t,false);assert(received==24);
 c.video_pts=22;c.playback_pts=23;
 reselect_demux_stream(&c,&t,false);assert(received==23);
 c.playback_pts=MP_NOPTS_VALUE;d.can_clip_seek_preroll=false;
 reselect_demux_stream(&c,&t,false);assert(received==24);
 d.can_clip_seek_preroll=true;c.offset=.5;t.type=STREAM_SUB;
 reselect_demux_stream(&c,&t,true);assert(received==12.5&&refreshed);
 c.play_dir=-1;t.type=0;c.offset=0;
 reselect_demux_stream(&c,&t,false);assert(received==-22);
 return 0;
}
