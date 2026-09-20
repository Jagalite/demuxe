# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,subprocess,array,struct,time,statistics
from flac_predictive_bits import *
SOURCE=pathlib.Path('research/shared/runs/20260919T232533Z-flac-mix/source.flac')
def split(data,cut=2048):
 rows=parse(data)
 if len(rows)!=1:raise ValueError('oneframe profile')
 r=rows[0];order=r['order'];n=r['n']
 if r['lpc']or cut<order or n-cut<order or cut*2!=n:raise ValueError('uniformsplit/profile')
 state=list(r['warm']);newWarm=[]
 for i,res in enumerate(r['res'],start=order):
  x=res+sum(c*state[-j-1]for j,c in enumerate(COEFF[order]));state=(state+[x])[-order:]
  if cut<=i<cut+order:newWarm.append(x)
  if i==cut+order-1:break
 first=make(0,cut,order,r['warm'],residual_bits(r['res'][:cut-order]));second=make(1,n-cut,order,newWarm,residual_bits(r['res'][cut:]));return stream([first,second],1,16,n,minblock=cut,maxblock=cut)
def decode(path):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','s16le','-'],stderr=subprocess.DEVNULL)
def main():
 p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);(p/'protocol.json').write_text(json.dumps({'scope':'Split actual single4096sample signed16 fixed-order3 Rice1 FLAC frame into two2048sample frames. Reuse predictor/residual values, derive second warmups with rolling3sample history, regenerate Rice partitions/frame numbering/STREAMINFO/CRCs.','correctness':'All4096host/native samples exact; actual libFLAC encoded seek --skip2048 yields exactsuffix; native seek/end/cleanup. Wrong numbering negative; CRC/truncation/unsafecut reject.','performance':'Five alternating full source read/parse/derive warmup/Ricewrite/author/destinationdecode versus ordinary host decode/reencode at2048frames/destinationdecode. Same exact two-frame lossless endpoint, <=0.9cost.'},indent=2));raw=SOURCE.read_bytes();dest=p/'output.flac';dest.write_bytes(split(raw));expected=decode(SOURCE);assert decode(dest)==expected;(p/'reference.s16').write_bytes(expected);(p/'reference.flac').write_bytes(raw);controls={}
 for name,data,cut in [('CRC',raw[:-3]+bytes([raw[-3]^1])+raw[-2:],2048),('truncation',raw[:-1],2048),('cut',raw,1)]:
  try:split(data,cut);controls[name]=False
  except (ValueError,IndexError):controls[name]=True
 assert all(controls.values());cmd=['flac','-d','-s','--force-raw-format','--endian=little','--sign=signed','--skip=2048','-c',str(dest)];seek=subprocess.check_output(cmd);assert seek==expected[4096:]
 rows=parse(dest.read_bytes());wrong=stream([make(0,2048,r['order'],r['warm'],r['resbits'])for r in rows],1,16,4096,minblock=2048,maxblock=2048);(p/'wrong-numbering.flac').write_bytes(wrong);bad=subprocess.run(['flac','-t',str(p/'wrong-numbering.flac')],capture_output=True);(p/'wrong-numbering-validation.txt').write_bytes(bad.stdout+bad.stderr);badSeek=subprocess.run(['flac','-d','-s','--force-raw-format','--endian=little','--sign=signed','--skip=2048','-c',str(p/'wrong-numbering.flac')],capture_output=True);assert badSeek.returncode!=0;(p/'wrong-numbering-seek.log').write_bytes(badSeek.stderr)
 result=subprocess.run(['flac','-t',str(dest)],capture_output=True);assert result.returncode==0;(p/'independent-flac-validation.txt').write_bytes(result.stdout+result.stderr);baseline=p/'baseline.flac';command=['ffmpeg','-v','error','-y','-i',str(SOURCE),'-c:a','flac','-frame_size','2048',str(baseline)];subprocess.run(command,check=True);frames=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_frames','-of','json',str(baseline)]))['frames'];assert [int(f['nb_samples'])for f in frames]==[2048,2048];assert decode(baseline)==expected
 (p/'results.json').write_text(json.dumps({'samples':4096,'hostExact':True,'libFLACSeek2048Exact':True,'candidateFrameSizes':[r['n']for r in rows],'baselineFrameSizes':[int(f['nb_samples'])for f in frames],'controls':controls,'wrongNumberingSequentialValidationExit':bad.returncode,'wrongNumberingSeekRejected':badSeek.returncode!=0,'rollingHistorySamples':3,'sourceBytes':len(raw),'outputBytes':dest.stat().st_size},indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/flac_temporal_split.py '+str(p)+'\n'+json.dumps(cmd)+'\n'+json.dumps(command)+'\n');print({'hostExact':True,'seekExact':True,'bytes':[len(raw),dest.stat().st_size]})
if __name__=='__main__':main()
