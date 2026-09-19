# SPDX-License-Identifier: Apache-2.0
"""Restricted mono 16-bit FLAC smart cut: copy subframes, rebuild variable headers."""
import pathlib,subprocess,json,sys,struct,hashlib
out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True);commands=[]
def run(args,check=True):
 p=subprocess.run(args,capture_output=True);commands.append({'args':args,'exit':p.returncode,'stderr':p.stderr.decode(errors='replace')});
 if check and p.returncode:raise RuntimeError(commands[-1])
 return p.stdout
base=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y']
run(base+['-f','lavfi','-i','aevalsrc=0.35*sin(2*PI*(431*t+71*t*t)):s=48000:d=5','-sample_fmt','s16','-c:a','flac',str(out/'source.flac')])
def packets(path):return json.loads(run(['ffprobe','-v','error','-show_packets','-of','json',str(path)]))['packets']
def crc(data,width,poly):
 x=0
 for b in data:
  x^=b<<(width-8)
  for _ in range(8):x=((x<<1)^poly if x&(1<<(width-1)) else x<<1)&((1<<width)-1)
 return x
def parts(frame):
 assert frame[0]==255 and frame[1]&0xfe==0xf8
 lead=frame[4];n=1 if lead<128 else next(n for n in range(2,8) if lead>>(7-n)==(1<<(n+1))-2)
 at=4+n;bc=frame[2]>>4;sr=frame[2]&15;extra=(1 if bc==6 else 2 if bc==7 else 0)+(1 if sr==12 else 2 if sr in [13,14] else 0);end=at+extra
 assert crc(frame[:end],8,7)==frame[end];assert crc(frame[:-2],16,0x8005)==int.from_bytes(frame[-2:],'big')
 return frame[:4],frame[at:end],frame[end+1:-2]
def utf8(n):
 if n<128:return bytes([n])
 count=next(i for i in range(2,8) if n<(1<<(5*i+1)))
 a=[0]*count
 for i in range(count-1,0,-1):a[i]=0x80|(n&63);n>>=6
 a[0]=((0xff<<(8-count))&255)|n;return bytes(a)
def rewrite(frame,index,variable=True):
 head,extra,payload=parts(frame);head=bytearray(head);head[1]=(head[1]&0xfe)|int(variable);h=bytes(head)+utf8(index)+extra;h+=bytes([crc(h,8,7)]);body=h+payload;return body+crc(body,16,0x8005).to_bytes(2,'big')
def metadata(prefix,samples,minblock,maxblock):
 # Keep STREAMINFO only; no stale SEEKTABLE/comments or whole-stream MD5.
 assert prefix[:4]==b'fLaC' and prefix[4]&127==0 and int.from_bytes(prefix[5:8],'big')==34
 si=bytearray(prefix[8:42]);si[:2]=minblock.to_bytes(2,'big');si[2:4]=maxblock.to_bytes(2,'big');si[4:10]=b'\0'*6
 packed=int.from_bytes(si[10:18],'big');packed=(packed&~((1<<36)-1))|samples;si[10:18]=packed.to_bytes(8,'big');si[18:34]=b'\0'*16
 return b'fLaC'+b'\x80\x00\x00\x22'+si
source=(out/'source.flac').read_bytes();ps=packets(out/'source.flac');prefix=source[:int(ps[0]['pos'])];start,end=41737,105565;selected=[];interiors=[];edge_count=0
for i,p in enumerate(ps):
 t=int(p['pts']);n=int(p['duration']);lo=max(start,t);hi=min(end,t+n)
 if lo>=hi:continue
 f=source[int(p['pos']):int(p['pos'])+int(p['size'])]
 if lo==t and hi==t+n:selected.append((f,n));interiors.append(hashlib.sha256(parts(f)[2]).hexdigest());continue
 edge_count+=1;isolated=out/f'edge{edge_count}-source.flac';isolated.write_bytes(metadata(prefix,n,n,n)+rewrite(f,0));raw=out/f'edge{edge_count}-decoded.s16';run(base+['-i',str(isolated),'-c:a','pcm_s16le','-f','s16le',str(raw)]);pcm=raw.read_bytes();assert len(pcm)==n*2
 clipped=pcm[(lo-t)*2:(hi-t)*2];r=out/f'edge{edge_count}.s16';r.write_bytes(clipped);enc=out/f'edge{edge_count}-encoded.flac';run(base+['-f','s16le','-ar','48000','-ac','1','-i',str(r),'-c:a','flac',str(enc)]);eb=enc.read_bytes()
 for ep in packets(enc):selected.append((eb[int(ep['pos']):int(ep['pos'])+int(ep['size'])],int(ep['duration'])))
