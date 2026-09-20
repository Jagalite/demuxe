# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,hashlib
p=pathlib.Path(sys.argv[1]);source=p/'MVI_3774.AVI'
def run(a):
 with (p/'commands.log').open('a') as f:f.write(' '.join(map(str,a))+'\n')
 r=subprocess.run(list(map(str,a)),stdout=subprocess.PIPE,stderr=subprocess.PIPE);assert r.returncode==0,r.stderr.decode();return r.stdout
probe=json.loads(run(['ffprobe','-v','error','-select_streams','v:0','-show_packets','-show_streams','-of','json',source]));(p/'probe.json').write_text(json.dumps(probe,indent=2));b=source.read_bytes();packet=probe['packets'][0];first=b[int(packet['pos']):int(packet['pos'])+int(packet['size'])];(p/'avi1.jpg').write_bytes(first)
run(['ffmpeg','-v','error','-i',source,'-frames:v','1','-c:v','copy','-bsf:v','mjpeg2jpeg',p/'normalized.jpg'])
run(['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=size=320x192:rate=12','-frames:v','1','-c:v','mjpeg','-q:v','2','-pix_fmt','yuvj444p',p/'baseline.jpg'])
def headers(b):
 out=[];pos=2
 while pos<len(b):
  assert b[pos]==255;code=b[pos+1];n=int.from_bytes(b[pos+2:pos+4],'big');out.append({'marker':code,'offset':pos,'length':n+2,'data':list(b[pos:pos+2+n])});pos+=2+n
  if code==218:return out,b[pos:]
 raise ValueError('no SOS')
a,entropy=headers(first);norm=(p/'normalized.jpg').read_bytes();z,entropyn=headers(norm);assert entropy==entropyn;assert first[6:10]==b'AVI1' and not any(x['marker']==196 for x in a);dht=[x for x in z if x['marker']==196];assert dht
out=[]
for name in ['baseline','avi1','normalized']:
 raw=run(['ffmpeg','-v','error','-i',p/(name+'.jpg'),'-frames:v','1','-pix_fmt','rgba','-f','rawvideo','-']);(p/(name+'.rgba')).write_bytes(raw);meta=json.loads(run(['ffprobe','-v','error','-show_streams','-of','json',p/(name+'.jpg')]))['streams'][0];out.append({'name':name,'width':meta['width'],'height':meta['height'],'field_order':meta.get('field_order'),'range':meta.get('color_range'),'input':list((p/(name+'.jpg')).read_bytes()),'reference':list(raw)})
assert (p/'avi1.rgba').read_bytes()==(p/'normalized.rgba').read_bytes()
(p/'input.json').write_text(json.dumps({'cases':out,'defaultDht':[x for seg in dht for x in seg['data']],'originalEntropyHash':hashlib.sha256(entropy).hexdigest(),'normalizedEntropyHash':hashlib.sha256(entropyn).hexdigest(),'avi1MissingDht':True,'timestamp':packet.get('pts_time'),'frameRate':probe['streams'][0]['r_frame_rate']}))
print([(x['name'],x['width'],x['height']) for x in out], 'genuine AVI1 missing DHT, entropy exact')
