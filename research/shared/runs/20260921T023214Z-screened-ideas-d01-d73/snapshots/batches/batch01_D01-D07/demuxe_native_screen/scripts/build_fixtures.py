"""Generate bounded, self-owned fixtures. No Demuxe runtime is substituted here."""
from __future__ import annotations
import hashlib,json,subprocess,struct,zlib,sys
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]; F=ROOT/'fixtures'; E=ROOT/'evidence'
F.mkdir(exist_ok=True); E.mkdir(exist_ok=True)
LOG=[]
def run(args):
    p=subprocess.run([str(x) for x in args],capture_output=True,timeout=35)
    LOG.append({'argv':[str(x) for x in args],'returncode':p.returncode,'stderr':p.stderr.decode(errors='replace')})
    (E/'commands.json').write_text(json.dumps(LOG,indent=2))
    if p.returncode: raise RuntimeError(p.stderr.decode(errors='replace'))
    return p.stdout

def boxes(b,start=0,end=None):
    end=len(b) if end is None else end;p=start
    while p<end:
        if end-p<8: raise ValueError('truncated box')
        n=int.from_bytes(b[p:p+4],'big');h=8
        if n==1:
            if end-p<16:raise ValueError('truncated extended box')
            n=int.from_bytes(b[p+8:p+16],'big');h=16
        if n==0:n=end-p
        if n<h or p+n>end: raise ValueError(f'invalid box {p} {n} {end}')
        yield (b[p+4:p+8].decode('latin1'),p,n,h)
        p+=n

def child(b,box,name):
    _,p,n,h=box
    return next(x for x in boxes(b,p+h,p+n) if x[0]==name)

def probe(file):
    return json.loads(run(['ffprobe','-v','error','-show_streams','-show_packets','-show_data_hash','sha256','-of','json',file]))

def avcc(b):
    p=b.find(b'avcC');n=int.from_bytes(b[p-4:p],'big')
    if p<4 or n<12:raise ValueError('no avcC')
    return b[p+4:p-4+n]

# Four seconds, closed GOPs, real B-frame reordering.
run(['ffmpeg','-y','-v','error','-f','lavfi','-i','testsrc2=size=160x96:rate=12:duration=4','-an',
     '-c:v','libx264','-threads','1','-preset','veryfast','-profile:v','main','-pix_fmt','yuv420p',
     '-g','12','-bf','2','-x264-params','scenecut=0:open-gop=0:b-adapt=0',
     '-movflags','+frag_keyframe+empty_moov+default_base_moof',F/'video.mp4'])
run(['ffmpeg','-y','-v','error','-i',F/'video.mp4','-f','lavfi','-i','sine=frequency=997:sample_rate=48000:duration=4',
     '-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','alac','-ac','2',
     '-movflags','+frag_keyframe+empty_moov+default_base_moof',F/'av_alac.mp4'])

source=(F/'av_alac.mp4').read_bytes(); top=list(boxes(source));moov=next(x for x in top if x[0]=='moov')
tracks=[]; candidates={'trak':[],'trex':[],'traf':[]}
for t in boxes(source,moov[1]+8,moov[1]+moov[2]):
    if t[0]=='trak':
        tk=child(source,t,'tkhd');off=tk[1]+8
        trackid=int.from_bytes(source[off+(20 if source[off]==1 else 12):off+(24 if source[off]==1 else 16)],'big')
        md=child(source,t,'mdia');hd=child(source,md,'hdlr');kind=source[hd[1]+16:hd[1]+20].decode()
        tracks.append({'id':trackid,'kind':kind})
        if kind=='soun':candidates['trak'].append(t[1]+4);audio_id=trackid
mvex=child(source,moov,'mvex')
for t in boxes(source,mvex[1]+8,mvex[1]+mvex[2]):
    if t[0]=='trex' and int.from_bytes(source[t[1]+12:t[1]+16],'big')==audio_id:candidates['trex'].append(t[1]+4)
for m in top:
    if m[0]=='moof':
        for t in boxes(source,m[1]+8,m[1]+m[2]):
            if t[0]=='traf':
                h=child(source,t,'tfhd')
                if int.from_bytes(source[h[1]+12:h[1]+16],'big')==audio_id:candidates['traf'].append(t[1]+4)
