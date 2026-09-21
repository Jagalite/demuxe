"""Restricted AAC-LC PCE -> standard stereo ASC; no AAC packet rewrite."""
from __future__ import annotations
import json,subprocess,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];F=ROOT/'fixtures';E=ROOT/'evidence';log=[]
def run(args):
 p=subprocess.run([str(x) for x in args],capture_output=True,timeout=30)
 log.append({'argv':[str(x) for x in args],'returncode':p.returncode,'stderr':p.stderr.decode(errors='replace')})
 (E/'pce_commands.json').write_text(json.dumps(log,indent=2))
 if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace'))
 return p.stdout
# Encoder-provided valid PCE and ordinary-ASC references, same restricted AAC profile.
for pce,name in [(1,'pce_audio.mp4'),(0,'standard_audio.mp4')]:
 run(['ffmpeg','-y','-v','error','-f','lavfi','-i','aevalsrc=0.1*sin(2*PI*997*t)|0.12*sin(2*PI*1481*t):s=48000:d=4',
      '-c:a','aac','-b:a','128k','-aac_pce',str(pce),'-movflags','+frag_keyframe+empty_moov+default_base_moof',F/name])
run(['ffmpeg','-y','-v','error','-i',F/'video.mp4','-i',F/'pce_audio.mp4','-map','0:v:0','-map','1:a:0','-c','copy',
     '-movflags','+frag_keyframe+empty_moov+default_base_moof',F/'av_pce.mp4'])
run(['ffmpeg','-y','-v','error','-f','s24le','-ar','48000','-ac','6','-channel_layout','5.1','-i',F/'sixch.s24le',
     '-c:a','aac','-aac_pce','1','-b:a','256k','-movflags','+frag_keyframe+empty_moov+default_base_moof',F/'sixch_pce.mp4'])

def get_esds(b):
 p=b.find(b'esds')-4
 if p<0:raise ValueError('no esds')
 n=int.from_bytes(b[p:p+4],'big');return p,b[p:p+n]
def asc_from_esds(b):
 # This fixture's descriptors use the standard 4-byte descriptor-length form.
 marker=b'\x05\x80\x80\x80';p=b.find(marker)
 if p<0:raise ValueError('unexpected descriptor form')
 n=b[p+4];return b[p+5:p+5+n]
