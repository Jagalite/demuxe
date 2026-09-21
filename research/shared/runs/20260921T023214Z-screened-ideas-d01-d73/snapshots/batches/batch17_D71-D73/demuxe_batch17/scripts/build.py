# SPDX-License-Identifier: MIT
"""Batch 17: restricted, source-bound native-video construction screens."""
from common import *
import numpy as np

def box(t,p):return struct.pack('>I4s',len(p)+8,t.encode())+p
def full(t,v,fl,p):return box(t,bytes([v])+fl.to_bytes(3,'big')+p)
def fragment(payload,duration,timestamp,seq):
    def moof(offset):
        return box('moof',full('mfhd',0,0,struct.pack('>I',seq))+box('traf',
            full('tfhd',0,0x20000,struct.pack('>I',1))+
            full('tfdt',1,0,struct.pack('>Q',timestamp))+
            full('trun',0,0x701,struct.pack('>IiIII',1,offset,duration,len(payload),0x02000000))))
    h=moof(0);return moof(len(h)+8)+box('mdat',payload)
def packet_bytes(n):
    d=(F/n).read_bytes();p=packet_summary(n)
    return [d[int(x['pos']):int(x['pos'])+int(x['size'])] for x in p],p

def idr_only(payload):
    p=0;v=[]
    while p<len(payload):
        if p+4>len(payload):raise ValueError('NAL length incomplete')
        n=int.from_bytes(payload[p:p+4],'big');p+=4
        if n<1 or p+n>len(payload):raise ValueError('NAL outside packet')
        typ=payload[p]&31
        if typ in (1,2,3,4,5):v.append(typ)
        if typ in (14,15,19,20,21):raise ValueError('unqualified AVC extension')
        p+=n
    if not v or any(x!=5 for x in v):raise ValueError('independent-IDR contract not met')
    return True

def build_reordered(init,payloads,durations,order,identity,source,guard=True):
    if sha(source)!=identity:raise ValueError('source identity mismatch')
    if sorted(order)!=list(range(len(payloads))):raise ValueError('not a full permutation')
    if len(durations)!=len(payloads) or any(type(n)!=int or n<=0 for n in durations):raise ValueError('invalid duration contract')
    out=[init];ts=0
    for k,i in enumerate(order):
        if guard:idr_only(payloads[i])
        out.append(fragment(payloads[i],durations[i],ts,k+1));ts+=durations[i]
    return b''.join(out)

def save_media(n,b):
    (F/(n+'.mp4')).write_bytes(b);return split(n)

def raw_yuv(n):return ff('-i',F/n,'-map','0:v:0','-fps_mode','passthrough','-pix_fmt','yuv420p','-f','rawvideo','-')

