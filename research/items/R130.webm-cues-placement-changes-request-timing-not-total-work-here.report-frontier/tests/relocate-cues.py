# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import hashlib
import json
import struct
import subprocess
import time

HOME = Path(__file__).resolve().parents[1]
OUT = HOME / 'evidence/20260919T221600Z-cues-placement'
OUT.mkdir(exist_ok=True)
SOURCE = Path('research/shared/runs/20260919T221240Z-virtual-cues-sized/indexed-reference.webm')
DATA = SOURCE.read_bytes()

def vint(data, at, tag=False):
    if not data[at]:
        raise ValueError('VINT')
    width = next(n for n in range(1, 9) if data[at] & (128 >> (n-1)))
    value = int.from_bytes(data[at:at+width], 'big')
    return value if tag else value & ((1 << (7*width))-1), at+width

def elements(data, start=0, end=None):
    end = len(data) if end is None else end
    while start < end:
        kind, pos = vint(data, start, True)
        size, body = vint(data, pos)
        if body+size > end:
            raise ValueError('parent bound')
        yield kind, start, body, body+size
        start = body+size

def box(kind, body):
    ident = kind.to_bytes((kind.bit_length()+7)//8, 'big')
    width = next(n for n in range(1,9) if len(body) < (1 << (7*n))-1)
    return ident + ((1 << (7*width)) | len(body)).to_bytes(width,'big') + body

def uint(kind, value, width=None):
    return box(kind, value.to_bytes(width or max(1,(value.bit_length()+7)//8),'big'))

header = next(x for x in elements(DATA) if x[0] == 0x1a45dfa3)
segment = next(x for x in elements(DATA) if x[0] == 0x18538067)
children = list(elements(DATA,segment[2],segment[3]))
clusters = [DATA[start:end] for kind,start,body,end in children if kind == 0x1f43b675]
old_positions = [start-segment[2] for kind,start,body,end in children if kind == 0x1f43b675]
metadata = [(kind,DATA[start:end]) for kind,start,body,end in children if kind not in [0x114d9b74,0xec,0x1f43b675,0x1c53bb6b]]
cue = next(x for x in children if x[0] == 0x1c53bb6b)
points = []
for _,_,body,end in elements(DATA,cue[2],cue[3]):
    fields = list(elements(DATA,body,end))
    time_elem = next(x for x in fields if x[0] == 0xb3)
    clock = int.from_bytes(DATA[time_elem[2]:time_elem[3]],'big')
    pos_elem = next(x for x in fields if x[0] == 0xb7)
    values = {kind:int.from_bytes(DATA[a:b],'big') for kind,_,a,b in elements(DATA,pos_elem[2],pos_elem[3])}
    points.append({'time':clock,'cluster':old_positions.index(values[0xf1]),'track':values[0xf7],'relative':values.get(0xf0)})

def make_cues(positions):
    output = []
    for p in points:
        values = uint(0xf7,p['track']) + uint(0xf1,positions[p['cluster']],8)
        if p['relative'] is not None:
            values += uint(0xf0,p['relative'])
        output.append(box(0xbb,uint(0xb3,p['time'])+box(0xb7,values)))
    return box(0x1c53bb6b,b''.join(output))

def seek_head(positions):
    return box(0x114d9b74,b''.join(box(0x4dbb,box(0x53ab,kind.to_bytes(4,'big'))+uint(0x53ac,pos,8)) for kind,pos in positions))

def author(mode, stale_offsets=False):
    started=time.perf_counter_ns()
    placeholder=seek_head([(0x1549a966,0),(0x1654ae6b,0),(0x1c53bb6b,0)])
    cue_len=len(make_cues([0]*len(clusters)))
    metadata_bytes=b''.join(body for _,body in metadata)
    cluster_start=len(placeholder)+len(metadata_bytes)+(cue_len if mode=='front' else 0)
    positions=[cluster_start+sum(map(len,clusters[:i])) for i in range(len(clusters))]
    if stale_offsets:
        positions=[pos-cue_len for pos in positions]
    cues=make_cues(positions)
    assert len(cues)==cue_len
    offsets=[];pos=len(placeholder)
    for kind,body in metadata:
        if kind in (0x1549a966,0x1654ae6b): offsets.append((kind,pos))
        pos+=len(body)
    offsets.append((0x1c53bb6b,len(placeholder)+len(metadata_bytes) if mode=='front' else cluster_start+sum(map(len,clusters))))
    head=seek_head(offsets);assert len(head)==len(placeholder)
    payload=head+metadata_bytes+(cues if mode=='front' else b'')+b''.join(clusters)+(cues if mode=='tail' else b'')
    for pos in positions:
        if vint(payload,pos,True)[0]!=0x1f43b675:
            raise ValueError('relocated CueClusterPosition does not point to Cluster')
    output=DATA[header[1]:header[3]]+box(0x18538067,payload)
    return output,(time.perf_counter_ns()-started)/1e6

results={}
for mode in ['tail','front']:
    data,ms=author(mode);path=OUT/(mode+'.webm');path.write_bytes(data)
    seg=next(x for x in elements(data) if x[0]==0x18538067)
    copied=[data[a:e] for k,a,z,e in elements(data,seg[2],seg[3]) if k==0x1f43b675]
    assert copied==clusters
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(path)]))
    scalars=[{k:p.get(k) for k in ['pts','dts','duration','size','flags','data_hash']} for p in probe['packets']]
    results[mode]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'authorMs':ms,'clusterBytesUnchanged':True,'packets':scalars}
assert results['tail']['bytes']==results['front']['bytes']
assert results['tail']['packets']==results['front']['packets']
try:
    author('front',True)
    raise AssertionError('stale cue positions accepted')
except ValueError as error:
    results['staleOffsetRejected']=str(error)
results['source']=str(SOURCE)
results['sourceSHA256']=hashlib.sha256(DATA).hexdigest()
(OUT/'author-result.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps({mode:{k:v for k,v in results[mode].items() if k!='packets'} for mode in ['tail','front']},indent=2))