assert edge_count==2 and sum(n for _,n in selected)==end-start
for name,variable in [('smart-cut',True),('wrong-fixed-numbering',False)]:
 frames=[];at=0
 for i,(f,n) in enumerate(selected):rewritten=rewrite(f,at if variable else i,variable);parts(rewritten);frames.append(rewritten);at+=n
 (out/(name+'.flac')).write_bytes(metadata(prefix,end-start,min(n for _,n in selected),max(n for _,n in selected))+b''.join(frames))
for name in ['source','smart-cut','wrong-fixed-numbering']:
 run(base+['-i',str(out/(name+'.flac')),'-c:a','pcm_s16le','-f','s16le',str(out/(name+'.s16'))],check=name!='wrong-fixed-numbering')
ref=(out/'source.s16').read_bytes()[start*2:end*2];actual=(out/'smart-cut.s16').read_bytes();assert actual==ref;(out/'reference.s16').write_bytes(ref)
# Independent libFLAC decoder performs exact sample-index seeks.
seeks=[];wrong=[]
for sample in [0,1,4321,32001,end-start-600]:
 for name,rows in [('smart-cut',seeks),('wrong-fixed-numbering',wrong)]:
  target=out/f'{name}-seek-{sample}.s16';run(['flac','--silent','--force','--decode','--force-raw-format','--endian=little','--sign=signed',f'--skip={sample}','--until=+512','-o',str(target),str(out/(name+'.flac'))],check=False)
  b=target.read_bytes() if target.exists() else b'';rows.append({'sample':sample,'exact':b==ref[sample*2:(sample+512)*2],'bytes':len(b)})
assert all(r['exact'] for r in seeks),seeks
retained=[hashlib.sha256(parts(f)[2]).hexdigest() for f,n in selected];assert all(h in retained for h in interiors)
# Repeat-concat reuses every authored subframe, updating only absolute sample numbers.
concat_frames=[];at=0
for f,n in selected*2:concat_frames.append(rewrite(f,at));at+=n
concat=out/'smart-concat.flac';concat.write_bytes(metadata(prefix,2*(end-start),min(n for _,n in selected),max(n for _,n in selected))+b''.join(concat_frames))
run(base+['-i',str(concat),'-c:a','pcm_s16le','-f','s16le',str(out/'smart-concat.s16')]);assert (out/'smart-concat.s16').read_bytes()==ref+ref
cross=end-start-256;target=out/'concat-boundary.s16';run(['flac','--silent','--force','--decode','--force-raw-format','--endian=little','--sign=signed',f'--skip={cross}','--until=+512','-o',str(target),str(concat)]);assert target.read_bytes()==(ref+ref)[cross*2:(cross+512)*2]
result={'passed':True,'candidate_executed':True,'fallback':False,'profile':'mono 16-bit 48kHz FLAC two-edge crop with variable sample-numbered frame headers','start_sample':start,'end_sample':end,'samples':len(actual)//2,'edge_frames_decoded_and_reencoded':edge_count,'interior_payloads_preserved':len(interiors),'frame_count':len(selected),'whole_pcm_exact':True,'repeat_concat_pcm_exact':True,'repeat_concat_boundary_seek_exact':True,'all_frame_crcs_valid':True,'streaminfo_md5':'unknown zeros, never stale source digest','independent_decoder_seeks':seeks,'wrong_fixed_numbering_seeks':wrong,'wrong_fixed_control_detected':not all(r['exact'] for r in wrong),'limits':['Repeat-concat tested; distinct-format concat and browser playback unqualified','Only mono 16-bit fixture and supported FLAC header field grammar','No performance claim; source full decode exists only as independent oracle']}
(out/'results.json').write_text(json.dumps(result,indent=2)+'\n');(out/'commands.log').write_text('\n'.join(map(json.dumps,commands))+'\n');print(json.dumps(result))