def encode_video(name,frame_count=48,gop=1,sar='1/1',codec='libx264'):
    w,h=160,96;y,x=np.mgrid[:h,:w]
    frames=[]
    for k in range(frame_count):
        a=np.stack([(x*2+k*19)%256,(y*3+k*11)%256,((x//10+y//8+k)%3)*90],axis=2).astype('uint8')
        # Four bars encode a stable, distinct frame ordinal in each authored image.
        for b in range(6):a[8:24,8+b*20:20+b*20]=235 if (k>>b)&1 else 20
        frames.append(a.tobytes())
    (F/(name+'.rgb')).write_bytes(b''.join(frames))
    args=['-f','rawvideo','-pix_fmt','rgb24','-s','160x96','-r','16','-i',F/(name+'.rgb'),'-vf','setsar='+sar,'-c:v',codec,'-g',str(gop),'-pix_fmt','yuv420p']
    if codec=='libx264':args+=['-preset','fast','-crf','18','-bf','0','-sc_threshold','0','-keyint_min',str(gop),'-color_range','tv','-colorspace','bt709','-color_trc','bt709','-color_primaries','bt709','-video_track_timescale','16000','-movflags','+empty_moov+frag_keyframe+default_base_moof']
    ff(*args,F/(name+('.mp4' if codec=='libx264' else '.ivf')))

def reverse_screen():
    encode_video('intra');encode_video('predictive',gop=16)
    b=(F/'intra.mp4').read_bytes();s=split('intra');init=(F/s['init']).read_bytes();p,pk=packet_bytes('intra.mp4');n=len(p)
    dur=[400,1200,800,1600]*(n//4)
    assets={};orders={'forward':list(range(n)),'reverse':list(range(n-1,-1,-1)),'wrong_forward':list(range(n))}
    for name,order in orders.items():assets[name]=save_media(name,build_reordered(init,p,dur,order,sha(b),b))
    # Wrong-duration control retains correct reversed pictures but assigns the old durations by output position.
    rd=list(reversed(dur));assets['wrong_duration']=save_media('wrong_duration',build_reordered(init,p,rd,orders['reverse'],sha(b),b))
    controls={}
    pred,pp=packet_bytes('predictive.mp4')
    for name,call in [('predictive_reverse',lambda:build_reordered(init,pred,dur,orders['reverse'],sha(b),b)),('wrong_source',lambda:build_reordered(init,p,dur,orders['reverse'],'0'*64,b)),('invalid_order',lambda:build_reordered(init,p,dur,[0]*n,sha(b),b)),('zero_duration',lambda:build_reordered(init,p,[0]*n,orders['reverse'],sha(b),b)),('truncated_packet',lambda:idr_only(p[0][:-1]))]:
        try:call();controls[name]={'rejected':False}
        except ValueError as e:controls[name]={'rejected':True,'error':str(e)}
    f=raw_yuv('forward.mp4');r=raw_yuv('reverse.mp4');framebytes=160*96*3//2
    expect=b''.join(f[i*framebytes:(i+1)*framebytes] for i in orders['reverse'])
    times={}
    for name,order in orders.items():
        t=0;times[name]=[]
        for i in order:times[name].append({'source':i,'pts':t/16000,'duration':dur[i]/16000,'query':(t+dur[i]/2)/16000});t+=dur[i]
    avcc=init[init.index(b'avcC')+4:];codec='avc1.'+avcc[1:4].hex()
    out={'assets':assets,'codec':codec,'times':times,'durations':dur,'frames':n,'duration':sum(dur)/16000,'source_bytes':len(b),'candidate_bytes':(F/'reverse.mp4').stat().st_size,'compressed_payload_bytes':sum(map(len,p)),'payload_hashes':[sha(q) for q in p], 'independent_host_reverse_exact':r==expect,'host_reverse_bytes':len(r),'guard_controls':controls,'predicted_source_non_idr':sum(1 for q in pp if 'K' not in q['flags'])}
    save('reverse_manifest.json',out)

# Restricted EBML constructor. The main candidate uses source-authored VFR timings.
def vint(n):
    for l in range(1,9):
        if n<(1<<(7*l))-1:return ((1<<(7*l))|n).to_bytes(l,'big')
    raise ValueError('size cap')
def el(i,p):return i.to_bytes((i.bit_length()+7)//8,'big')+vint(len(p))+p
def uel(i,n):return el(i,n.to_bytes(max(1,(n.bit_length()+7)//8),'big'))
def webm_parts(packets,durations,mode):
    if len(packets)!=len(durations) or any(type(v)!=int or v<=0 or v>10000 for v in durations):raise ValueError('invalid known durations')
    eb=el(0x1A45DFA3,uel(0x4286,1)+uel(0x42F7,1)+uel(0x42F2,4)+uel(0x42F3,8)+el(0x4282,b'webm')+uel(0x4287,4)+uel(0x4285,2))
    inf=uel(0x2AD7B1,1000000)+el(0x4D80,b'Demuxe screen')+el(0x5741,b'Demuxe screen')+el(0x4489,struct.pack('>d',sum(durations)))
    tr=uel(0xD7,1)+uel(0x73C5,1)+uel(0x83,1)+uel(0x9C,0)+el(0x86,b'V_VP9')+el(0xE0,uel(0xB0,160)+uel(0xBA,96))
    if mode in ('default_short','explicit_with_default'):tr+=uel(0x23E383,125000000)
    init=eb+bytes.fromhex('18538067')+bytes.fromhex('01ffffffffffffff')+el(0x1549A966,inf)+el(0x1654AE6B,el(0xAE,tr))
    clusters=[];t=0
    for i,(p,d) in enumerate(zip(packets,durations)):
        if mode.startswith('explicit') or (mode=='last_explicit' and i==len(packets)-1):
            blk=el(0xA0,el(0xA1,b'\x81\0\0\0'+p)+uel(0x9B,d))
        else:blk=el(0xA3,b'\x81\0\0\x80'+p)
        clusters.append(el(0x1F43B675,uel(0xE7,t)+blk));t+=d
    return init,clusters

def duration_screen():
    encode_video('vp9',frame_count=6,gop=1,codec='libvpx-vp9')
    b=(F/'vp9.ivf').read_bytes();pos=32;pk=[]
    while pos<len(b):
        n,ts=struct.unpack_from('<IQ',b,pos);pos+=12;pk.append(b[pos:pos+n]);pos+=n
    ds=[125,375,250,750,125,1125];assets={}
    for mode in ['explicit','no_durations','default_short','last_explicit','explicit_with_default']:
        init,cs=webm_parts(pk,ds,mode);name='vfr_'+mode;(F/(name+'.init')).write_bytes(init);pieces=[]
        for i,c in enumerate(cs):fn=name+f'_{i}.cluster';(F/fn).write_bytes(c);pieces.append(fn)
        (F/(name+'.webm')).write_bytes(init+b''.join(cs));assets[mode]={'file':name+'.webm','init':name+'.init','fragments':pieces,'bytes':len(init)+sum(map(len,cs))}
    t=0;times=[]
    for i,d in enumerate(ds):
        times.append({'source':i,'pts':t/1000,'duration':d/1000,'query':(t+d/2)/1000});t+=d
    refs={mode:[{'hash':p['data_hash'],'pts':p.get('pts_time'),'duration':p.get('duration_time')} for p in packet_summary(a['file'])] for mode,a in assets.items()}
    decoded={mode:sha(raw_yuv(a['file'])) for mode,a in assets.items()}
    save('duration_manifest.json',{'assets':assets,'times':times,'durations_ms':ds,'duration':t/1000,'codec':'vp9','packets':len(pk),'original_payload_hashes':['SHA256:'+sha(p) for p in pk],'host_packet_summaries':refs,'host_decoded_hashes':decoded})

if __name__=='__main__':
    import sys
    if len(sys.argv)==1 or sys.argv[1]=='reverse':reverse_screen()
    if len(sys.argv)==1 or sys.argv[1]=='duration':duration_screen()
