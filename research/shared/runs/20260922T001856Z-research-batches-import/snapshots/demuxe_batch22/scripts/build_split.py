# SPDX-License-Identifier: MIT
from build import *
def track_init(init,tid):
 out=[]
 for q in boxes(init):
  if q[0]!='moov':out.append(init[q[1]:q[2]]);continue
  mc=[]
  for c in children(init,q):
   if c[0]=='trak':
    tk=only(init,c,'tkhd');p=tk[3];t=num(init,p+(20 if init[p] else 12))
    if t!=tid:continue
   if c[0]=='mvex':
    mx=[]
    for z in children(init,c):
     if z[0]=='trex' and num(init,z[3]+4)!=tid:continue
     mx.append(init[z[1]:z[2]])
    mc.append(box('mvex',b''.join(mx)));continue
   mc.append(init[c[1]:c[2]])
  out.append(box('moov',b''.join(mc)))
 return b''.join(out)
def main():
 src=(F/'source.mp4').read_bytes();init,info=inspect(src);m=json.loads((E/'manifest.json').read_text());m['split']=[]
 for tid,tr in info.items():
  ini=track_init(init,tid);frag,meta=construct({tid:tr},'grouped');key=tr['kind'];(F/f'{key}.init').write_bytes(ini);(F/f'{key}.m4s').write_bytes(frag);(F/f'{key}.mp4').write_bytes(ini+frag)
  selected=[s for s in tr['samples'] if Fraction(s['dts'],tr['scale'])<Fraction(3,4)]
  head=meta['moof_bytes']+8+sum(s['size'] for s in selected)
  m['split'].append({'kind':key,'track':tid,'head':head,'samples_in_head':len(selected),'init':key+'.init','frag':key+'.m4s','mime':m['ledger']['mime'] if key=='vide' else 'audio/mp4; codecs="mp4a.40.2"'})
  dec=run(['ffmpeg','-v','error','-i',F/f'{key}.mp4',*(['-map','0:v:0','-fps_mode','passthrough','-pix_fmt','yuv420p','-f','rawvideo'] if key=='vide' else ['-map','0:a:0','-acodec','pcm_f32le','-f','f32le']),'-'])
  m['split'][-1]['host_decoded_matches_source']=sha(dec)==m['layouts']['grouped'][('video' if key=='vide' else 'audio')+'_sha256']
 save('manifest.json',m);print(m['split'])
if __name__=='__main__':main()
