# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,json,hashlib,sys
out=pathlib.Path(sys.argv[1]);commands=[]
for name,lavfi,dur in [('red','color=red',1),('green','color=green',1),('blue','color=blue',1),('long','testsrc2',2)]:
 cmd=['ffmpeg','-v','error','-f','lavfi','-i',lavfi+('=' if name=='long' else ':')+'s=160x96:r=12:d='+str(dur),'-an','-c:v','libx264','-profile:v','baseline','-pix_fmt','yuv420p','-bf','0','-g','24','-keyint_min','24','-sc_threshold','0','-refs','1','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-movflags','+empty_moov+default_base_moof+frag_keyframe','-frag_duration','1000000',str(out/(name+'.mp4'))]
 if not (out/(name+'.mp4')).exists():subprocess.run(cmd,check=True)
 commands.append(cmd)
 b=(out/(name+'.mp4')).read_bytes();boxes=[];i=0
 while i<len(b):
  n=int.from_bytes(b[i:i+4],'big');boxes.append((i,n,b[i+4:i+8].decode()));i+=n
 init=b[:next(p for p,n,t in boxes if t=='moof')];(out/(name+'-init.bin')).write_bytes(init)
 frags=[]
 for j,(p,n,t) in enumerate(boxes):
  if t=='moof':
   assert boxes[j+1][2]=='mdat';f=b[p:p+n+boxes[j+1][1]];(out/(name+'-'+str(len(frags))+'.bin')).write_bytes(f);frags.append(hashlib.sha256(f).hexdigest())
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_packets','-show_data_hash','sha256','-of','json',str(out/(name+'.mp4'))]));(out/(name+'-packets.json')).write_text(json.dumps(probe,indent=2))
 if name=='long':assert 'K' not in probe['packets'][12]['flags']
(out/'generator.json').write_text(json.dumps(commands,indent=2))
(out/'contract.json').write_text(json.dumps({'scope':'One H264 video SourceBuffer, red/green1s branches plus identical blue1s RAP bytes; separate long-GOP wrong-history control.','gate':'Every queried RGBA picture and presented callback must equal standalone full-source reference; backward/forward seeks, EOF, source generation rejection, cleanup. Wrong non-RAP history must demonstrate discrepancy or explicit rejection.','performance':'N/A source-defined reuse capability. No network, prefetch, energy or arbitrary decoder-state merge claim.'},indent=2))
