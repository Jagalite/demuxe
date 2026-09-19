#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Add the isolated HLS component/window experiment after integration patches 0016/17."""
import argparse,difflib,hashlib,json
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--timeline',action='store_true');p.add_argument('--subtitles',action='store_true');p.add_argument('--discontinuity',action='store_true');p.add_argument('--dash',action='store_true');a=p.parse_args();a.subtitles=a.subtitles or a.timeline;a.discontinuity=a.discontinuity or a.subtitles;a.dash=a.dash or a.discontinuity;here=Path(__file__).resolve().parent;changes={};inputs={}
def once(s,old,new):
 assert s.count(old)==1,old
 return s.replace(old,new,1)
def edit(name,fn):
 old=(a.source/name).read_text();changes[name]=(old,fn(old));inputs[name]=hashlib.sha256(old.encode()).hexdigest()
def demux_header(s):
 if a.timeline:
  s=once(s,'#define SEEK_BLOCK    (1 << 6)      // upon successfully queued seek, block readers', '#define SEEK_BLOCK    (1 << 6)      // upon successfully queued seek, block readers\n#define SEEK_PREROLL  (1 << 7)      // internal overlap; may clip at a live window start')
  s=once(s,'bool demux_cancel_test(struct demuxer *demuxer);','bool demux_cancel_test(struct demuxer *demuxer);\nbool demux_read_abandoned(struct demuxer *demuxer);')
 s=once(s,'    double duration;  // -1 if unknown','    double duration;  // -1 if unknown\n    bool duration_is_live; // do not infer a finite length from buffered packets\n    bool can_clip_seek_preroll; // immutable after open; internal overlap only')
 return once(s,'    void (*switched_tracks)(struct demuxer *demuxer);','''    void (*switched_tracks)(struct demuxer *demuxer);
    // Optional owning-thread work while packet reading is idle/cache-full.
    // Called without the cache mutex. Return next delay in ns, or 0 to stop.
    int64_t (*poll)(struct demuxer *demuxer);''')
def demux_core(s):
 if a.timeline:
  assert s.count('in->seek_flags = SEEK_HR;')==3
  s=s.replace('in->seek_flags = SEEK_HR;','in->seek_flags = SEEK_HR | (in->d_thread->can_clip_seek_preroll ? SEEK_PREROLL : 0);')
  s=once(s,'''    if (!in->seekable_cache && in->current_range) {
        clear_cached_range(in, in->current_range);
        return;
    }''','''    if (!in->seekable_cache && in->current_range) {
        clear_cached_range(in, in->current_range);
        // A new seek supersedes track-refresh deduplication. Match the fresh
        // range path below: no old packet position survives the cleared queue.
        for (int n = 0; n < in->num_streams; n++)
            in->streams[n]->ds->refreshing = false;
        return;
    }''')
  s=once(s,'bool demux_cancel_test(struct demuxer *demuxer)\n','''// Only the demux read owner calls this, with the cache mutex released.
// Accepted seeks abandon outstanding packet reads without cancelling playback.
bool demux_read_abandoned(struct demuxer *demuxer)
{
    struct demux_internal *in = demuxer->in;
    mp_mutex_lock(&in->lock);
    bool abandoned = in->seeking || mp_cancel_test(demuxer->cancel);
    mp_mutex_unlock(&in->lock);
    return abandoned;
}

bool demux_cancel_test(struct demuxer *demuxer)
''')
 s=once(s,'            if (duration > in->d_thread->duration) {','            if (!in->d_thread->duration_is_live && duration > in->d_thread->duration) {')
 s=once(s,'    dst->start_time = src->start_time;','    dst->start_time = src->start_time;\n    dst->duration_is_live = src->duration_is_live;')
 s=once(s,'    int64_t next_cache_update;','    int64_t next_cache_update;\n    int64_t next_demux_poll;')
 s=once(s,'    if (read_packet(in))\n', '''    if (in->d_thread->desc->poll && mp_time_ns() >= in->next_demux_poll) {
        mp_mutex_unlock(&in->lock);
        int64_t delay = in->d_thread->desc->poll(in->d_thread);
        mp_mutex_lock(&in->lock);
        int64_t now = mp_time_ns();
        in->next_demux_poll = delay > 0 && delay < INT64_MAX - now ? now + delay : INT64_MAX;
        return true;
    }
    if (read_packet(in))
''')
 if a.timeline:
  s=once(s,'        int64_t now = mp_time_ns();','''        if(in->duration!=in->d_thread->duration){
            in->duration=in->d_thread->duration;
            in->events|=DEMUX_EVENT_DURATION;
            if(in->wakeup_cb)in->wakeup_cb(in->wakeup_cb_ctx);
        }
        int64_t now = mp_time_ns();''')
 return once(s,'mp_cond_timedwait_until(&in->wakeup, &in->lock, in->next_cache_update);','mp_cond_timedwait_until(&in->wakeup, &in->lock, in->d_thread->desc->poll ? MPMIN(in->next_cache_update, in->next_demux_poll) : in->next_cache_update);')
