# SPDX-License-Identifier: MIT
"""Bounded, authored fixtures for D52-D55. No Demuxe application code is run."""
from pathlib import Path
import json, subprocess, hashlib, struct, platform
import numpy as np
R=Path(__file__).resolve().parents[1]; F=R/'fixtures'; E=R/'evidence'
F.mkdir(exist_ok=True); E.mkdir(exist_ok=True)
def save(n,o): (E/n).write_text(json.dumps(o,indent=2))
def sha(b): return hashlib.sha256(b).hexdigest()
def run(a):
    p=subprocess.run(list(map(str,a)),capture_output=True,timeout=40)
    with (E/'commands.jsonl').open('a') as f: f.write(json.dumps({'argv':list(map(str,a)),'returncode':p.returncode,'stderr':p.stderr.decode(errors='replace')})+'\n')
    if p.returncode: raise RuntimeError(p.stderr.decode(errors='replace'))
    return p.stdout
def ff(*a): return run(['ffmpeg','-nostdin','-hide_banner','-v','error','-y',*a])
def boxes(b,start=0,end=None):
    end=len(b) if end is None else end; out=[]; p=start
    while p<end:
        if p+8>end: raise ValueError('truncated box')
        n=int.from_bytes(b[p:p+4],'big'); t=b[p+4:p+8].decode('ascii'); h=8
        if n==1: n=int.from_bytes(b[p+8:p+16],'big'); h=16
        if n==0: n=end-p
        if n<h or p+n>end: raise ValueError('bad box size')
        out.append((t,p,p+n,p+h)); p+=n
    return out
def find(b,path):
    cur=(None,0,len(b),0)
    for t in path.split('/'):
        qs=[q for q in boxes(b,cur[3],cur[2]) if q[0]==t]
        if len(qs)!=1: raise ValueError('expected one '+path)
        cur=qs[0]
    return cur
def split(name,prefix):
    b=(F/name).read_bytes(); top=boxes(b); first=next(q[1] for q in top if q[0]=='moof')
    ini=b[:first]; (F/(prefix+'.init')).write_bytes(ini); fr=[]
    for i,q in enumerate(top):
        if q[0]!='moof': continue
        if top[i+1][0]!='mdat': raise ValueError('layout')
        data=b[q[1]:top[i+1][2]]; k=len(fr); fn=f'{prefix}{k}.m4s'; (F/fn).write_bytes(data)
        tq=find(data,'moof/traf/tfdt'); p=tq[3]; n=8 if data[p]==1 else 4
        fr.append({'file':fn,'bytes':len(data),'tfdt':int.from_bytes(data[p+4:p+4+n],'big'),'sha256':sha(data)})
    return {'init':prefix+'.init','fragments':fr}
def retime(b,t):
    out=bytearray(b);q=find(b,'moof/traf/tfdt');p=q[3];n=8 if b[p]==1 else 4;out[p+4:p+4+n]=int(t).to_bytes(n,'big');return bytes(out)
def crc(b,bits,poly):
    r=0;m=(1<<bits)-1
    for c in b:
        r^=c<<(bits-8)
        for _ in range(8):r=((r<<1)^poly if r&(1<<(bits-1)) else r<<1)&m
    return r
def utf(n):
    if n<128:return bytes([n])
    for w in range(2,7):
        if n<1<<(5*w+1):
            x=n;tail=[]
            for _ in range(w-1):tail.append(128|(x&63));x>>=6
            return bytes([((255<<(8-w))&255)|x]+tail[::-1])
    raise ValueError('number too large')
def frame(sample,n,channels=2,pcm=None):
    if not (16<=n<=65535 and 0<=sample<2**31 and channels==2):raise ValueError('unqualified frame')
    h=bytes([255,249,0x7a,0x18])+utf(sample)+(n-1).to_bytes(2,'big');h+=bytes([crc(h,8,7)])
    # Symbolic silence: no n-sample array, no sample loop. Only one value/channel.
    if pcm is None:body=b'\x00\x00\x00'*channels
    else:
        if pcm.shape!=(n,channels):raise ValueError('layout')
        body=b''.join(b'\x02'+pcm[:,c].astype('>i2').tobytes() for c in range(channels))
    data=h+body; return data+crc(data,16,0x8005).to_bytes(2,'big')
