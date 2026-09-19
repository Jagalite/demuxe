# SPDX-License-Identifier: Apache-2.0
import pathlib,re,subprocess,json,hashlib
r=pathlib.Path(__file__).parent;b=(r/'source.h264').read_bytes();starts=[m.start() for m in re.finditer(b'\x00\x00\x00\x01|\x00\x00\x01',b)];units=[]
for i,p in enumerate(starts):
 end=starts[i+1] if i+1<len(starts) else len(b);prefix=4 if b[p:p+4]==b'\0\0\0\1' else 3;units.append({'offset':p,'end':end,'type':b[p+prefix]&31})
sps=[i for i,u in enumerate(units) if u['type']==7];assert len(sps)>=3;begin=sps[1];suffix=units[begin:];assert [u['type'] for u in suffix[:3]]==[7,8,5]
(r/'suffix.h264').write_bytes(b[suffix[0]['offset']:]);(r/'missing-config.h264').write_bytes(b''.join(b[u['offset']:u['end']] for u in suffix if u['type'] not in [7,8]));(r/'dependent-start.h264').write_bytes(b''.join(b[u['offset']:u['end']] for i,u in enumerate(suffix) if i!=2))
def decode(name):
 p=subprocess.run(['ffmpeg','-v','error','-f','h264','-i',str(r/name),'-pix_fmt','yuv420p','-f','rawvideo','-'],capture_output=True);return p.stdout,p.stderr.decode(),p.returncode
full,_,_=decode('source.h264');tail,err,code=decode('suffix.h264');frame=160*96*3//2;assert len(full)==72*frame and tail==full[24*frame:] and code==0
negative={}
for name in ['missing-config.h264','dependent-start.h264']:
 raw,errors,code=decode(name);negative[name]={'frames':len(raw)//frame,'matches_expected_suffix':raw==tail,'returncode':code,'errors':errors[:2000]};assert raw!=tail
(r/'result.json').write_text(json.dumps({'scope':'Independent FFmpeg decode of explicit Annex-B SPS/PPS/IDR suffix; no browser seek optimization or general MP4/TS shortcut established.','keyframe24Offset':suffix[0]['offset'],'fullFrames':72,'suffixFrames':48,'exactSuffixPixels':True,'negative':negative,'sourceSHA256':hashlib.sha256(b).hexdigest(),'passed':True},indent=2)+'\n');print('72 source frames; exact48-frame suffix; both adverse controls rejected by output oracle')