def track_startup(s):
 return once(s,'    double pts = get_current_time(mpctx);','''    double pts = get_current_time(mpctx);
    // A paused live open can present its initial video before restart updates
    // playback_pts. last_seek_pts is still the load-time zero in that interval.
    // The already accepted mpv video timestamp is the refresh reference; zero
    // would unnecessarily rewind to the expiring beginning of the DVR window.
    // A pending seek clears video_pts, so its target retains normal precedence.
    if (track->demuxer->can_clip_seek_preroll &&
        mpctx->playback_pts == MP_NOPTS_VALUE &&
        mpctx->video_pts != MP_NOPTS_VALUE)
        pts = mpctx->video_pts * mpctx->play_dir;''')
def lavf(s):
 if a.timeline:
  s=once(s,'        r=demuxe_adaptive_read(priv->adaptive,&prepared);','''        r=demuxe_adaptive_read(priv->adaptive,&prepared);
        if(r==AVERROR(EAGAIN))r=0;
        if(r<0&&r!=AVERROR_EOF&&!(r==AVERROR_EXIT&&demux_read_abandoned(demux)))
            demuxe_control_fail(priv->adaptive_source,r);''')
  s=once(s,'        MP_WARN(demux, "error reading packet: %s.\\n", av_err2str(r));','''        MP_WARN(demux, "error reading packet: %s.\\n", av_err2str(r));
        if(priv->adaptive)return false; // child transport owns retry; failure is terminal''')
  s=once(s,'if(!dp->codec){talloc_free(dp);','if(!dp->codec){demuxe_control_fail(priv->adaptive_source,AVERROR(ENOBUFS));talloc_free(dp);')
 s=once(s,'extern int web_resource_avio_open_for_session(', 'extern void web_resource_retire_for_session(int,const char*);\nextern int web_resource_avio_open_for_session(')
 s=once(s,'static int adaptive_init(struct demuxer *demux)', '''static void adaptive_io_retire(void *opaque,const char *url){
    lavf_priv_t *p=opaque;web_resource_retire_for_session(p->browser_session,url);
}
static int adaptive_init(struct demuxer *demux)''')
 s=once(s,'.close=adaptive_io_close}', '.close=adaptive_io_close,.retire=adaptive_io_retire}')
 # This stage intentionally enables only the native HLS component experiment.
 # DASH retains its separately qualified archive until its component plans land.
 if not a.dash:s=once(s,'    if(!permitted||!demuxe_control_enabled(p->adaptive_source)) return 0;', '    if(!permitted||!demuxe_control_enabled(p->adaptive_source)||strcmp(p->avfc->iformat->name,"hls")) return 0;')
 if a.discontinuity:s=once(s,'if(count<2)return 0;','if(count<1)return 0;')
 # Codec identities include audio layout/rate and subtitle extradata. Shared
 # cached codec records stay alive until demux close, bounded as before.
 s=once(s,'if(old->codec_id==cp->codec_id&&old->width', 'if(old->codec_type==cp->codec_type&&old->sample_rate==cp->sample_rate&&old->frame_size==cp->frame_size&&old->initial_padding==cp->initial_padding&&old->seek_preroll==cp->seek_preroll&&(cp->codec_type!=AVMEDIA_TYPE_AUDIO||!av_channel_layout_compare(&old->ch_layout,&cp->ch_layout))&&old->codec_id==cp->codec_id&&old->width')
 s=once(s,'    codec->type=STREAM_VIDEO;', '    codec->type=cp->codec_type==AVMEDIA_TYPE_VIDEO?STREAM_VIDEO:cp->codec_type==AVMEDIA_TYPE_AUDIO?STREAM_AUDIO:STREAM_SUB;')
 s=once(s,'    codec->fps=av_q2d', '    codec->samplerate=cp->sample_rate;if(cp->codec_type==AVMEDIA_TYPE_AUDIO)mp_chmap_from_av_layout(&codec->channels,&cp->ch_layout);\n    codec->fps=av_q2d')
 s=once(s,'        dp->demuxe_quality=(struct demuxe_quality_tag)', '        if(demuxe_packet_codec(&prepared)->codec_type==AVMEDIA_TYPE_VIDEO)dp->demuxe_quality=(struct demuxe_quality_tag)')
 if a.dash:
  s=once(s,'        dp->segmented=true;dp->start=dp->end=MP_NOPTS_VALUE;', '''        dp->segmented=true;dp->start=dp->end=MP_NOPTS_VALUE;
        if(prepared.presentation_start_us||prepared.presentation_end_us){
            dp->start=prepared.presentation_start_us==AV_NOPTS_VALUE?MP_NOPTS_VALUE:prepared.presentation_start_us/1000000.0;
            dp->end=prepared.presentation_end_us==AV_NOPTS_VALUE?MP_NOPTS_VALUE:prepared.presentation_end_us/1000000.0;
        }''')
 s=once(s,'        if(result<0){MP_WARN(demuxer,"Adaptive seek rejected: %s\\n",av_err2str(result));return;}\n    }', '        if(result<0){MP_WARN(demuxer,"Adaptive seek rejected: %s\\n",av_err2str(result));return;}\n        update_read_stats(demuxer);return;\n    }')
 if a.timeline:
  s=once(s,'        if (!(flags & SEEK_FORWARD))\n            seek_pts -= priv->seek_delay;','        if (!(flags & SEEK_FORWARD) && !priv->adaptive)\n            seek_pts -= priv->seek_delay;')
  s=once(s,'int result=demuxe_adaptive_seek(priv->adaptive,seek_pts_av);','int64_t overlap=(flags&SEEK_FORWARD)?0:priv->seek_delay*AV_TIME_BASE;\n        int result=demuxe_adaptive_seek_window(priv->adaptive,seek_pts_av,overlap,flags&SEEK_PREROLL);')
  s=once(s,'MP_WARN(demuxer,"Adaptive seek rejected: %s\\n",av_err2str(result));','MP_WARN(demuxer,"Adaptive seek rejected: %s (seconds=%.17g, microseconds=%lld, preroll=%.17g)\\n",av_err2str(result),seek_pts,(long long)seek_pts_av,priv->seek_delay);')
 s=once(s,'    av_seek_frame(priv->avfc, -1, 0, 1);', '    if(priv->adaptive)return;\n    av_seek_frame(priv->avfc, -1, 0, 1);')
 s=once(s,'    demuxer->seekable &= !priv->format_hack.no_seek;', '''    demuxer->seekable &= !priv->format_hack.no_seek;
    // The integrated segment controller validates and performs timeline seeks.
    // FFmpeg's rolling-HLS flag describes its own read_seek implementation;
    // it does not describe this controller. AVIO resources remain non-seekable.
    if (priv->adaptive) {
        demuxer->seekable = true;
        demuxer->can_clip_seek_preroll = true;
    }''')
 s=once(s,'    demuxer->duration = duration;', '''    demuxer->duration = duration;
    if(priv->adaptive){
        struct demuxe_adaptive_stats state;demuxe_adaptive_stats(priv->adaptive,&state);
        demuxer->duration_is_live=state.live;
        if(state.live)demuxer->duration=-1;
    }''')
 s=once(s,'const demuxer_desc_t demuxer_desc_lavf = {', '''static int64_t demux_lavf_poll(struct demuxer *demuxer)
{
    lavf_priv_t *p=demuxer->priv;
    if(!p->adaptive)return 0;
    demuxe_adaptive_poll(p->adaptive);
    struct demuxe_adaptive_stats state;demuxe_adaptive_stats(p->adaptive,&state);demuxe_control_update(&state);
    return state.live?1000000000LL:0;
}
const demuxer_desc_t demuxer_desc_lavf = {''')
 if a.timeline:
  s=once(s,'    return state.live?1000000000LL:0;','''    if(demuxer->duration_is_live&&!state.live&&state.window_known){
        demuxer->duration_is_live=false;
        demuxer->duration=state.window_end_us/1000000.0;

    }
    return state.live?1000000000LL:0;''')
 return once(s,'    .switched_tracks = demux_lavf_switched_tracks,','    .switched_tracks = demux_lavf_switched_tracks,\n    .poll = demux_lavf_poll,')
