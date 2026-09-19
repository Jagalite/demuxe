#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Generate the experimental logical-video mpv seam against a recorded baseline."""
import argparse,difflib,hashlib,json
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',required=True,type=Path);p.add_argument('--output',required=True,type=Path);a=p.parse_args()
here=Path(__file__).resolve().parent;changes={};inputs={}
def replace(text,old,new):
    assert text.count(old)==1,old
    return text.replace(old,new,1)
name='demux/demux_lavf.c';old=(a.source/name).read_text();s=old
s=replace(s,'#include "stheader.h"','#include "stheader.h"\n#include "session-control.h"')
s=replace(s,'    bool is_dvd_bd;', '''    struct demuxe_adaptive_session *adaptive;
    uint64_t adaptive_source,adaptive_request;
    int adaptive_logical,adaptive_codecs_count;
    bool adaptive_hidden[64];
    size_t adaptive_codec_bytes;
    struct mp_codec_params *adaptive_codecs[64];
    bool is_dvd_bd;''')
s=replace(s,'static void update_read_stats(struct demuxer *demuxer)',(here/'mpv/lavf-adaptive.inc').read_text()+'\nstatic void update_read_stats(struct demuxer *demuxer)')
s=replace(s,'    switch (codec->codec_type) {','    switch (i<64&&priv->adaptive_hidden[i]?AVMEDIA_TYPE_UNKNOWN:codec->codec_type) {')
s=replace(s,'    mp_set_avdict(&dopts, lavfdopts->avopts);','''    mp_set_avdict(&dopts, lavfdopts->avopts);
#ifdef __EMSCRIPTEN__
    if(demuxe_control_enabled(priv->browser_session)){av_dict_set(&dopts,"continuous_fmp4","1",0);av_dict_set(&dopts,"demuxe_sparse","1",0);}
#else
    if(demuxe_control_enabled(1)){av_dict_set(&dopts,"continuous_fmp4","1",0);av_dict_set(&dopts,"demuxe_sparse","1",0);}
#endif''')
s=replace(s,'    add_new_streams(demuxer);\n\n    mp_tags_move_from_av_dictionary', '    if(avfc->nb_streams<=64&&adaptive_init(demuxer)<0)goto fail;\n    add_new_streams(demuxer);\n\n    mp_tags_move_from_av_dictionary')
s=replace(s,'    int r = av_read_frame(priv->avfc, pkt);', '''    struct demuxe_prepared_packet prepared={0};
    int r;
    if(priv->adaptive){
        uint64_t request;int target;
        if(demuxe_control_poll(priv->adaptive_source,priv->adaptive_request,&request,&target)){
            priv->adaptive_request=request;
            int result=demuxe_adaptive_request(priv->adaptive,priv->adaptive_source,request,target);
            if(result<0)MP_WARN(demux,"Quality request rejected: %s\\n",av_err2str(result));
        }
        r=demuxe_adaptive_read(priv->adaptive,&prepared);
        struct demuxe_adaptive_stats state;demuxe_adaptive_stats(priv->adaptive,&state);demuxe_control_update(&state);
        if(!r){av_packet_free(&pkt);return true;}
        if(r>0){av_packet_move_ref(pkt,prepared.packet);r=0;}
    }else r = av_read_frame(priv->avfc, pkt);''')
# Release the preparation reference on every early return and after constructing dp.
a0=s.index('static bool demux_lavf_read_packet');a1=s.index('static void demux_drop_buffers_lavf',a0)
part=s[a0:a1]
part=part.replace('av_packet_free(&pkt);','av_packet_free(&pkt);demuxe_packet_release(&prepared);')
part=replace(part,'    if (!demux_stream_is_selected(stream)) {','    if (!stream || !demux_stream_is_selected(stream)) {')
part=replace(part,'    dp->pts = mp_pts_from_av(pkt->pts, &st->time_base);','''    AVRational packet_tb=prepared.codec?prepared.timebase:st->time_base;
    if(prepared.codec){
        dp->demuxe_quality=(struct demuxe_quality_tag){prepared.source,prepared.request,prepared.representation};
        dp->codec=adaptive_codec(priv,&prepared);
        if(!dp->codec){talloc_free(dp);av_packet_free(&pkt);demuxe_packet_release(&prepared);return false;}
        dp->segmented=true;dp->start=dp->end=MP_NOPTS_VALUE;
    }
    dp->pts = mp_pts_from_av(pkt->pts, &packet_tb);''')
part=part.replace('    dp->pos = pkt->pos;', '    // Child-container offsets repeat across segments and are not source byte positions.\n    dp->pos = prepared.codec ? -1 : pkt->pos;')
part=part.replace('mp_pts_from_av(pkt->dts, &st->time_base)','mp_pts_from_av(pkt->dts, &packet_tb)').replace('pkt->duration * av_q2d(st->time_base)','pkt->duration * av_q2d(packet_tb)')
s=s[:a0]+part+s[a1:]
s=replace(s,'    int r = av_seek_frame(priv->avfc, seek_stream, seek_pts_av, avsflags);','''    if(priv->adaptive){
        if(avsflags&AVSEEK_FLAG_BYTE)return;
        int result=demuxe_adaptive_seek(priv->adaptive,seek_pts_av);
        if(result<0){MP_WARN(demuxer,"Adaptive seek rejected: %s\\n",av_err2str(result));return;}
    }
    int r = av_seek_frame(priv->avfc, seek_stream, seek_pts_av, avsflags);''')
s=replace(s,'    select_tracks(demuxer, 0);','    select_tracks(demuxer, 0);\n    lavf_priv_t *priv=demuxer->priv;\n    if(priv->adaptive)demuxe_adaptive_tracks_changed(priv->adaptive);')
s=replace(s,'        // This will be a dangling pointer; but see below.','''        demuxe_adaptive_destroy(priv->adaptive);priv->adaptive=NULL;
        demuxe_control_close(priv->adaptive_source);
        for(int i=0;i<priv->adaptive_codecs_count;i++)avcodec_parameters_free(&priv->adaptive_codecs[i]->lav_codecpar);
        // This will be a dangling pointer; but see below.''')
changes[name]=(old,s)
name='meson.build';old=(a.source/name).read_text();s=replace(old,"    'demux/demux_lavf.c',","    'demux/demux_lavf.c',\n    'demux/container-task.c',\n    'demux/adaptive-session.c',\n    'demux/session-control.c',\n    'demux/random-access.c',\n    'demux/rewind-reader.c',")
changes[name]=(old,s)
for file in ['container-task.c','container-task.h','adaptive-session.c','adaptive-session.h','session-control.c','session-control.h','random-access.c','random-access.h','rewind-reader.c','rewind-reader.h']:
    changes['demux/'+file]=('',(here/'task'/file).read_text())
for name,(old,new) in changes.items():inputs[name]=hashlib.sha256(old.encode()).hexdigest()
for file in [Path(__file__),here/'mpv/lavf-adaptive.inc',*sorted((here/'task').glob('*.[ch]'))]:inputs[str(file)]=hashlib.sha256(file.read_bytes()).hexdigest()
patch=''.join(''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='a/'+name if old else '/dev/null',tofile='b/'+name)) for name,(old,new) in changes.items())
with a.output.open('x') as f:f.write(patch)
with a.output.with_suffix('.inputs.json').open('x') as f:json.dump(inputs,f,indent=2);f.write('\n')
