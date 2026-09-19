#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Generate the private plan seam against the recorded strict/continuous baseline."""
import argparse,difflib,hashlib,json
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',required=True,type=Path);p.add_argument('--output',required=True,type=Path);a=p.parse_args()
here=Path(__file__).resolve().parent;changes={};inputs={}
for name in ['libavformat/hls.c','libavformat/dashdec.c','libavformat/Makefile']:
 old=(a.source/name).read_text();new=old;inputs[name]=hashlib.sha256(old.encode()).hexdigest()
 if name.endswith('Makefile'):
  new=new.replace('HEADERS = avformat.h','HEADERS = demuxe.h avformat.h',1)
 else:
  assert new.count('#include "demux.h"') == 1
  new=new.replace('#include "demux.h"','#include "demux.h"\n#include "demuxe.h"',1)
  if name.endswith('dashdec.c'):
   new=new.replace('    char *id;','    char *id;\n    char demuxe_group[128];\n    int demuxe_protected;',1)
   # The demuxer owns representation identity for its entire source lifetime.
   # AVStream metadata may be transferred/cleared by a consumer such as mpv.
   new=new.replace('        move_metadata(rep->assoc_stream[0], "id", &rep->id);',
                   '        ret = av_dict_set(&rep->assoc_stream[0]->metadata, "id", rep->id, 0);\n        if (ret < 0) return ret;')
   marker='    rep->parent = s;'
   new=new.replace(marker,marker+'''
    // Keep group provenance instead of guessing from codec/dimensions later.
    val = xmlGetProp(adaptionset_node, "id");
    if (val) {
        if (strlen(val) + 8 < sizeof(rep->demuxe_group))
            snprintf(rep->demuxe_group, sizeof(rep->demuxe_group), "dash:id:%s", val);
        xmlFree(val); val = NULL;
    } else {
        unsigned ordinal = 0;
        for (xmlNodePtr previous = adaptionset_node->prev; previous; previous = previous->prev)
            if (previous->type == XML_ELEMENT_NODE) ordinal++;
        snprintf(rep->demuxe_group, sizeof(rep->demuxe_group), "dash:ordinal:%u", ordinal);
    }
    rep->demuxe_protected = !!find_child_node_by_name(adaptionset_node, "ContentProtection") ||
                           !!find_child_node_by_name(representation_node, "ContentProtection");
''',1)
  snippet=here/'plan'/('hls.inc' if name.endswith('hls.c') else 'dash.inc')
  inputs[str(snippet)]=hashlib.sha256(snippet.read_bytes()).hexdigest()
  new+='\n'+snippet.read_text()
 changes[name]=(old,new)
header=here/'plan/demuxe.h';changes['libavformat/demuxe.h']=('',header.read_text());inputs[str(header)]=hashlib.sha256(header.read_bytes()).hexdigest()
patch=''.join(''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='a/'+name if old else '/dev/null',tofile='b/'+name)) for name,(old,new) in changes.items())
with a.output.open('x') as f:f.write(patch)
with a.output.with_suffix('.inputs.json').open('x') as f:json.dump(inputs,f,indent=2);f.write('\n')