def decoder_metadata(s):
 # Decoder strings belong to the wrapper, not the longer-lived codec records.
 # Segmented audio/video can retire the original header codec before the
 # wrapper is destroyed. Clear its published pointers before switching owners.
 return once(s,'                p->codec = new_segment->codec;','''                p->codec->decoder = NULL;
                p->codec->decoder_desc = NULL;
                p->codec = new_segment->codec;''')
if a.timeline:edit('filters/f_decoder_wrapper.c',decoder_metadata)
edit('demux/demux.h',demux_header);edit('demux/demux.c',demux_core);edit('demux/demux_lavf.c',lavf)
if a.timeline:edit('player/loadfile.c',track_startup)
edit('common/demuxe-quality.h',lambda s:once(s,'int representation;','int representation,decoder_generation;'))
edit('meson.build',lambda s:once(s,"    'demux/adaptive-session.c',","    'demux/adaptive-session.c',\n    'demux/component-group.c',"))
if a.discontinuity:
 old,new=changes['meson.build'];changes['meson.build']=(old,once(new,"    'demux/component-group.c',","    'demux/component-group.c',\n    'demux/webvtt-map.c',"))
for name in ['adaptive-session.c','adaptive-session.h','container-task.c','container-task.h','component-group.c','component-group.h']+(['manifest-plan.h'] if a.dash else [])+(['webvtt-map.c','webvtt-map.h'] if a.discontinuity else [])+(['cue-budget.h'] if a.subtitles else []):
 path=here/('subtitles/task' if a.subtitles else 'discontinuity/task' if a.discontinuity else 'dash/task' if a.dash else 'task')/name;old=(a.source/'demux'/name).read_text() if (a.source/'demux'/name).exists() else ''
 changes['demux/'+name]=(old,path.read_text());inputs[str(path)]=hashlib.sha256(path.read_bytes()).hexdigest()
