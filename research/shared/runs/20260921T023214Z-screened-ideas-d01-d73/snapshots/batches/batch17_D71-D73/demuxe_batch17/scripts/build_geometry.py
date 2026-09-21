# SPDX-License-Identifier: MIT
from build import *

def visual_children(b):
    sd=find(b,'moov/trak/mdia/minf/stbl/stsd');entries=boxes(b,sd[3]+8,sd[2])
    if len(entries)!=1 or entries[0][0]!='avc1':raise ValueError('single AVC sample entry required')
    return boxes(b,entries[0][3]+78,entries[0][2])

def patch(b,ratio,display_width,rotate=0):
    if ratio not in [1,2] or display_width not in [160,320] or rotate not in [0,90]:raise ValueError('outside geometry test contract')
    a=bytearray(b);ps=[q for q in visual_children(b) if q[0]=='pasp']
    if len(ps)!=1 or ps[0][2]-ps[0][3]!=8:raise ValueError('one intact pasp required')
    a[ps[0][3]:ps[0][2]]=struct.pack('>II',ratio,1)
    tk=find(b,'moov/trak/tkhd');a[tk[2]-8:tk[2]]=struct.pack('>II',display_width<<16,96<<16)
    if a[tk[3]]!=0:raise ValueError('tkhd v0 only')
    if rotate:
        # Match FFmpeg's conventional counterclockwise display matrix.
        a[tk[3]+40:tk[3]+76]=struct.pack('>9i',0,-65536,0,65536,0,0,0,0,1073741824)
    return bytes(a)

def main():
    ff('-i',F/'intra.mp4','-map','0:v:0','-c:v','copy','-bsf:v','h264_metadata=sample_aspect_ratio=2/1','-video_track_timescale','16000','-movflags','+empty_moov+frag_keyframe+default_base_moof',F/'sar2.mp4')
    b1=(F/'intra.mp4').read_bytes();b2=(F/'sar2.mp4').read_bytes();assets={}
    for s,b in [(1,b1),(2,b2)]:
        for p in [1,2]:
            for t in [160,320]:
                name=f'sar_s{s}_p{p}_w{t}';r=patch(b,p,t);assets[name]=save_media(name,r);assets[name].update({'spsSAR':s,'paspSAR':p,'trackWidth':t,'rotated':False,'file':name+'.mp4'})
    for s,b in [(1,b1),(2,b2)]:
        name=f'sar_rotated_s{s}';r=patch(b,s,160*s,90);assets[name]=save_media(name,r);assets[name].update({'spsSAR':s,'paspSAR':s,'trackWidth':160*s,'rotated':True,'file':name+'.mp4'})
    p1,_=packet_bytes('intra.mp4');decoded={};pk={}
    for name,a in assets.items():
        # Do not let host autorotation become a hidden pixel processing step.
        decoded[name]=sha(ff('-noautorotate','-i',F/a['file'],'-map','0:v:0','-fps_mode','passthrough','-pix_fmt','yuv420p','-f','rawvideo','-'))
        p,_=packet_bytes(a['file']);pk[name]=[sha(q) for q in p]==[sha(q) for q in p1]
    controls={}
    for name,args in [('unsupported_ratio',(3,160,0)),('unsupported_rotation',(2,320,45)),('truncation',(1,160,0))]:
        try:patch(b1[:-len(b1)//2] if name=='truncation' else b1,*args);controls[name]={'rejected':False}
        except (ValueError,struct.error) as e:controls[name]={'rejected':True,'error':str(e)}
    save('geometry_manifest.json',{'assets':assets,'times':[.1875,1.21875,2.65625,.46875],'codec':json.loads((E/'reverse_manifest.json').read_text())['codec'],'packet_payloads_all_equal':pk,'host_unrotated_yuv_hashes':decoded,'controls':controls,'coded':[160,96],'frames':48})
if __name__=='__main__':main()
