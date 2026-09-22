# SPDX-License-Identifier: Apache-2.0
"""Independent host packet, PCM, and picture comparisons of actual owner output."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

c=json.loads(Path(sys.argv[1]).read_text());run=Path(c['run']);build=Path(c['build']);out=run/'host-oracles';out.mkdir(exist_ok=True);commands=[]
def command(args):
 p=subprocess.run(args,capture_output=True,timeout=45);commands.append({'argv':args,'exit':p.returncode,'stderr':p.stderr.decode(errors='replace')});
 if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace'))
 return p.stdout
def digest(data):return hashlib.sha256(data).hexdigest()
def first_presentation(source,target):
 b=source.read_bytes()
 if b[4:8]==b'ftyp':
  at=0;seen=False
  while at+8<=len(b):
   n=int.from_bytes(b[at:at+4],'big');kind=b[at+4:at+8]
   if kind==b'ftyp':
    if seen:break
    seen=True
   if n==1:n=int.from_bytes(b[at+8:at+16],'big')
   if n<8 or at+n>len(b):raise ValueError('incomplete top-level box')
   at+=n
  b=b[:at]
 elif b[:4]==bytes.fromhex('1a45dfa3'):
  # Subsequent retained-player seeks append a complete new EBML initialization.
  header=b[:16];pos=b.find(header,16)
  if pos>=0:b=b[:pos]
 else:raise ValueError('unknown captured presentation')
 target.write_bytes(b);return target
def inspect(p):
 probe=json.loads(command(['ffprobe','-v','error','-show_streams','-show_packets','-show_data_hash','sha256','-of','json',str(p)]))
 d={'file':str(p),'sha256':digest(p.read_bytes()),'streams':[]}
 for st in probe['streams']:
  typ=st['codec_type']
  if typ not in ['audio','video']:continue
  payload=command(['ffmpeg','-v','error','-i',str(p),'-map',f'0:{st["index"]}',*(['-f','f32le','-c:a','pcm_f32le'] if typ=='audio' else ['-fps_mode','passthrough','-pix_fmt','yuv420p','-f','rawvideo']),'-'])
  packets=[x for x in probe['packets'] if x['stream_index']==st['index']]
  d['streams'].append({'type':typ,'codec':st['codec_name'],'channels':st.get('channels'),'sample_rate':st.get('sample_rate'),'width':st.get('width'),'height':st.get('height'),'decoded_bytes':len(payload),'decoded_sha256':digest(payload),'packet_hashes':[x['data_hash'] for x in packets],'packet_durations':[x.get('duration_time') for x in packets],'side_data':[x.get('side_data_list',[]) for x in packets]})
 return d
comparisons=[
 ('D01','aac-owner-screen/D01.appended.bin','aac-owner-screen/D01-reference.appended.bin'),
 ('D08','aac-owner-screen/D08.appended.bin','aac-owner-screen/D08-reference.appended.bin'),
 ('D09','owner-screen/D09.appended.bin','owner-screen/D08-reference.appended.bin'),
 ('D10','owner-screen/D10.appended.bin','owner-screen/D08-reference.appended.bin'),
 ('D15-ogg','owner-screen/D15-ogg.appended.bin',str(build/'batch03/opus_plus.ogg')),
 ('D15-webm','owner-screen/D15-webm.appended.bin',str(build/'batch03/opus_plus.webm')),
 ('D41-xiph','owner-screen/D41-xiph.appended.bin',str(build/'batch08/recovered_xiph.webm')),
 ('D41-ebml','owner-screen/D41-ebml.appended.bin',str(build/'batch08/recovered_ebml.webm')),
 ('D69','owner-screen/D69.appended.bin',str(build/'batch16/opus_declared_view.ogg')),
 ('D72','owner-screen/D72.appended.bin',str(build/'batch17/vfr_explicit.webm')),
]
results=[]
try:
 for ident,an,bn in comparisons:
  row={'id':ident};results.append(row)
  try:
   ap=first_presentation(run/an,out/(ident+'-candidate.media'))
   bp=first_presentation(run/bn,out/(ident+'-reference.media')) if bn.endswith('.bin') else Path(bn)
   a=inspect(ap);b=inspect(bp);row.update(candidate=a,reference=b)
   row['decoded_exact']=len(a['streams'])==len(b['streams']) and all(x['decoded_sha256']==y['decoded_sha256'] for x,y in zip(a['streams'],b['streams']))
   row['payload_exact']=len(a['streams'])==len(b['streams']) and all(x['packet_hashes']==y['packet_hashes'] for x,y in zip(a['streams'],b['streams']))
   print(ident,'decoded exact:',row['decoded_exact'],'payload exact:',row['payload_exact'],flush=True)
  except Exception as e:row['error']=str(e);print(ident,'ERROR',str(e),flush=True)
finally:
 (out/'results.json').write_text(json.dumps({'comparisons':results,'ffmpeg':subprocess.check_output(['ffmpeg','-version'],text=True).splitlines()[0]},indent=2)+'\n')
 (out/'commands.json').write_text(json.dumps(commands,indent=2)+'\n')