def failure_header(s):
 return s+"\nvoid demuxe_control_fail(uint64_t source,int error);\nint web_quality_error(int source);\nconst char *web_quality_error_message(int source);\n"
if a.timeline:edit('demux/session-control.h',failure_header)
def status(s):
 if a.timeline:
  s=once(s,'#include <string.h>','#include <string.h>\n#include <errno.h>\n#include <libavutil/error.h>')
  s=once(s,'    int source,enabled,count,request,requested;', '    int source,enabled,count,request,requested,fatal_error;')
  s=once(s,'int demuxe_control_enabled(uint64_t source)','''// The demux owner records only source-scoped terminal failures. Serializing or
// checking them on the command worker never calls libmpv from a stream callback.
void demuxe_control_fail(uint64_t source,int error){
    pthread_mutex_lock(&lock);
    if(control.enabled&&source==(uint64_t)control.source&&error<0&&!control.fatal_error)
        control.fatal_error=error;
    pthread_mutex_unlock(&lock);
}
EMSCRIPTEN_KEEPALIVE int web_quality_error(int source){
    pthread_mutex_lock(&lock);int error=source==control.source?control.fatal_error:0;
    pthread_mutex_unlock(&lock);return error;
}
EMSCRIPTEN_KEEPALIVE const char *web_quality_error_message(int source){
    int error=web_quality_error(source);
    if(!error)return "";
    if(error==AVERROR(ETIMEDOUT))return "Integrated streaming resource read timed out";
    if(error==AVERROR_EXIT||error==AVERROR(ECANCELED))return "Integrated streaming read cancelled";
    if(error==AVERROR(EACCES)||error==AVERROR(EPERM))return "Integrated streaming resource permission denied";
    if(error==AVERROR(EIO)||error==AVERROR(ESPIPE))return "Integrated streaming resource read failed";
    return "Integrated streaming demux failed";
}
int demuxe_control_enabled(uint64_t source)''')
 if a.discontinuity:
  assert s.count('count>1')==2
  s=s.replace('count>1','count>0')
 s=once(s,'?tag:(struct demuxe_quality_tag){0};','?tag:(struct demuxe_quality_tag){.decoder_generation=tag.decoder_generation};')
 s=once(s,'control.selected.request,control.selected.representation);','control.selected.request,control.selected.representation,control.selected.decoder_generation);')
 s=once(s,'\\"representation\\":%d}",','\\"representation\\":%d,\\"generation\\":%d}",')
 old='snprintf(json+at,sizeof(json)-at,"],\\"presented\\":%d,\\"presentedRequest\\":%llu}",presented,(unsigned long long)control.presented.request);'
 new='snprintf(json+at,sizeof(json)-at,"],\\"window\\":{\\"live\\":%s,\\"known\\":%s,\\"start\\":%.6f,\\"end\\":%.6f,\\"revision\\":%llu,\\"error\\":%d},\\"presented\\":%d,\\"presentedRequest\\":%llu}",control.state.live?"true":"false",control.state.window_known?"true":"false",control.state.window_start_us/1000000.0,control.state.window_end_us/1000000.0,(unsigned long long)control.state.window_revision,control.state.window_error,presented,(unsigned long long)control.presented.request);'
 return once(s,old,new)
edit('demux/session-control.c',status)
inputs[str(Path(__file__))]=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
patch=''.join(''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='a/'+name if old else '/dev/null',tofile='b/'+name))for name,(old,new)in changes.items())
with a.output.open('x')as f:f.write(patch)
with a.output.with_suffix('.inputs.json').open('x')as f:json.dump(inputs,f,indent=2);f.write('\n')
