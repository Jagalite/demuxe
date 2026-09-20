# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import sys,json,subprocess,hashlib,struct
r=Path(sys.argv[1]);source=r/'candidate-fields.mov';data=source.read_bytes();p=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-select_streams','v','-read_intervals','%+#2','-of','json',str(source)]));(r/'packet-probe.json').write_text(json.dumps(p,indent=2));fields=[]
def standalone(d):
 assert d[:2]==b'\xff\xd8';out=d[:2];i=2
 while i<len(d):
  assert d[i]==255;code=d[i+1]
  if code==0xda:return out+d[i:]
  n=int.from_bytes(d[i+2:i+4],'big');segment=d[i:i+n+2]
  if code!=0xe1:out+=segment
  i+=n+2
 raise ValueError('no entropy scan')
for n,pkt in enumerate(p['packets']):
 d=data[int(pkt['pos']):int(pkt['pos'])+int(pkt['size'])];app=d.index(b'mjpg');offset=struct.unpack('>I',d[app+12:app+16])[0];assert d[offset:offset+2]==b'\xff\xd8'
 for field,start in enumerate([0,offset]):
  end=d.index(b'\xff\xd9',start)+2;original=d[start:end];jpeg=standalone(original);sof=jpeg.index(b'\xff\xc0');h,w=struct.unpack('>HH',jpeg[sof+5:sof+9]);assert (w,h)==(160,60);f=r/f'field-{n}-{field}.jpg';f.write_bytes(jpeg);(r/f'original-field-{n}-{field}.jpg').write_bytes(original);raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(f),'-f','rawvideo','-pix_fmt','rgba','-']);assert len(raw)==160*60*4;(r/f'field-{n}-{field}.rgba').write_bytes(raw);fields.append({'packet':n,'parity':field,'pts_num':n*2+field,'pts_den':24,'pts_us':round((n*2+field)*1e6/24),'duration_us':round((n*2+field+1)*1e6/24)-round((n*2+field)*1e6/24),'width':w,'height':h,'jpeg':str(f),'reference_rgba':str(r/f'field-{n}-{field}.rgba'),'original_sha256':hashlib.sha256(original).hexdigest(),'original_mjpa_next_field_offset':offset})
full=subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-frames:v','2','-f','rawvideo','-pix_fmt','rgba','-']);assert len(full)==2*160*120*4;comparisons=[]
for n in range(2):
 a=(r/f'field-{n}-0.rgba').read_bytes();b=(r/f'field-{n}-1.rgba').read_bytes();woven=b''.join(a[y*640:(y+1)*640]+b[y*640:(y+1)*640] for y in range(60));ref=full[n*160*120*4:(n+1)*160*120*4];diff=[abs(x-y) for x,y in zip(woven,ref)];comparisons.append({'packet':n,'host_full_frame_mismatches':sum(bool(x) for x in diff),'maximum_error':max(diff),'different_field_pixels':sum(x!=y for x,y in zip(a,b))})
(r/'host-full.rgba').write_bytes(full);(r/'fields.json').write_text(json.dumps(fields,indent=2));(r/'prepare-results.json').write_text(json.dumps({'container_field_order':'tt','actual_jpeg_fields_per_packet':2,'standalone_fields':4,'field_width':160,'field_height':60,'timing':'12 packets/s, two field instants at24/s; original source movement retained','comparisons':comparisons},indent=2));print(comparisons)