def flac_stream(records,total):
    sizes=[len(b) for _,_,b in records]; ns=[n for _,n,_ in records]
    si=min(ns).to_bytes(2,'big')+max(ns).to_bytes(2,'big')+min(sizes).to_bytes(3,'big')+max(sizes).to_bytes(3,'big')
    si+=((48000<<44)|(1<<41)|(15<<36)|total).to_bytes(8,'big')+bytes(16) # PCM MD5 explicitly unknown
    return b'fLaC'+b'\x80\x00\x00\x22'+si+b''.join(b for _,_,b in records)
def guard_silence(a,b,kind,source_epoch,expected_epoch):
    if kind!='declared-silence' or source_epoch!=expected_epoch or not (isinstance(a,int) and isinstance(b,int) and 0<=a<b):raise ValueError('unproven silence/source')
    return True

def project_cues(plan,cues,source_duration=6000):
    """Plain-text, rate-1 interval projection. Does not infer a source's edit plan."""
    out=[];last_end=0
    for j,seg in enumerate(plan):
        a,b,d=(seg[k] for k in ['source_start','source_end','dest_start'])
        if any(type(x) is not int for x in [a,b,d]) or not 0<=a<b<=source_duration or d<last_end or seg.get('rate',1)!=1:
            raise ValueError('unqualified edit interval/rate')
        last_end=d+b-a
        for c in cues:
            if type(c['start']) is not int or type(c['end']) is not int or not 0<=c['start']<c['end']<=source_duration or not isinstance(c['text'],str):
                raise ValueError('unqualified cue')
            lo=max(a,c['start']);hi=min(b,c['end'])
            if lo<hi:out.append({'id':c['id']+'-'+str(j),'text':c['text'],'start':lo-a+d,'end':hi-a+d})
    return out

