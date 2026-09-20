# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,array,math,json,subprocess,hashlib
p=pathlib.Path(sys.argv[1]);commands=[];N=30*48000
for name in ['tonal','noise']:
 a=array.array('h');state=17
 for i in range(N):
  for channel,hz in enumerate([440,880]):
   state=(1664525*state+1013904223)&0xffffffff;noise=((state>>16)-32768)//8 if name=='noise'else 0;a.append(round(11000*math.sin(2*math.pi*hz*i/48000))+noise)
 raw=p/(name+'.s16');raw.write_bytes(a.tobytes());args=['ffmpeg','-v','error','-y','-f','lavfi','-i','color=red:size=160x96:rate=24:duration=30','-f','s16le','-ar','48000','-ac','2','-i',str(raw),'-map','0:v','-map','1:a','-c:v','libx264','-preset','ultrafast','-profile:v','baseline','-level','3.0','-g','48','-c:a','pcm_s16le',str(p/(name+'.mkv'))];subprocess.run(args,check=True);commands.append(args)
(p/'fixture-commands.json').write_text(json.dumps(commands,indent=2));(p/'protocol.json').write_text(json.dumps({'item':'R071.tune-flac-effort-without-changing-frame-duration','scope':'CopiedmaintainedWasmadaptation bridge linkedtwice againstsamecachedlockedFFmpeg7.1.1 staticlibraries, solelevel0/5macro difference, bothframe_size4608 explicitlyfixed inisolatedGPLsnapshot. Two30s48kstereoS16sources tonal/seedednoise withcopiedH264.','correctness':'Everyhost/nativebrowser integer sample equalsordinaryPCMsource;313FLACpackets identicaldurationsequence312x4608+2304; everycopiedvideopacket hashpreserved. ActualnativeMSEseek/audio/nearendEOF bothprofiles, duringreal20stepworker cancellation andnextfreshjob, allownersclean.','performance':'Aftercorrectness1warmup5alternatingpairs perinput throughactualworker/module/File-reader setup+completeWasmprepare+outputtransfer+nativewholefile decode+offline render+cleanup. Level0median<=0.9level5 andbytes<=1.25, bothinputs. No physicaldeviceorauto-admission claim. Compilation/setup excludedsharedrecorded.'},indent=2))
