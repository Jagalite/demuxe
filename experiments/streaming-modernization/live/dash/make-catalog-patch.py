#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Build all-period tables through FFmpeg's existing MPD/representation parser."""
import argparse,difflib,hashlib,json
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--session',action='store_true');a=p.parse_args();here=Path(__file__).resolve().parent;changes={}
def once(s,old,new):assert s.count(old)==1,old;return s.replace(old,new,1)
name='libavformat/dashdec.c';old=(a.source/name).read_text();s=once(old,'#include "demuxe.h"','#include "demuxe.h"\n#include "demuxe-dash-periods.h"')
s=once(s,'typedef struct DASHContext {','''struct demuxe_dash_catalog_period {
    struct demuxe_dash_period timing;
    uint32_t serial;
    int counts[3];
    struct representation **lists[3];
};
typedef struct DASHContext {''')
s=once(s,'    int demuxe_sparse;','    int demuxe_sparse;\n    struct demuxe_dash_catalog_period *demuxe_periods;\n    int demuxe_period_count;')
s=once(s,'    int demuxe_period_count;', '    int demuxe_period_count,demuxe_handoff,demuxe_reload_error;\n    int64_t demuxe_last_reload,demuxe_update_us,demuxe_availability_us,demuxe_dvr_us;\n    uint32_t demuxe_next_period;\n    uint64_t demuxe_revision;')
s=once(s,'        if (!val) {\n            av_log(s, AV_LOG_ERROR, "Unable to parse', '        if (!val && !c->demuxe_sparse) {\n            av_log(s, AV_LOG_ERROR, "Unable to parse')
s=once(s,'        if (!av_strcasecmp(val, "dynamic"))\n            c->is_live = 1;', '        c->is_live = val && !av_strcasecmp(val, "dynamic");')
s=once(s,'static int parse_manifest(AVFormatContext *s, const char *url, AVIOContext *in)',(here/'catalog.inc').read_text()+'\nstatic int parse_manifest(AVFormatContext *s, const char *url, AVIOContext *in)')
s=once(s,'        // at now we can handle only one period, with the longest duration','''        if(c->demuxe_sparse){
            ret=demuxe_dash_parse_catalog(s,url,root_element,mpd_baseurl_node);
            goto cleanup;
        }
        // at now we can handle only one period, with the longest duration''')
s=once(s,'static int dash_close(AVFormatContext *s)\n{\n    DASHContext *c = s->priv_data;', 'static int dash_close(AVFormatContext *s)\n{\n    DASHContext *c = s->priv_data;\n    demuxe_dash_free_catalog(c);')
# Characterization stage must never enter upstream's index-based live refresh
# with all-period ownership. A following patch will install transactional refresh.
s=once(s,'static int refresh_manifest(AVFormatContext *s)\n{','static int refresh_manifest(AVFormatContext *s)\n{\n    if(((DASHContext*)s->priv_data)->demuxe_periods)return AVERROR(ENOSYS);')
# Preserve manifest language for identity matching after AVStream metadata setup.
assert s.count('move_metadata(rep->assoc_stream[0], "language", &rep->lang);')==2
s=s.replace('move_metadata(rep->assoc_stream[0], "language", &rep->lang);','av_dict_set(&rep->assoc_stream[0]->metadata, "language", rep->lang, 0);')
if a.session:s=once(s,'if (c->is_live || !rep->init_section || rep->demuxe_protected)','if (!rep->init_section || rep->demuxe_protected)')
if a.session:s=s[:s.index('/* Snapshot plans from the authoritative MPD parser')]
s+='\n'+(here/'catalog-plan.inc').read_text()+'\n'+(here/'catalog-refresh.inc').read_text()
if a.session:s+='\n'+(here/'session-plan.inc').read_text()
changes[name]=(old,s)
name='libavformat/demuxe.h';old=(a.source/name).read_text();s=once(old,'#endif','''struct AVDemuxePeriod {char id[128];int64_t start_us,duration_us;int counts[3];};
int av_demuxe_dash_period_count(AVFormatContext *);
int av_demuxe_dash_period_info(AVFormatContext *,int,struct AVDemuxePeriod *);
int av_demuxe_dash_period_plan(AVFormatContext *,int,int,int,int64_t,struct AVDemuxeSegment *);
int av_demuxe_dash_handoff(AVFormatContext *);
int av_demuxe_dash_refresh(AVFormatContext *);
#endif''')
if a.session:
 s=once(s,'#define AV_DEMUXE_PLAN_ABI 1','#define AV_DEMUXE_PLAN_ABI 2')
 s=once(s,'    int64_t sequence, start_us, duration_us;','    int64_t sequence, start_us, duration_us;\n    int64_t timestamp_offset_us,presentation_start_us,presentation_end_us;')
 s=once(s,'#endif','int av_demuxe_dash_component(AVFormatContext *,int,struct AVDemuxeRepresentation *);\nint av_demuxe_dash_window(AVFormatContext *,int,struct AVDemuxeWindow *);\n#endif')
changes[name]=(old,s)
name='libavformat/Makefile';old=(a.source/name).read_text();s=once(old,'OBJS-$(CONFIG_DASH_DEMUXER)              += dash.o dashdec.o','OBJS-$(CONFIG_DASH_DEMUXER)              += dash.o dashdec.o demuxe-dash-periods.o');changes[name]=(old,s)
for suffix in ['h','c']:
 name='libavformat/demuxe-dash-periods.'+suffix;changes[name]=('',(here/('periods.'+suffix)).read_text().replace('"periods.h"','"demuxe-dash-periods.h"'))
patch=''.join(''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='a/'+name if old else '/dev/null',tofile='b/'+name))for name,(old,new)in changes.items())
with a.output.open('x')as f:f.write(patch)
inputs={str(a.source/name):hashlib.sha256(old.encode()).hexdigest()for name,(old,_)in changes.items() if old}
for f in [Path(__file__),here/'periods.h',here/'periods.c',here/'catalog.inc',here/'catalog-plan.inc',here/'catalog-refresh.inc']:inputs[str(f)]=hashlib.sha256(f.read_bytes()).hexdigest()
if a.session:inputs[str(here/'session-plan.inc')]=hashlib.sha256((here/'session-plan.inc').read_bytes()).hexdigest()
a.output.with_suffix('.inputs.json').write_text(json.dumps(inputs,indent=2)+'\n')
