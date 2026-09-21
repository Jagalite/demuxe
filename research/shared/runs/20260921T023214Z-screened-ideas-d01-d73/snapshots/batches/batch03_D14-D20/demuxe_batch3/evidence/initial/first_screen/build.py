"""Self-authored, bounded media fixtures. No Demuxe source is executed.
SPDX-License-Identifier: MIT
"""
from pathlib import Path
import subprocess, json, hashlib, struct, platform, shutil
import numpy as np
R=Path(__file__).resolve().parents[1]; F=R/'fixtures'; E=R/'evidence'
F.mkdir(exist_ok=True); E.mkdir(exist_ok=True)
commands=[]
def run(args, check=True):
    args=list(map(str,args)); p=subprocess.run(args,capture_output=True,timeout=35)
    commands.append({'argv':args,'returncode':p.returncode,'stderr':p.stderr.decode(errors='replace')})
    (E/'build_commands.json').write_text(json.dumps(commands,indent=2))
    if check and p.returncode: raise RuntimeError(p.stderr.decode(errors='replace'))
    return p.stdout

def ff(*args):return run(['ffmpeg','-hide_banner','-nostdin','-y','-v','error',*args])
def digest(b):return hashlib.sha256(b).hexdigest()
def probe(name):
    d=json.loads(run(['ffprobe','-v','error','-show_streams','-show_packets','-show_data_hash','sha256','-of','json',F/name]));(E/(name+'.ffprobe.json')).write_text(json.dumps(d,indent=2));return d

def crc(data,bits,poly):
    reg=0;mask=(1<<bits)-1;top=1<<(bits-1)
    for b in data:
        reg ^= b<<(bits-8)
        for _ in range(8): reg=((reg<<1)^poly if reg&top else reg<<1)&mask
    return reg

def utfnum(n):
    if n<128:return bytes([n])
    for width in range(2,7):
        if n < 1<<(5*width+1):
            tail=[];x=n
            for _ in range(width-1):tail.append(0x80|(x&63));x>>=6
            return bytes([(0xff<<(8-width)&255)|x]+tail[::-1])
    raise ValueError('fixture number too large')

def pcm_bytes(a,bits,little=True):
    # full-width signed PCM, frames x channels
    if bits==16:return a.astype('<i2' if little else '>i2').tobytes()
    if bits==32:return a.astype('<i4' if little else '>i4').tobytes()
    u=a.astype(np.int64).ravel()&0xffffff
    shifts=[0,8,16] if little else [16,8,0]
    return np.stack([(u>>s)&255 for s in shifts],axis=1).astype('uint8').tobytes()

def flac(a,bits=16,block=1024,constant=True):
    if bits not in (16,24,32) or a.ndim!=2 or not 1<=a.shape[1]<=8:raise ValueError('unqualified PCM layout')
    if np.min(a)<-(1<<(bits-1)) or np.max(a)>=(1<<(bits-1)):raise ValueError('out of range PCM')
    frames=[];details=[];channels=a.shape[1]
    for i,p in enumerate(range(0,len(a),block)):
        x=a[p:p+block];n=len(x)
        # fixed blocking; size carried in 16-bit uncommon-block field; 48 kHz in header
        # bps=0 uses STREAMINFO for all three qualified widths
        h=bytes([0xff,0xf8,0x7a,(channels-1)<<4])+utfnum(i)+(n-1).to_bytes(2,'big')
        h+=bytes([crc(h,8,0x07)]);sub=[];types=[]
        for c in range(channels):
            if constant and np.all(x[:,c]==x[0,c]):
                sub.append(b'\x00'+pcm_bytes(x[:1,c:c+1],bits,False));types.append('constant')
            else:sub.append(b'\x02'+pcm_bytes(x[:,c:c+1],bits,False));types.append('verbatim')
        f=h+b''.join(sub);f+=crc(f,16,0x8005).to_bytes(2,'big');assert crc(f,16,0x8005)==0
        frames.append(f);details.append({'frame':i,'sample':p,'samples':n,'bytes':len(f),'subframes':types})
    sizes=[len(f) for f in frames]
    si=block.to_bytes(2,'big')*2+min(sizes).to_bytes(3,'big')+max(sizes).to_bytes(3,'big')
    si+=((48000<<44)|((channels-1)<<41)|((bits-1)<<36)|len(a)).to_bytes(8,'big')
    si+=hashlib.md5(pcm_bytes(a,bits)).digest()
    blob=b'fLaC'+b'\x80\x00\x00\x22'+si+b''.join(frames)
    return blob,details