for mask in range(8):
    out=bytearray(source)
    for i,k in enumerate(['trak','trex','traf']):
        if mask&(1<<i):
            for pos in candidates[k]:out[pos:pos+4]=b'free'
    (F/f'project_{mask}.mp4').write_bytes(out)

# Exact 24-bit, six-channel source with distinct deterministic signals and edge values.
n=48000*4;i=np.arange(n,dtype=np.int64)
pcm=np.stack([((i*(7919+c*127)+c*104729)%15000001)-7500000 for c in range(6)],axis=1).astype('<i4')
pcm[0,:]=[-8388608,8388607,1,-1,0,4194303]
packed=np.stack([(pcm&255),((pcm>>8)&255),((pcm>>16)&255)],axis=-1).astype('uint8')
(F/'sixch.s24le').write_bytes(packed.tobytes())
(F/'sixch.i32le').write_bytes(pcm.tobytes())
run(['ffmpeg','-y','-v','error','-f','s24le','-ar','48000','-ac','6','-channel_layout','5.1','-i',F/'sixch.s24le',
     '-c:a','flac','-compression_level','0',F/'sixch.flac'])
run(['ffmpeg','-y','-v','error','-i',F/'video.mp4','-i',F/'sixch.flac','-map','0:v:0','-map','1:a:0',
     '-c','copy','-strict','-2','-movflags','+frag_keyframe+empty_moov+default_base_moof',F/'av_flac.mp4'])
run(['ffmpeg','-y','-v','error','-i',F/'sixch.flac','-c','copy','-strict','-2',
     '-movflags','+frag_keyframe+empty_moov+default_base_moof',F/'audio_flac.mp4'])
# Actual high-4:4:4 10-bit AVC fixture to test an incompatible island.
run(['ffmpeg','-y','-v','error','-f','lavfi','-i','testsrc2=size=160x96:rate=12:duration=1','-an',
     '-vf','format=yuv444p10le','-c:v','libx264','-threads','1','-profile:v','high444','-preset','veryfast','-g','12',
     '-movflags','+frag_keyframe+empty_moov+default_base_moof',F/'island_high444.mp4'])

# Narrow AVC length prefixes, retaining NAL units and all timing fields.
v=(F/'video.mp4').read_bytes()
# Rebuild a single-track fragment; this fixture has explicit sample sizes.
def narrow(b,width):
    out=[];nal_units=0;reclaimed=0
    for typ,p,n,h in boxes(b):
        z=bytearray(b[p:p+n])
        if typ=='moov':
            cp=z.find(b'avcC');z[cp+8]=(z[cp+8]&252)|(width-1)
        if typ=='moof':
            # mdat immediately follows in this generated fixture.
            data_p=p+n; data_n=int.from_bytes(b[data_p:data_p+4],'big');assert b[data_p+4:data_p+8]==b'mdat'
            tr=child(b,(typ,p,n,h),'traf');ru=child(b,tr,'trun');rp=ru[1];flags=int.from_bytes(b[rp+9:rp+12],'big')
            count=int.from_bytes(b[rp+12:rp+16],'big');cur=rp+16
            if flags&1:cur+=4
            if flags&4:cur+=4
            assert flags&0x200, 'generated fixture needs explicit sizes'
            payload=bytearray();oldcur=data_p+8
            for _ in range(count):
                if flags&0x100:cur+=4
                size=int.from_bytes(b[cur:cur+4],'big');sizepos=cur;cur+=4
                if flags&0x400:cur+=4
                if flags&0x800:cur+=4
                sample=b[oldcur:oldcur+size];oldcur+=size;q=0;new=bytearray()
                while q<len(sample):
                    nn=int.from_bytes(sample[q:q+4],'big');q+=4
                    assert nn>0 and q+nn<=len(sample) and nn < (1<<(8*width))
                    new+=nn.to_bytes(width,'big')+sample[q:q+nn];q+=nn;nal_units+=1
                z[sizepos-p:sizepos-p+4]=len(new).to_bytes(4,'big');payload+=new;reclaimed+=size-len(new)
            assert oldcur==data_p+data_n
            out.append(bytes(z));out.append((8+len(payload)).to_bytes(4,'big')+b'mdat'+payload)
            continue
        if typ=='mdat':continue
        if typ=='mfra':continue # Optional index carries obsolete byte offsets; omit from both width controls.
        out.append(bytes(z))
    return b''.join(out),{'nals':nal_units,'payload_bytes_saved':reclaimed}
