# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
from collections import Counter
import subprocess,json,re,hashlib
h=Path(__file__).resolve().parents[1];r=h/'evidence/20260919T202100Z-genuine-mvc';source=r/'999.MTS';b=source.read_bytes();commands=[]
def run(args,check=True):
 commands.append(args);p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 with (r/'stderr.log').open('ab') as f:f.write(p.stderr)
 if check and p.returncode:raise RuntimeError(p.stderr.decode(errors='replace'))
 return p
streams={};pes={};continuity={};gaps=[]
def time5(p):return ((p[0]>>1&7)<<30)|(p[1]<<22)|((p[2]>>1)<<15)|(p[3]<<7)|(p[4]>>1)
for pos in range(0,len(b)-191,192):
 t=b[pos+4:pos+192]
 if t[0]!=71:raise ValueError('transport sync')
 pid=((t[1]&31)<<8)|t[2];afc=(t[3]>>4)&3
 if pid not in [0x1011,0x1012] or not afc&1:continue
 cc=t[3]&15
 if pid in continuity and cc!=(continuity[pid]+1)%16:gaps.append((pid,pos))
 continuity[pid]=cc;start=4+(1+t[4] if afc&2 else 0);payload=t[start:]
 if t[1]&64:
  if payload[:3]!=b'\0\0\1' or len(payload)<9:raise ValueError('PES header')
  flags=payload[7]>>6;pts=time5(payload[9:14]) if flags&2 else None;dts=time5(payload[14:19]) if flags==3 else pts
  pes.setdefault(pid,[]).append({'pts':pts,'dts':dts,'offset':len(streams.get(pid,b''))});payload=payload[9+payload[8]:]
 streams.setdefault(pid,bytearray()).extend(payload)
assert not gaps
counts={};extensions=[]
for pid,data in streams.items():
 nals=[n for n in re.split(b'\x00\x00\x00?\x01',bytes(data)) if n];counts[hex(pid)]=dict(Counter(n[0]&31 for n in nals))
 if pid==0x1012:
  extensions=[{'svc':bool(n[1]&128),'view_id':(n[2]<<2)|(n[3]>>6),'inter_view':bool(n[3]&2)} for n in nals if n[0]&31==20]
  assert extensions and all(not x['svc'] and x['view_id']==1 for x in extensions);assert any(n[0]&31==15 and n[1]==128 for n in nals)
assert counts['0x1011'].get(5) and not counts['0x1011'].get(20)
def admit(pid):
 if pid!=0x1011 or counts[hex(pid)].get(20):raise ValueError('MVC dependent view is not standalone AVC')
 return streams[pid]
(r/'base.h264').write_bytes(admit(0x1011));(r/'dependent.h264').write_bytes(streams[0x1012])
rejected=False
try:admit(0x1012)
except ValueError:rejected=True
# Independent FFmpeg MPEG-TS demux reference, versus custom 192-byte TS/PES extraction.
reference=run(['ffmpeg','-v','error','-i',str(source),'-map','0:0','-c','copy','-f','h264','-']).stdout
assert reference==bytes(streams[0x1011])
def framehash(args,name):
 out=run(['ffmpeg','-v','error']+args+['-fps_mode','passthrough','-f','framemd5','-']).stdout;(r/name).write_bytes(out)
 return [line.split(b',')[-1].strip().decode() for line in out.splitlines() if not line.startswith(b'#')]
baseline=framehash(['-i',str(source),'-map','0:0'],'baseline.framemd5');candidate=framehash(['-i',str(r/'base.h264')],'candidate.framemd5');assert baseline==candidate and len(baseline)>1
probe=json.loads(run(['ffprobe','-v','error','-select_streams','v:0','-show_packets','-show_data_hash','sha256','-of','json',str(source)]).stdout);(r/'reference-packets.json').write_text(json.dumps(probe,indent=2)+'\n')
source_times=[(x['pts'],x['dts']) for x in probe['packets']];extracted_times=[(x['pts'],x['dts']) for x in pes[0x1011]]
# Demux parser may combine field-coded PES packets; compare only explicit matching boundaries.
matching=[x for x in extracted_times if x in source_times];assert len(matching)==len(source_times)
adverse=run(['ffmpeg','-v','error','-i',str(r/'dependent.h264'),'-f','framemd5','-'],check=False);(r/'dependent.framemd5').write_bytes(adverse.stdout);dependent_frames=[x for x in adverse.stdout.splitlines() if x and not x.startswith(b'#')];assert not dependent_frames
(r/'results.json').write_text(json.dumps({'passed':True,'candidateExecuted':True,'fallback':False,'sourceURL':'https://samples.ffmpeg.org/3D/999.MTS','sourceLicense':'NOASSERTION','sourceSHA256':hashlib.sha256(b).hexdigest(),'nalTypesByPID':counts,'mvcExtensionHeaders':{'count':len(extensions),'viewIds':sorted(set(x['view_id'] for x in extensions)),'allMVCExtensionsNotSVC':all(not x['svc'] for x in extensions),'subsetSPSProfile':128},'baseElementaryBytesExact':True,'completeDecodedFrameHashesExact':True,'decodedFrames':len(baseline),'referencePackets':len(source_times),'basePESBoundaries':len(extracted_times),'allReferencePacketTimesFoundInPES':True,'dependentViewAdmissionRejected':rejected,'dependentStandaloneDecodedFrames':len(dependent_frames),'dependentFFmpegExit':adverse.returncode,'scope':'Genuine interlaced Stereo High MVC transport source with AVC base PID0x1011 and view1 extension PID0x1012. Custom TS/PES base extraction matches independent FFmpeg demux bytes, complete decoded pictures, and all demux packet timing boundaries. No stereo output, arbitrary view selection, progressive browser decoding, native Wasm integration or performance claim.'},indent=2)+'\n');(r/'commands.log').write_text('\n'.join(json.dumps(c) for c in commands)+'\n')
