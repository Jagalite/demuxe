# SPDX-License-Identifier: Apache-2.0
import pathlib,json,sys,subprocess,hashlib
p=pathlib.Path(sys.argv[1]);b=(p/'source.mp4').read_bytes();i=b.index(b'hvcC');size=int.from_bytes(b[i-4:i],'big');hvcc=b[i+4:i-4+size];(p/'hvcc.bin').write_bytes(hvcc);probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v','-show_packets','-show_entries','packet=pos,size,pts_time,flags','-of','json',str(p/'source.mp4')]))
packets=[]
for q in probe['packets'][:24]:
 packets.append({'pts':round(float(q['pts_time'])*1e6),'key':'K'in q['flags'],'bytes':list(b[int(q['pos']):int(q['pos'])+int(q['size'])])})
proc=subprocess.Popen(['ffmpeg','-v','error','-i',str(p/'source.mp4'),'-frames:v','3','-pix_fmt','yuv420p10le','-f','rawvideo','-'],stdout=subprocess.PIPE);refs=[]
for n in range(3):
 data=proc.stdout.read(1920*1080*3);assert len(data)==1920*1080*3;(p/f'base-{n}.yuv10').write_bytes(data);refs.append(hashlib.sha256(data).hexdigest())
assert proc.wait()==0;(p/'browser-input.json').write_text(json.dumps({'codec':'hvc1.2.4.L153.B0','description':list(hvcc),'packets':packets,'referenceHashes':refs,'width':1920,'height':1080,'sourceSHA256':hashlib.sha256(b).hexdigest()}))