# 100 changing pictures: grayscale patch encodes ordinal; testsrc supplies movement.
ff('-f','lavfi','-i','testsrc2=s=160x96:r=25:d=4','-an','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-preset','ultrafast','-crf','18','-g','25','-bf','0','-movflags','+empty_moov+frag_keyframe+default_base_moof',F/'video.mp4')
# Temporal audio markers: 0.02 pilot plus 0.22 pulses at .5, 1.5, 2.5, 3.5 s, 0.20 s wide.
sr=48000;t=np.arange(4*sr)/sr
pulses=((t%1>=.5)&(t%1<.7)).astype(float)
a=np.stack([(0.02+0.22*pulses)*np.sin(2*np.pi*997*t),(0.02+0.18*pulses)*np.sin(2*np.pi*1481*t)],axis=1)
(F/'markers.f32').write_bytes(a.astype('<f4').tobytes())
ff('-f','f32le','-ar','48000','-ac','2','-i',F/'markers.f32','-c:a','libvorbis','-q:a','5','-threads','1',F/'vorbis.ogg')
ff('-i',F/'vorbis.ogg','-c:a','copy',F/'vorbis.webm')
ff('-i',F/'video.mp4','-i',F/'vorbis.ogg','-map','0:v','-map','1:a','-c','copy',F/'av_vorbis.mkv')
# Side-by-side baseline packet hashes; optional container limitations recorded, not fabricated.
ff('-i',F/'video.mp4','-i',F/'vorbis.ogg','-map','0:v','-map','1:a','-c','copy','-strict','-2','-movflags','+empty_moov+frag_keyframe+default_base_moof',F/'av_vorbis.mp4')

# Midstream audio codec changes use distinct segment identity, no crossfade requested.
for label,codec,freq in [('first_opus','libopus',701),('second_vorbis','libvorbis',1709)]:
    ff('-f','lavfi','-i',f'aevalsrc=0.15*sin(2*PI*{freq}*t)|0.11*sin(2*PI*{freq+200}*t):s=48000:d=2','-c:a',codec,'-threads','1',F/(label+'.webm'))

# Opus with nonzero header gain and a non-packet-multiple duration.
ff('-f','lavfi','-i','aevalsrc=0.07*sin(2*PI*997*t)|0.055*sin(2*PI*1481*t):s=48000:d=2.137','-c:a','libopus','-b:a','128k','-threads','1',F/'opus_zero.ogg')

def ogg_gain(b,gain):
    out=bytearray(b);nseg=out[26];page_n=27+nseg+sum(out[27:27+nseg]);start=27+nseg
    if out[start:start+8]!=b'OpusHead':raise ValueError('missing OpusHead')
    out[start+16:start+18]=struct.pack('<h',gain)
    out[22:26]=bytes(4);out[22:26]=struct.pack('<I',crc(out[:page_n],32,0x04c11db7));return bytes(out)
for label,gain in [('plus',6*256),('minus',-6*256)]:
    (F/f'opus_{label}.ogg').write_bytes(ogg_gain((F/'opus_zero.ogg').read_bytes(),gain))
for label in ['zero','plus','minus']:
    for ext in ['webm','mp4']:
        options=['-movflags','+empty_moov+frag_keyframe+default_base_moof'] if ext=='mp4' else []
        ff('-i',F/f'opus_{label}.ogg','-c','copy',*options,F/f'opus_{label}.{ext}')

