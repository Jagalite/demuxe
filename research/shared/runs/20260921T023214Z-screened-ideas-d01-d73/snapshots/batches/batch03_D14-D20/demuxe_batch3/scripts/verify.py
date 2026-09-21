"""Independent host/oracle checks; observation gates are not production acceptance.
SPDX-License-Identifier: MIT
"""
from pathlib import Path
import json,hashlib,subprocess,sys,math
import numpy as np
R=Path(__file__).resolve().parents[1];F=R/'fixtures';E=R/'evidence'
audio=json.loads((E/'browser_audio.json').read_text());routes=json.loads((E/'browser_routes.json').read_text());refs=json.loads((E/'browser_reference.json').read_text());pixel=json.loads((E/'pixel_diagnostic.json').read_text());metadata=json.loads((E/'fixture_metadata.json').read_text())
checks=[];commands=[];obs={}
def ck(name,value,detail=None):checks.append({'name':name,'passed':bool(value),'detail':detail})
def sha(b):return hashlib.sha256(b).hexdigest()
def run(cmd):
 p=subprocess.run(list(map(str,cmd)),capture_output=True,timeout=30);commands.append({'argv':list(map(str,cmd)),'returncode':p.returncode,'stderr':p.stderr.decode(errors='replace')});return p

def packets(name,kind=None):
 path=E/(name+'.ffprobe.json')
 if path.exists():d=json.loads(path.read_text())
 else:
  p=run(['ffprobe','-v','error','-show_streams','-show_packets','-show_data_hash','sha256','-of','json',F/name]);assert p.returncode==0;d=json.loads(p.stdout);path.write_text(json.dumps(d,indent=2))
 ids={s['index'] for s in d['streams'] if kind is None or s['codec_type']==kind}
 return [p['data_hash'] for p in d['packets'] if p['stream_index'] in ids]

# D14/D17 graph identity and semantic interval witnesses. 100 ms is a coarse
# screening tolerance; this does not measure sample-exact A/V sync or speaker output.
def initial_blocks(row):
 n=sum(len(x['blocks']) for x in row.get('seeks',[]));return row['blocks'][:-n] if n else row['blocks']
def pulses(row):
 blocks=[b for b in initial_blocks(row) if b['left']['rms']>.1];groups=[]
 for b in blocks:
  if not groups or b['time']-groups[-1][-1]>.08:groups.append([])
  groups[-1].append(b['time'])
 return [[g[0],g[-1]]for g in groups]
def pulse_error(row):
 gs=pulses(row)
 return max(abs(g[0]-(.5+i)) for i,g in enumerate(gs)) if len(gs)==4 else None
ck('D14 late add rejects after video initialization', 'QuotaExceededError' in routes['late_add:0'].get('error',''))
ck('D14 declared split route and seeks execute',routes['split:0'].get('ended') and len(routes['split:0'].get('seeks',[]))==2)
ck('D14 combined declared Vorbis MP4 MIME unsupported',not routes['combined_vorbis:0'].get('supported',True))
pe=pulse_error(routes['split:0']);bad=pulse_error(routes['split:0.4']);obs['D14']={'marker_spans':pulses(routes['split:0']),'max_marker_start_error_s':pe,'wrong_offset_marker_spans':pulses(routes['split:0.4']),'wrong_offset_max_error_s':bad,'duration':routes['split:0'].get('duration'),'native_direct_original_works':routes['direct:av_vorbis.mkv:0'].get('ended')}
ck('D14 correct markers within 100ms coarse window',pe is not None and pe<.1,pe)
ck('D14 wrong 400ms offset fails same timing window',bad is not None and bad>.3,bad)
ck('D14 compressed Vorbis packets preserved across Ogg/WebM',packets('vorbis.ogg')==packets('vorbis.webm'))
ck('D14 direct source remains available',routes['direct:av_vorbis.mkv:0'].get('ended'))

# D15 gain and tail. All three gain variants use the exact same Opus packet sequence.
counts={};gainobs={}
for g in ['zero','plus','minus']:
 base=audio[f'opus_{g}.ogg'];webm=audio[f'opus_{g}.webm'];mp4=audio[f'opus_{g}.mp4']
 p=packets(f'opus_{g}.ogg');counts[g]=len(p)
 ck(f'D15 {g} Opus packet preservation',p==packets(f'opus_{g}.webm')==packets(f'opus_{g}.mp4')==packets('opus_zero.ogg'))
 ck(f'D15 {g} Ogg/WebM all decoded floats and length equal',base['hash']==webm['hash'] and base['frames']==webm['frames'])
 ck(f'D15 {g} MP4 interior equality but tail mismatch retained',base['interiorHashes']==mp4['interiorHashes'] and mp4['frames']!=base['frames'])
 ratio=base['stats'][0]['rms']/audio['opus_zero.ogg']['stats'][0]['rms'];wanted=10**({'zero':0,'plus':6,'minus':-6}[g]/20)
 ck(f'D15 {g} header gain matches requested amplitude within .1%',abs(ratio/wanted-1)<.001)
 gainobs[g]={'packets':len(p),'gain_ratio':ratio,'expected_ratio':wanted,'ogg_frames':base['frames'],'webm_frames':webm['frames'],'mp4_frames':mp4['frames'],'tail_delta_frames':mp4['frames']-base['frames']}