class Bits:
 def __init__(self,b):self.b=b;self.p=0
 def get(self,n):
  if self.p+n>len(self.b)*8:raise ValueError('truncated bits')
  v=0
  for _ in range(n):v=(v<<1)|((self.b[self.p//8]>>(7-self.p%8))&1);self.p+=1
  return v

def restricted_mapping(a):
 r=Bits(a);d={}
 d['aot']=r.get(5);d['frequency_index']=r.get(4);d['channel_configuration']=r.get(4)
 d['frameLengthFlag']=r.get(1);d['dependsOnCoreCoder']=r.get(1);d['extensionFlag']=r.get(1)
 if (d['aot'],d['channel_configuration'],d['frameLengthFlag'],d['dependsOnCoreCoder'],d['extensionFlag'])!=(2,0,0,0,0):
  raise ValueError('outside AAC-LC no-extension PCE profile')
 d['tag']=r.get(4);d['pce_object_type']=r.get(2);d['pce_frequency_index']=r.get(4)
 d['front_count']=r.get(4);d['side_count']=r.get(4);d['back_count']=r.get(4);d['lfe_count']=r.get(2);d['assoc_count']=r.get(3);d['cc_count']=r.get(4)
 d['mono_mixdown']=r.get(1)
 if d['mono_mixdown']:raise ValueError('mono mixdown not admitted')
 d['stereo_mixdown']=r.get(1)
 if d['stereo_mixdown']:raise ValueError('stereo mixdown not admitted')
 d['matrix_mixdown']=r.get(1)
 if d['matrix_mixdown']:raise ValueError('matrix mixdown not admitted')
 if (d['front_count'],d['side_count'],d['back_count'],d['lfe_count'],d['assoc_count'],d['cc_count'])!=(1,0,0,0,0,0):
  return {'admitted':False,'reason':'not exactly one front stereo CPE','parsed':d}
 d['front_is_cpe']=r.get(1);d['front_tag']=r.get(4)
 d['admitted']=d['front_is_cpe']==1 and d['front_tag']==0 and d['pce_object_type']==1 and d['pce_frequency_index']==d['frequency_index']
 r.p=(r.p+7)//8*8;comment_len=r.get(8);d['comment_bytes']=comment_len
 for _ in range(comment_len):r.get(8)
 d['extension_hex']=a[r.p//8:].hex();return d

pos,orig=get_esds((F/'av_pce.mp4').read_bytes());_,template=get_esds((F/'standard_audio.mp4').read_bytes())
asc=asc_from_esds(orig);mapping=restricted_mapping(asc);assert mapping['admitted']
# Verify template is AAC-LC, same sample-rate index, channel_configuration=2, same trailing extension.
ta=asc_from_esds(template);tr=Bits(ta);assert tr.get(5)==2 and tr.get(4)==mapping['frequency_index'] and tr.get(4)==2
assert ta[2:].hex()==mapping['extension_hex']
# Rebuild only the ASC descriptor and ancestor lengths, retaining original ES_ID,
# stream type, buffer size and bitrate fields. The independently encoded template
# validates the canonical ASC, not the surrounding track-specific descriptor.
def descriptor(b,p):
 tag=b[p];p+=1;n=0
 for _ in range(4):
  v=b[p];p+=1;n=(n<<7)|(v&127)
  if not v&128:break
 else:
  if v&128:raise ValueError('descriptor length overflow')
 if p+n>len(b):raise ValueError('truncated descriptor')
 return tag,p,p+n

def enc(tag,body):
 n=len(body);assert n < (1<<28)
 return bytes([tag,128|((n>>21)&127),128|((n>>14)&127),128|((n>>7)&127),n&127])+body
rt,rp,re=descriptor(orig,12);assert rt==3 and orig[rp+2]==0
ct,cp,ce=descriptor(orig,rp+3);assert ct==4
at,ap,ae=descriptor(orig,cp+13);assert at==5
new_decoder=enc(4,orig[cp:cp+13]+enc(5,ta)+orig[ae:ce])
new_root=enc(3,orig[rp:rp+3]+new_decoder+orig[ce:re])
body=orig[8:12]+new_root+orig[re:]
template=(8+len(body)).to_bytes(4,'big')+b'esds'+body
pad=len(orig)-len(template);assert pad>=8
source=(F/'av_pce.mp4').read_bytes();out=source[:pos]+template+pad.to_bytes(4,'big')+b'free'+bytes(pad-8)+source[pos+len(orig):]
assert len(out)==len(source)
(F/'av_pce_canonical.mp4').write_bytes(out)
_,six_esds=get_esds((F/'sixch_pce.mp4').read_bytes());negative=restricted_mapping(asc_from_esds(six_esds));assert not negative['admitted']

def inspect(name):
 path=F/name;d=json.loads(run(['ffprobe','-v','error','-show_streams','-show_packets','-show_data_hash','sha256','-of','json',path]))
 (E/(name+'.ffprobe.json')).write_text(json.dumps(d,indent=2))
 pcm=run(['ffmpeg','-v','error','-i',path,'-map','0:a:0','-f','f32le','-c:a','pcm_f32le','pipe:1'])
 return {'packets':[(p['stream_index'],p.get('pts'),p.get('dts'),p.get('duration'),p['data_hash']) for p in d['packets']],
  'pcm_sha256':hashlib.sha256(pcm).hexdigest(),'pcm_frames':len(pcm)//8,'bytes':path.stat().st_size}
a,b=inspect('av_pce.mp4'),inspect('av_pce_canonical.mp4')
r={'mapping':mapping,'multichannel_guard_control':negative,'original_asc_hex':asc.hex(),'canonical_asc_hex':ta.hex(),
 'packets_identical':a['packets']==b['packets'],'packet_count':len(a['packets']),'host_pcm_exact':a['pcm_sha256']==b['pcm_sha256'],
 'host_pcm_frames':a['pcm_frames'],'host_pcm_sha256':a['pcm_sha256'],'file_bytes':len(out),'esds_bytes_before':len(orig),'esds_bytes_after':len(template),
 'changed_byte_values':sum(x!=y for x,y in zip(source,out)),'padding_bytes':pad}
(E/'pce_component.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2))