# PCM-as-FLAC with true constant subframes for known constant/silent channels.
N=4*sr;idx=np.arange(N,dtype=np.int64)
s16=np.stack([np.round(9000*np.sin(2*np.pi*997*idx/sr)),np.round(7000*np.sin(2*np.pi*1481*idx/sr))],axis=1).astype(np.int64)
s16[48000:144000]=0
# high-bit fixture deliberately contains low-order bits and channel distinctions.
s24=np.stack([((idx*(1051+2*c)+c*9943)%16000001)-8000000 for c in range(6)],axis=1)
s24[48000:144000]=0
# 32-bit low-order information around a well-resolved nonzero level, and signed extrema.
s32=np.stack([1073741824+(idx%127),-1073741824-(idx%127)],axis=1)
s32[0]=[-2147483648,2147483647]
manifest={};metadata={}
for label,x,bits in [('s16',s16,16),('s24',s24,24),('s32',s32,32)]:
    raw=pcm_bytes(x,bits);(F/f'{label}.pcm').write_bytes(raw)
    expected=(x.astype(np.float64)/(1<<(bits-1))).astype('<f4');(F/f'{label}.expected.f32').write_bytes(expected.tobytes())
    manifest[label]={'bits':bits,'channels':x.shape[1],'frames':len(x),'expected_f32_hash':digest(expected.tobytes()),'pcm_hash':digest(raw),'sample_rate':48000}
    for mode in ['verbatim','sparse']:
        b,details=flac(x,bits,constant=mode=='sparse');(F/f'{label}_{mode}.flac').write_bytes(b)
        metadata[label+'_'+mode]={'size':len(b),'records':details,'sha256':digest(b)}
    for level in [0,5]:
        # Same ffmpeg executable, same PCM, same frame length. Size comparison only.
        ff('-f',f's{bits}le','-ar','48000','-ac',str(x.shape[1]),'-i',F/f'{label}.pcm','-c:a','flac','-compression_level',str(level),'-frame_size','1024','-threads','1',F/f'{label}_level{level}.flac')
    # Host and libFLAC independent of formatter; all PCM checked in verify.py.
    run(['flac','-t','-s',F/f'{label}_sparse.flac'])
# Host packet mux bridges formatter bytes, does not encode audio.
ff('-i',F/'video.mp4','-i',F/'s16_sparse.flac','-map','0:v','-map','1:a','-c','copy','-strict','-2','-movflags','+empty_moov+frag_keyframe+default_base_moof',F/'av_sparse.mp4')

# Integrity controls: checksum-only corruption; valid frame with wrong STREAMINFO MD5;
# valid frame CRC with a changed PCM sample, preserving stale whole-stream MD5.
b=(F/'s16_sparse.flac').read_bytes();records=metadata['s16_sparse']['records'];firstlen=records[0]['bytes']
bad=bytearray(b);bad[42+firstlen-1]^=1;(F/'s16_bad_frame_crc.flac').write_bytes(bad)
bad=bytearray(b);bad[26]^=1;(F/'s16_bad_stream_md5.flac').write_bytes(bad)
bad=bytearray(b);start=42;header_len=8;sample_offset=start+header_len+1
bad[sample_offset+1]^=1
bad[start+firstlen-2:start+firstlen]=crc(bad[start:start+firstlen-2],16,0x8005).to_bytes(2,'big')
(F/'s16_changed_valid_crc.flac').write_bytes(bad)

# Persist packet manifests and codec strings.
for name in ['video.mp4','vorbis.ogg','vorbis.webm','av_vorbis.mkv','av_vorbis.mp4','first_opus.webm','second_vorbis.webm','av_sparse.mp4']+[f'opus_{g}.{e}' for g in ['zero','plus','minus'] for e in ['ogg','webm','mp4']]:
    d=probe(name);manifest[name]={'streams':[{k:s.get(k) for k in ['codec_name','codec_type','sample_rate','channels','time_base','duration','extradata_hash']} for s in d['streams']], 'packets':len(d['packets'])}
p=(F/'video.mp4').read_bytes();i=p.index(b'avcC');codec=f'avc1.{p[i+5:i+8].hex()}';manifest['video_codec']=codec
metadata['expected_limitation']='No browser/host timing comparisons are runtime performance benchmarks.'
(E/'fixture_metadata.json').write_text(json.dumps(metadata,indent=2));(E/'manifest.json').write_text(json.dumps(manifest,indent=2))
env={'date_utc':run(['date','-u','+%Y-%m-%dT%H:%M:%SZ']).decode().strip(),'platform':platform.platform(),'python':platform.python_version(),'ffmpeg':run(['ffmpeg','-version']).decode().splitlines()[0],'flac':run(['flac','--version']).decode().strip(),'chromium':run(['chromium','--version']).decode().strip(),'repo_reference':'01611bdaa2d9a21903bd2f1086fe0d786df6d5d1','application_executed':False}
(E/'environment.json').write_text(json.dumps(env,indent=2))
print(json.dumps({'video_codec':codec,'flac_sizes':{k:v['size'] for k,v in metadata.items() if isinstance(v,dict) and 'size'in v}},indent=2))