ck('D15 gain-stripping negative distinguishable',audio['opus_plus.webm']['hash']!=audio['opus_zero.webm']['hash'])
obs['D15']=gainobs

# D16 full PCM identity against both host FFmpeg and reference libFLAC.
flacobs={}
for label,bits,ch in [('s16',16,2),('s24',24,6),('s32',32,2)]:
 source=(F/f'{label}.pcm').read_bytes();formats={}
 for mode in ['verbatim','sparse','level0','level5']:
  name=f'{label}_{mode}.flac';p=run(['ffmpeg','-nostdin','-v','error','-i',F/name,'-map','0:a','-c:a',f'pcm_s{bits}le','-f',f's{bits}le','-']);ok=p.returncode==0 and p.stdout==source
  ck(f'D16 {name} host exact original PCM',ok,{'bytes':len(p.stdout),'hash':sha(p.stdout)})
  q=run(['flac','-t','-s',F/name]);ck(f'D16 {name} independent libFLAC CRC/MD5 test',q.returncode==0)
  formats[mode]=(F/name).stat().st_size
 ck(f'D16 {label} browser matches conventional-codec reference',audio[f'{label}_sparse.flac']['hash']==audio[f'{label}_verbatim.flac']['hash']==audio[f'{label}_level0.flac']['hash']==audio[f'{label}_level5.flac']['hash'])
 flacobs[label]={'sizes':formats,'sparse_over_level0':formats['sparse']/formats['level0'],'verbatim_over_level0':formats['verbatim']/formats['level0'],'samples_per_channel':192000,'channels':ch}
ck('D16 sparse formatter A/V MSE EOF/seek screen',routes['sparse:0'].get('ended') and len(routes['sparse:0'].get('seeks',[]))==2)
ck('D16 24bit all browser float samples exact',audio['s24_sparse.flac']['floatOracle']['mismatches']==0)
obs['D16']=flacobs

# D17 broad segment identity. Not a click-free, exact seam or decoder-session-identity claim.
seam={}
for key in ['switch:0','switch:-0.3','switch_tagged:0']:
 row=routes[key];blocks=initial_blocks(row)
 def av(lo,hi):return np.mean([b['tones'] for b in blocks if lo<=b['time']<hi],axis=0)
 first=av(.5,1.3);second=av(2.5,3.4)
 changes=[b['time']for b in blocks if b['time']>1 and b['tones'][4]>3*b['tones'][0]]
 transition=changes[0] if changes else None
 seam[key]={'first_mean_tones':first.tolist(),'second_mean_tones':second.tolist(),'first_new_codec_marker_s':transition,'duration':row.get('duration'),'switch_call_time':row.get('switchAt'),'video_buffer_retained':row.get('videoBufferIdentityBefore') and row.get('videoBufferIdentityAfter')}
 ck(f'D17 {key} both codec segment identities heard',first[0]>.08 and first[0]>10*first[4] and second[4]>.08 and second[4]>10*second[0])
 ck(f'D17 {key} video buffer retained while running',row.get('ended') and row.get('videoBufferIdentityBefore') and row.get('videoBufferIdentityAfter') and 0<row.get('switchAt',0)<1)
 if key=='switch:-0.3':ck('D17 shifted seam rejected by same 100ms window',transition is not None and abs(transition-2)>.2)
 else:ck(f'D17 {key} coarse seam marker within 100ms',transition is not None and abs(transition-2)<.1)
obs['D17']=seam

# D18 bounded independent framing/CRC guard. Only constructed constant/verbatim,
# fixed-frame-numbering, STREAMINFO-only, 48kHz streams. Never an authenticator.
def checksum(data,bits,poly):
 c=0
 for x in data:
  c^=x<<(bits-8)
  for _ in range(8):c=((c<<1)^poly if c&(1<<(bits-1)) else c<<1)&((1<<bits)-1)
 return c