def main():
    # Both fixtures use exact two-second closed GOPs without B pictures, explicit BT.709.
    ff('-f','lavfi','-i','testsrc2=size=160x96:rate=25:duration=6','-an','-c:v','libx264','-threads','1','-preset','medium','-crf','18','-g','50','-bf','0','-sc_threshold','0','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-movflags','+empty_moov+frag_keyframe+default_base_moof','-video_track_timescale','25000',F/'video6.mp4')
    vm=split('video6.mp4','video');i=(F/'video.init').read_bytes().index(b'avcC');vm['codec']='avc1.'+(F/'video.init').read_bytes()[i+5:i+8].hex();vm['timescale']=25000
    # Separate 4 second video for the intentional audio-gap experiment.
    ff('-i',F/'video6.mp4','-t','4','-c','copy','-movflags','+empty_moov+frag_keyframe+default_base_moof',F/'video4.mp4');v4=split('video4.mp4','v4');v4['codec']=vm['codec']
    # D52: one second of stereo tone, two *declared* silent seconds, one tone second.
    sr=48000; t=np.arange(sr)/sr
    first=np.stack([np.rint(9000*np.sin(2*np.pi*701*t)),np.rint(7000*np.sin(2*np.pi*1103*t))],1).astype('<i2')
    last=np.stack([np.rint(9000*np.sin(2*np.pi*1709*t)),np.rint(7000*np.sin(2*np.pi*2203*t))],1).astype('<i2')
    records=[]; dense=[]; silence_records=[]
    for base,x in [(0,first),(144000,last)]:
        for off in range(0,len(x),4800):
            data=frame(base+off,4800,pcm=x[off:off+4800]);records.append((base+off,4800,data));dense.append((base+off,4800,data))
    for start in [48000,96000]:
        guard_silence(start,start+48000,'declared-silence','source11','source11')
        data=frame(start,48000);records.append((start,48000,data));silence_records.append({'start':start,'length':48000,'frame_bytes':len(data),'sha256':sha(data)})
        dense.append((start,48000,frame(start,48000,pcm=np.zeros((48000,2),dtype='<i2'))))
    records.sort();dense.sort()
    expected=np.concatenate([first,np.zeros((96000,2),dtype='<i2'),last]);(F/'silence_expected.s16').write_bytes(expected.tobytes())
    for name,rs in [('symbolic',records),('dense',dense)]:
        b=flac_stream(rs,192000);(F/(name+'.flac')).write_bytes(b)
        decoded=ff('-i',F/(name+'.flac'),'-f','s16le','-acodec','pcm_s16le','-');assert decoded==expected.tobytes()
    ff('-i',F/'symbolic.flac','-c','copy','-strict','-2','-movflags','+empty_moov+frag_keyframe+default_base_moof','-frag_duration','1000000',F/'audio.mp4');am=split('audio.mp4','audio');am['codec']='flac';am['timescale']=48000
    bad=[]
    for a in [(48000,96000,'unknown-gap','source11','source11'),(48000,96000,'declared-silence','old','source11'),(90000,80000,'declared-silence','source11','source11')]:
        try:guard_silence(*a);bad.append(False)
        except ValueError:bad.append(True)
    sm={'records':silence_records,'symbolic_bytes':(F/'symbolic.flac').stat().st_size,'dense_bytes':(F/'dense.flac').stat().st_size,'pcm_sha256':sha(expected.tobytes()),'scalar_samples':expected.size,'independent_host_exact':True,'guards_rejected':bad,'streaminfo_md5':'unknown','audio':am,'video':v4}
    save('silence_manifest.json',sm)
    # D54: repeat a native coded interval and project subtitles over the same edit plan.
    edit=[{'source_start':0,'source_end':2000,'dest_start':0},{'source_start':4000,'source_end':6000,'dest_start':2000},{'source_start':0,'source_end':2000,'dest_start':4000}]
    cues=[{'id':'long','start':400,'end':5500,'text':'A & B <literal>'},{'id':'left','start':1600,'end':2400,'text':'left boundary'},{'id':'right','start':3800,'end':4300,'text':'right boundary'},{'id':'late','start':4500,'end':5600,'text':'late cue'},{'id':'removed','start':2100,'end':3900,'text':'must not appear'}]
    out=project_cues(edit,cues)
    # Timeline application uses original fragments; no picture bytes rewritten.
    efr=[];chunks=[]
    for j,k in enumerate([0,2,0]):
        b=(F/vm['fragments'][k]['file']).read_bytes();b=retime(b,j*50000);name=f'edit{j}.m4s';(F/name).write_bytes(b);efr.append(name);chunks.append(b)
    eb=(F/'video.init').read_bytes()+b''.join(chunks);(F/'edited.mp4').write_bytes(eb)
    original=ff('-i',F/'video6.mp4','-pix_fmt','yuv420p','-f','rawvideo','-');edited=ff('-i',F/'edited.mp4','-pix_fmt','yuv420p','-f','rawvideo','-');fs=160*96*3//2;assert len(original)==150*fs;assert edited==original[:50*fs]+original[100*fs:150*fs]+original[:50*fs]
    save('captions_manifest.json',{'plan':edit,'source_cues':cues,'projected':out,'video':vm,'edited_fragments':efr,'host_video_frames_exact':150,'semantics':'plain text, no styling, no rate changes, nonoverlapping destination intervals'})
    # D55: finite impulse response has a finite, exact dependency length. Renderer rounding may differ.
    N=50003;ix=np.arange(N);rng=np.random.default_rng(12551)
    x=np.stack([.12*np.sin(2*np.pi*733*ix/48000)+rng.normal(0,.015,N),.08*np.cos(2*np.pi*1381*ix/48000)+rng.normal(0,.02,N)],1).astype('<f4');x[16000:20000]=0;x[-1]=[.65,-.55]
    taps=321;z=np.arange(taps);h=(.003*np.exp(-z/190)*np.cos(z*.17)).astype('<f4');h[0]+=.55;h[128]-=.15;h[-1]+=.07
    y=np.stack([np.convolve(x[:,c].astype(np.float64),h.astype(np.float64)).astype('<f4') for c in range(2)],1)
    for n,a in [('fir_input',x),('fir_kernel',h),('fir_reference',y)]: (F/(n+'.f32')).write_bytes(a.tobytes())
    save('fir_manifest.json',{'sample_rate':48000,'input_frames':N,'taps':taps,'output_frames':len(y),'channels':2,'tolerance_absolute':2e-6,'intervals':[[0,257],[6000,7777],[11997,14031],[49900,50323]],'input_sha256':sha(x.tobytes()),'kernel_sha256':sha(h.tobytes()),'oracle':'numpy float64 direct finite convolution, rounded once to float32','tail_nonzero_values':int(np.count_nonzero(y[N:]))})
    save('manifest.json',{'video':vm,'silence':sm,'repo_commit':'0060c26c23290d20041f8433452e2eb088b31f59'})
    save('environment.json',{'utc':run(['date','-u','+%Y-%m-%dT%H:%M:%SZ']).decode().strip(),'platform':platform.platform(),'python':platform.python_version(),'numpy':np.__version__,'ffmpeg':run(['ffmpeg','-version']).decode().splitlines()[0],'chromium':run(['chromium','--version']).decode().strip(),'application_executed':False})
    print(json.dumps({'silence':sm,'captions':out,'fir_frames':len(y)},indent=2))
if __name__=='__main__':main()
