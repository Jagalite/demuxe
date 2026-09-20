# SPDX-License-Identifier: Apache-2.0
"""Cross-check byte-accurate temporal seek ordering and browser-visible texture capture."""
import pathlib,subprocess,json,base64,hashlib,sys
r=pathlib.Path(sys.argv[1]);texture=pathlib.Path(sys.argv[2]);out=pathlib.Path(sys.argv[3]);out.mkdir(parents=True,exist_ok=True);commands=[]
def raw(p,args=[]):
 c=['ffmpeg','-v','error',*args,'-i',str(p),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'];commands.append(c);return subprocess.check_output(c)
n=1280*720*3//2;x=json.load(open(r/'results.json'))['R076'];source=r/'bframes.mp4';rows=[]
for seek in [0,1,2,6,0]:
 b=raw(source,['-ss',str(seek),'-skip_frame','noref']);hashes=[hashlib.sha256(b[i:i+n]).hexdigest() for i in range(0,len(b),n)];wanted=[h for h,t in zip(x['kept_hashes'],x['retained_pts']) if float(t)>=seek];assert hashes==wanted;rows.append({'seek_seconds':seek,'frames':len(hashes),'exact_order_and_count':True})
d=json.load(open(texture/'input.json'));o=base64.b64decode(d['rgba'])[-128*128*4:];cmd=['ffmpeg','-v','error','-i',str(texture/'canvas.png'),'-pix_fmt','rgba','-f','rawvideo','-'];commands.append(cmd);p=subprocess.check_output(cmd);error=max(abs(a-b) for a,b in zip(p,o));assert len(p)==len(o) and error<=1 and all(p[i]==o[i] for i in range(3,len(p),4));result={'temporal_seek':rows,'visible_canvas':{'dimensions':[128,128],'rgba_channels':len(p),'max_channel_error':error,'alpha_exact':True,'oracle':'Independent FFmpeg decode final AVI frame31 vs actual Playwright WebGPU canvas screenshot','within_declared_1LSB':True},'commands':commands};(out/'results.json').write_text(json.dumps(result,indent=2)+'\n')