def crc_guard(b):
 if b[:8]!=b'fLaC\x80\x00\x00\x22':raise ValueError('unqualified metadata')
 conf=int.from_bytes(b[18:26],'big');ch=((conf>>41)&7)+1;bits=((conf>>36)&31)+1;target=conf&((1<<36)-1)
 if conf>>44!=48000 or bits not in (16,24,32):raise ValueError('unqualified rate/width')
 p=42;nframes=0;samples=0
 while p<len(b):
  st=p
  if b[p:p+4]!=bytes([255,248,0x7a,(ch-1)<<4]):raise ValueError('unqualified frame prefix')
  p+=4;lead=b[p];width=1
  if lead>=128:
   width=0
   for bit in [128,64,32,16,8,4,2]:
    if lead&bit:width+=1
    else:break
   if width not in (2,3,4,5,6):raise ValueError('bad number')
   if any(x&192!=128 for x in b[p+1:p+width]):raise ValueError('bad continuation')
  p+=width
  if p+3>len(b):raise ValueError('truncated header')
  block=int.from_bytes(b[p:p+2],'big')+1;p+=3
  if checksum(b[st:p],8,7):raise ValueError('header CRC')
  for _ in range(ch):
   if p>=len(b):raise ValueError('truncated subframe')
   typ=b[p];p+=1
   if typ==0:p+=bits//8
   elif typ==2:p+=block*(bits//8)
   else:raise ValueError('outside constant/verbatim profile')
  p+=2
  if p>len(b):raise ValueError('truncated frame')
  if checksum(b[st:p],16,0x8005):raise ValueError('frame CRC')
  nframes+=1;samples+=block
 if samples!=target:raise ValueError('wrong sample count')
 return {'frames':nframes,'samples':samples}
base_hash=sha((F/'s16_sparse.flac').read_bytes());integrity={}
for name in ['s16_sparse.flac','s16_bad_frame_crc.flac','s16_bad_stream_md5.flac','s16_changed_valid_crc.flac']:
 b=(F/name).read_bytes()
 try:g=crc_guard(b);guard=True;err=None
 except Exception as e:guard=False;g=None;err=str(e)
 p=run(['flac','-t','-s',F/name]);trusted=sha(b)==base_hash;br=audio[name]
 integrity[name]={'crc_guard_accepts':guard,'crc_error':err,'crc_details':g,'libflac_integrity_accepts':p.returncode==0,'browser_decode_accepts':'error'not in br,'same_browser_pcm_as_valid':br.get('hash')==audio['s16_sparse.flac'].get('hash'),'trusted_source_hash_matches':trusted}
ck('D18 CRC-only mutation caught by bounded framing/CRC guard',not integrity['s16_bad_frame_crc.flac']['crc_guard_accepts'])
ck('D18 CRC is not content identity: valid-CRC changed sample passes it',integrity['s16_changed_valid_crc.flac']['crc_guard_accepts'])
ck('D18 browser accepted all three damaged-integrity controls',all(v['browser_decode_accepts'] for k,v in integrity.items()))
ck('D18 libFLAC and expected SHA reject all negative controls',all(not v['libflac_integrity_accepts'] and not v['trusted_source_hash_matches'] for k,v in integrity.items() if k!='s16_sparse.flac'))
ck('D18 altered valid-CRC PCM actually changes browser output',not integrity['s16_changed_valid_crc.flac']['same_browser_pcm_as_valid'])
obs['D18']=integrity

# D19 distinguish exact float convention from exact original integer information.
ck('D19 native S16 differs from requested power-of-two float normalization',audio['s16_sparse.flac']['floatOracle']['mismatches']>0)
ck('D19 S16-to-S24 lift exactly matches that float convention',audio['s16_promoted24.flac']['floatOracle']['mismatches']==0)
ck('D19 correctly rounded F32 does not preserve all original S32 integers',audio['s32_sparse.flac']['floatOracle']['mismatches']==0 and audio['s32_sparse.flac']['integerOracle']['changed']>0)
p=run(['ffmpeg','-nostdin','-v','error','-i',F/'s16_promoted24.flac','-c:a','pcm_s32le','-f','s32le','-']);x=np.frombuffer((F/'s16.pcm').read_bytes(),'<i2').astype(np.int64);y=np.frombuffer(p.stdout,'<i4').astype(np.int64)
ck('D19 promoted S16 retains original integers in host output',p.returncode==0 and np.array_equal(x*65536,y))
obs['D19']={'s16_float_oracle':audio['s16_sparse.flac']['floatOracle'],'s16_promoted24_float_oracle':audio['s16_promoted24.flac']['floatOracle'],'s32_float_oracle':audio['s32_sparse.flac']['floatOracle'],'s32_integer_oracle':audio['s32_sparse.flac']['integerOracle'],'promoted24_size':(F/'s16_promoted24.flac').stat().st_size}

# Restricted compressed-domain S16 lift: verify exact bytes, host PCM, browser floats,
# and rejection controls without claiming a preserved STREAMINFO MD5.
from promote_s16_flac import promote
lift,record=promote((F/'s16_sparse.flac').read_bytes())
ck('D19 byte-level promotion reproducible',lift==(F/'s16_promoted_wastedbits.flac').read_bytes())
ck('D19 wasted-bit promotion matches requested float convention',audio['s16_promoted_wastedbits.flac']['floatOracle']['mismatches']==0)
ck('D19 no falsely copied output MD5',lift[26:42]==bytes(16))
p=run(['ffmpeg','-nostdin','-v','error','-i',F/'s16_promoted_wastedbits.flac','-c:a','pcm_s32le','-f','s32le','-']);y=np.frombuffer(p.stdout,'<i4').astype(np.int64)
ck('D19 wasted-bit promotion host PCM exact',p.returncode==0 and np.array_equal(x*65536,y))
neg={}
for key,data in [('already24',(F/'s24_sparse.flac').read_bytes()),('badcrc',(F/'s16_bad_frame_crc.flac').read_bytes()),('truncated',(F/'s16_sparse.flac').read_bytes()[:-1])]:
 try:promote(data);neg[key]=False
 except (ValueError,IndexError):neg[key]=True
ck('D19 promotion rejects out-of-scope and corrupt controls',all(neg.values()),neg)
record['negative_guards']=neg;(E/'promotion.json').write_text(json.dumps(record,indent=2));obs['D19']['compressed_promotion']=record

# D20 color: exact selected RGBA and coded-payload preservation, not full HDR coverage.
color={};yp=[]
for name in ['video.mp4','video_601.mp4','video_709.mp4']:
 file=pixel['files'][name];ck(f'D20 pinned {name} fixture',file['sha256']==sha((F/name).read_bytes()))
 p=run(['ffmpeg','-nostdin','-v','error','-i',F/name,'-an','-pix_fmt','yuv420p','-f','rawvideo','-']);yp.append(p.stdout);ck(f'D20 {name} decoded 100 YUV frames',p.returncode==0 and len(p.stdout)==100*160*96*3//2)
 color[name]=file
 ck(f'D20 {name} equal video packet sequence',packets(name)==packets('video.mp4'))
 if name=='video.mp4':ck('D20 untagged direct/MSE RGB mismatch reproduced',all(f['changedComponents']>0 for f in file['frames']))
 else:ck(f'D20 {name} signaled direct/MSE RGB exact at three times',all(f['changedComponents']==0 for f in file['frames']))
ck('D20 color tagging does not alter decoded YUV planes',yp[0]==yp[1]==yp[2])
ck('D20 explicitly different matrix control changes RGB',all(x['direct']['hash']!=y['direct']['hash'] for x,y in zip(color['video_601.mp4']['frames'],color['video_709.mp4']['frames'])))
for key in ['split_tagged:0','switch_tagged:0']:
 row=routes[key];ref=refs['direct:video_601.mp4:0'];r={round(x['time']*25):x['hash']for x in ref['pictures']};c={round(x['time']*25):x['hash']for x in row['pictures']};common=c.keys()&r.keys();changed=sum(c[i]!=r[i]for i in common)
 ck(f'D20 {key} sampled same-ordinal pictures match tagged direct reference',len(common)>=80 and changed==0,{'common_ordinals':len(common),'mismatches':changed})
 color[key]={'compared_ordinals':len(common),'mismatches':changed,'ended':row.get('ended'),'duration':row.get('duration')}
obs['D20']=color

# Basic cleanup and file provenance for final runs.
for key,row in routes.items():
 if key in ['environment','source_files']:continue
 ck('cleanup '+key,row.get('cleanup',{}).get('mediaElements')==0 and row.get('cleanup',{}).get('audioContextClosed'))
for name,rows in [('audio',audio),('routes',routes),('reference',refs)]:
 ck('fixture hash snapshot '+name,bool(rows.get('source_files')) and all(sha((F/f).read_bytes())==d for f,d in rows.get('source_files',{}).items()))
result={'checks':checks,'passed':sum(c['passed'] for c in checks),'failed':sum(not c['passed'] for c in checks),'note':'Passing checks include expected failed-route and fidelity-negative observations, not production route passes.','observations':obs}
(E/'verification.json').write_text(json.dumps(result,indent=2));(E/'verification_commands.json').write_text(json.dumps(commands,indent=2))
print(json.dumps({'passed':result['passed'],'failed':result['failed'],'failures':[x for x in checks if not x['passed']]},indent=2))
if result['failed']:sys.exit(1)
