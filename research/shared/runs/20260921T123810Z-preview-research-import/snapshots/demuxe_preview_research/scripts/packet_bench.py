# SPDX-License-Identifier: Apache-2.0
"""Packet-selected thumbnails on bounded, self-generated closed-GOP fixtures.
Not a general media parser or random-access validation library. Preparation is
outside timed trials; it reads the complete local fixture. Payload sizes are NOT
measured HTTP transfer savings. Production requires an index + decoder config.
"""
from __future__ import annotations
import pathlib, subprocess, json, struct, hashlib, statistics, time, resource, random
R=pathlib.Path(__file__).resolve().parents[1]; F=R/'fixtures'; O=R/'results'
def checked(cmd:list[str])->bytes:
 p=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=40)
 if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace'))
 return p.stdout
BASE=['ffmpeg','-hide_banner','-nostdin','-v','error','-threads','1','-filter_threads','1','-filter_complex_threads','1']
VF='scale=240:135:flags=area,format=rgb24'
def output(inp:list[str],vf=VF,one=False):
 return BASE+inp+['-an','-sn','-dn','-vf',vf]+(['-frames:v','1'] if one else [])+['-fps_mode','vfr','-f','rawvideo','-']
# Reusable local metadata; extradata supplied by the same fixture maker/browser harness.
meta=json.loads((F/'h264_packets.json').read_text()); desc=bytes(meta['description']); src=(F/'h264.mp4').read_bytes()
nlen=(desc[4]&3)+1; idx=6; nalus=[]
for group in range(2):
 count=desc[5]&31 if group==0 else desc[idx]
 if group:idx+=1
 for _ in range(count):
  n=int.from_bytes(desc[idx:idx+2],'big');idx+=2
  nalus.append(desc[idx:idx+n]);idx+=n
headers=b''.join(b'\0\0\0\1'+n for n in nalus)
def unpack(packet):
 b=src[int(packet['pos']):int(packet['pos'])+int(packet['size'])]; out=[]; j=0
 while j<len(b):
  if j+nlen>len(b):raise ValueError('truncated length')
  n=int.from_bytes(b[j:j+nlen],'big');j+=nlen
  if n<=0 or j+n>len(b):raise ValueError('bad NAL length')
  out.append(b[j:j+n]);j+=n
 return out
packets=meta['packets']; keys=[i for i,p in enumerate(packets) if 'K' in p['flags']]
start=next(i for i in keys if float(packets[i]['pts_time'])==2.0); stop=next(i for i in keys if i>start)
key=packets[start]; assert any(n[0]&31==5 for n in unpack(key)), 'fixture key must be IDR'
gop=packets[start:stop]
for name,ps in [('h264_key2.h264',[key]),('h264_gop2.h264',gop)]:
 (F/name).write_bytes(headers+b''.join(b'\0\0\0\1'+n for p in ps for n in unpack(p)))
# VP9: preselect known key packets instead of relying on a decoder skip flag.
checked(BASE+['-y','-i',str(F/'vp9.webm'),'-c:v','copy','-f','ivf',str(F/'vp9_all.ivf')])
raw=(F/'vp9_all.ivf').read_bytes(); assert raw[:4]==b'DKIF' and raw[8:12]==b'VP90'
header_len=int.from_bytes(raw[6:8],'little'); ivf_frames=[]; pos=header_len
while pos<len(raw):
 n=struct.unpack_from('<I',raw,pos)[0]; end=pos+12+n
 if end>len(raw):raise ValueError('truncated IVF')
 ivf_frames.append(raw[pos:end]);pos=end
probe=json.loads(checked(['ffprobe','-v','error','-select_streams','v:0','-show_packets','-show_entries','packet=flags,pts_time,size','-of','json',str(F/'vp9_all.ivf')]))['packets']
assert len(probe)==len(ivf_frames)
keyframes=[b for b,p in zip(ivf_frames,probe) if 'K' in p['flags']]
h=bytearray(raw[:header_len]);struct.pack_into('<I',h,24,len(keyframes))
(F/'vp9_keys.ivf').write_bytes(h+b''.join(keyframes))
variants={
 'h264_coarse_IDR_2s':output(['-i',str(F/'h264_key2.h264')],one=True),
 'h264_exact_GOP_3p5s':output(['-i',str(F/'h264_gop2.h264')],vf='select=eq(n\\,45),'+VF,one=True),
 'h264_exact_input_seek_3p5s':output(['-ss','3.5','-i',str(F/'h264.mp4')],one=True),
 'vp9_full_then_select':output(['-i',str(F/'vp9_all.ivf')],vf='select=eq(pict_type\\,I),'+VF),
 'vp9_selected_key_packets':output(['-i',str(F/'vp9_keys.ivf')]),
}
refs={
 'h264_2s':checked(output(['-i',str(F/'h264.mp4')],vf='select=eq(n\\,60),'+VF,one=True)),
 'h264_3p5s':checked(output(['-i',str(F/'h264.mp4')],vf='select=eq(n\\,105),'+VF,one=True)),
 'vp9':checked(variants['vp9_full_then_select']),
}
rows={k:[] for k in variants};outs={}
for round in range(8):
 names=list(variants);random.Random(719+round).shuffle(names)
 for k in names:
  b=resource.getrusage(resource.RUSAGE_CHILDREN);t=time.perf_counter()
  payload=checked(variants[k]);wall=(time.perf_counter()-t)*1000;a=resource.getrusage(resource.RUSAGE_CHILDREN)
  rows[k].append({'warmup':round==0,'wall_ms':wall,'cpu_ms':1000*(a.ru_utime+a.ru_stime-b.ru_utime-b.ru_stime),'sha256':hashlib.sha256(payload).hexdigest(),'bytes':len(payload)})
  outs[k]=payload
summary=[]
for k,rr in rows.items():
 ref=refs['vp9' if k.startswith('vp9') else ('h264_2s' if 'coarse' in k else 'h264_3p5s')]
 summary.append({'method':k,'wall_ms_median':statistics.median(r['wall_ms'] for r in rr[1:]),'cpu_ms_median':statistics.median(r['cpu_ms'] for r in rr[1:]),'frames':len(outs[k])//(240*135*3),'same_pixels_at_represented_timestamp':outs[k]==ref,'stable':len({r['sha256'] for r in rr})==1})
result={'methodology':'1 warmup+7 seeded randomized trials. Hot local files; single-thread software CLI process+decode+scale+stdout. Preparation/demux index discovery excluded. Only self-generated closed-GOP fixture; no HTTP or browser tests. Coarse and exact H264 outputs deliberately represent DIFFERENT times.','summary':summary,'raw':rows,'commands':variants,'payloads':{'h264_key2_encoded_bytes':int(key['size']),'h264_gop2_encoded_bytes':sum(int(p['size']) for p in gop),'h264_gop_packets':len(gop),'h264_keyframe_time':2.0,'h264_requested_time':3.5,'vp9_all_packets':len(ivf_frames),'vp9_selected_packets':len(keyframes),'vp9_all_encoded_payload_bytes':sum(len(b)-12 for b in ivf_frames),'vp9_selected_encoded_payload_bytes':sum(len(b)-12 for b in keyframes),'note':'Codec config, container index, fetch alignment/latency and preparation excluded from payload totals; not measured network traffic.'}}
(O/'packet_bench.json').write_text(json.dumps(result,indent=2));print(json.dumps({k:v for k,v in result.items() if k in ['summary','payloads']},indent=2))
