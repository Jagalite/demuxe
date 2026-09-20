# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,hashlib,struct
out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True);W,H,N=160,96,12;planes=[];carriers=[]
for f in range(N):
 y=bytes(16+(x*3+r*2+f*7)%220 for r in range(H) for x in range(W));u=bytes(64+(x*7+r*5+f*13)%128 for r in range(H) for x in range(W));v=bytes(64+(x*5+r*9+f*11)%128 for r in range(H) for x in range(W));planes.append(y+u+v);carrier=b''.join(y[r*W:(r+1)*W]+u[r*W:(r+1)*W]+v[r*W:(r+1)*W] for r in range(H))+bytes([128])*(W*3*H//2);carriers.append(carrier)
(out/'source.yuv').write_bytes(b''.join(planes));(out/'carrier.yuv').write_bytes(b''.join(carriers))
for name,fmt,w in [('ordinary','yuv444p',W),('carrier','yuv420p',W*3)]:
 source=out/('source.yuv' if name=='ordinary' else 'carrier.yuv');subprocess.run(['ffmpeg','-v','error','-nostdin','-f','rawvideo','-pix_fmt',fmt,'-s',f'{w}x{H}','-r','24','-i',str(source),'-c:v','libx264','-crf','0','-preset','fast','-g','12','-bf','0','-f','h264',str(out/(name+'.h264'))],check=True)
 raw=subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',str(out/(name+'.h264')),'-pix_fmt',fmt,'-f','rawvideo','-']);assert raw==source.read_bytes()
 data=(out/(name+'.h264')).read_bytes();p=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-of','json',str(out/(name+'.h264'))]))['packets'];(out/(name+'-packets.json')).write_text(json.dumps([{'bytes':list(data[int(x['pos']):int(x['pos'])+int(x['size'])]),'timestamp':round(i*1e6/24),'key':'K' in x['flags']} for i,x in enumerate(p)]))
(out/'oracle.json').write_text(json.dumps({'width':W,'height':H,'frames':N,'hashes':[hashlib.sha256(b).hexdigest() for b in planes],'profile':'Exact independent 8bit Y/U/V fullresolution planes, explicit prepared carrier3W×H luma lanes and neutral420chroma. No ordinary unmarked playback or HDR claim.','bytes':{n:(out/(n+'.h264')).stat().st_size for n in ['ordinary','carrier']}},indent=2)+'\n');print('prepared12fullchroma frames')
