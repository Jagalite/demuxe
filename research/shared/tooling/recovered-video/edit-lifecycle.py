# SPDX-License-Identifier: Apache-2.0
import subprocess,pathlib,json,time,hashlib,sys
source=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True);n=640*360*3//2
F=['ffmpeg','-v','error'];commands=[]
def raw(p,extra=[]):
 args=F+extra+['-i',str(p),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'];commands.append(args);return subprocess.check_output(args)
oracle=raw(source/'no-b-edit.mp4')[7*n:113*n]
args=F+['-re','-stream_loop','-1','-i',str(source/'candidate.mp4'),'-f','null','-'];commands.append(args);p=subprocess.Popen(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE);time.sleep(.2);p.terminate();p.communicate(timeout=5);assert p.poll() is not None
assert raw(source/'candidate.mp4')==oracle
# Explicit source replacement with a different GOP/profile and extent then back.
other=raw(source/'no-b.mp4');assert len(other)==320*180*3//2*30
assert raw(source/'candidate.mp4',['-ss','1'])==oracle[30*n:]
result={'cancelExit':p.returncode,'ownerProcessTerminated':True,'freshReopenExact':True,'sourceChangeOtherDimensionsFrames':[320,180,30],'backToEditedSourceSeekExact':True,'editedFrameCount':106,'outputSha256':hashlib.sha256(oracle).hexdigest(),'commands':commands,'scope':'Host FFmpeg separate process ownership; not browser MediaSource lifecycle.'};(out/'results.json').write_text(json.dumps(result,indent=2)+'\n')