widths={}
for width in (2,4):
    vv,met=narrow(v,width);(F/f'width_{width}.mp4').write_bytes(vv);widths[str(width)]=met
bad=bytearray((F/'width_2.mp4').read_bytes());cp=bad.find(b'avcC');bad[cp+8]=(bad[cp+8]&252)|3
(F/'width_mismatch.mp4').write_bytes(bad)

man={'source_commit':'01611bdaa2d9a21903bd2f1086fe0d786df6d5d1','tracks':tracks,'patch_locations':candidates,'widths':widths,
     'audio':{'frames':n,'channels':6,'sample_rate':48000,'bits':24,'interleaved_i32_sha256':hashlib.sha256(pcm.tobytes()).hexdigest()},'files':{}}
for name in ['video.mp4','av_alac.mp4','project_7.mp4','width_2.mp4','width_4.mp4','av_flac.mp4','island_high444.mp4']:
    b=(F/name).read_bytes();pr=probe(F/name);(E/(name+'.ffprobe.json')).write_text(json.dumps(pr,indent=2))
    st=next(s for s in pr['streams'] if s['codec_type']=='video');num,den=map(int,st['time_base'].split('/'));extr=avcc(b)
    packets=[]
    for pk in pr['packets']:
        if pk['stream_index']==st['index']:
            payload=b[int(pk['pos']):int(pk['pos'])+int(pk['size'])]
            packets.append({'offset':int(pk['pos']),'size':int(pk['size']),'pts_us':round(int(pk['pts'])*num/den*1e6),
                'duration_us':round(int(pk.get('duration',0))*num/den*1e6),'key':'K' in pk['flags'],'sha256':hashlib.sha256(payload).hexdigest()})
    man['files'][name]={'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'codec':'avc1.'+extr[1:4].hex(),
       'description':list(extr),'width':st['width'],'height':st['height'],'packets':packets}
    # Host software output serves as the independent decoder oracle for video data.
    raw=run(['ffmpeg','-v','error','-i',F/name,'-map','0:v:0','-pix_fmt','yuv420p','-vsync','0','-f','rawvideo','-threads','1','pipe:1'])
    framebytes=st['width']*st['height']*3//2
    hashes=[hashlib.sha256(raw[x:x+framebytes]).hexdigest() for x in range(0,len(raw),framebytes)]
    (E/(name+'.host_frame_hashes.json')).write_text(json.dumps(hashes))
    man['files'][name]['host_frame_hashes']=hashes

# Per-packet zlib input retains a useful real media oracle.
first=man['files']['video.mp4']['packets'][0];packet=v[first['offset']:first['offset']+first['size']]
compressed=zlib.compress(packet)
(F/'packet.zlib').write_bytes(compressed);(F/'packet.raw').write_bytes(packet)
corrupt=bytearray(compressed);corrupt[-1]^=1;(F/'packet_bad_crc.zlib').write_bytes(corrupt)
(F/'packet_truncated.zlib').write_bytes(compressed[:-3]);(F/'expansion.zlib').write_bytes(zlib.compress(b'\0'*(4*1024*1024)))
man['inflate']={'packet_bytes':len(packet),'packet_sha256':hashlib.sha256(packet).hexdigest(),'compressed_bytes':len(compressed),'output_cap':65536,'expansion_plaintext_bytes':4*1024*1024}
for p in F.iterdir():
    if p.is_file():man.setdefault('fixture_hashes',{})[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
(E/'manifest.json').write_text(json.dumps(man,indent=2));(F/'manifest.json').write_text(json.dumps(man))
print(json.dumps({'fixture_count':len(man['fixture_hashes']),'tracks':tracks,'patches':candidates,'widths':widths,'audio':man['audio'],'inflate':man['inflate']},indent=2))
