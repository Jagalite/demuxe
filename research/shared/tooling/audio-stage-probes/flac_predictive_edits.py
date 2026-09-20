# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,math,json,subprocess,array,hashlib,time,statistics
from flac_predictive_bits import *
def correction(order,n):return [5,2*n-20,n*(n-1)//2-50,n*(n-1)*(n-2)//6-200][order-1]
def lpc_to_fixed(data):
 rows=parse(data);out=[]
 for r in rows:
  if not r['lpc']or r['shift']!=0 or r['coeff']!=COEFF[r['order']]:raise ValueError('not equivalent fixed predictor')
  out.append(make(r['index'],r['n'],r['order'],r['warm'],r['resbits']))
 return stream(out,1,16,sum(r['n']for r in rows),minblock=rows[0]['n'],maxblock=rows[0]['n'])
def edit_warmups(data,overflow=False):
 rows=parse(data);out=[]
 for r in rows:
  if r['lpc']:raise ValueError('fixed only')
  warm=[x+(32767 if overflow else correction(r['order'],i))for i,x in enumerate(r['warm'])];validate(r['order'],warm,r['res']);out.append(make(r['index'],r['n'],r['order'],warm,r['resbits']))
 return stream(out,1,16,sum(r['n']for r in rows),minblock=rows[0]['n'],maxblock=rows[0]['n'])
def mix(a,b,originA=0,originB=0):
 aa=parse(a);bb=parse(b)
 if originA!=originB or len(aa)!=len(bb):raise ValueError('alignment')
 out=[]
 for x,y in zip(aa,bb):
  if any(x[k]!=y[k]for k in ['index','n','order'])or x['lpc']or y['lpc']:raise ValueError('predictor alignment')
  warm=[v+w for v,w in zip(x['warm'],y['warm'])];res=[v+w for v,w in zip(x['res'],y['res'])];validate(x['order'],warm,res);out.append(make(x['index'],x['n'],x['order'],warm,residual_bits(res)))
 return stream(out,1,16,sum(x['n']for x in aa),minblock=aa[0]['n'],maxblock=aa[0]['n'])
def decode(path):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','s16le','-'],stderr=subprocess.DEVNULL)
def main():
 p=pathlib.Path(sys.argv[1]);mode=sys.argv[2];p.mkdir(parents=True,exist_ok=True);commands=[]
 protocol={'mode':mode,'scope':{'mix':'Aligned independent mono signed16 FLAC fixed-order3, Rice parameter1 sources; sum warmups/residuals, choose outputRice parameter, guard headroom with rolling3sample state.','lpc':'Exact zero-shift LPC coefficients equal fixed predictor orders1..4; retain warmup values and every Rice residual bit, change only predictor syntax/framing.','warm':'Explicit polynomial corrections degree below fixed predictor order1..4, alter only warmups while preserving Rice residual bits. Signed16 headroom checked by rolling4sample recurrence.'}[mode],'correctness':'Every host/native sample matches independent ordinary integer oracle; malformed CRC/truncation, mismatched profile, headroom/alignment controls; complete libFLAC validation and native render/end/closed.','performance':'After correctness five alternating complete cold source read/parse/transform/write+destination decode versus cheapest declared source decode/filter/normalencode+destination decode for requested compressed mix/edit; LPC baseline simply decodes original valid LPC without re-encoding. <=0.9cost. Output size reported separately.'};(p/'protocol.json').write_text(json.dumps(protocol,indent=2))
 if mode=='mix':
  n=4096;a=[round(3000*math.sin(i*.005))for i in range(n)];b=[round(2000*math.sin(i*.009))for i in range(n)];expected=[x+y for x,y in zip(a,b)]
  for name,xs in [('source',a),('second',b)]:(p/(name+'.flac')).write_bytes(stream([make(0,n,3,xs[:3],residual_bits(residuals(xs,3),1))],1,16,n,minblock=n,maxblock=n))
  out=mix((p/'source.flac').read_bytes(),(p/'second.flac').read_bytes())
 else:
  n=257 if mode=='lpc'else 32;xs=[round(1000*math.sin(i*.075))for i in range(n*4)];frames=[];expected=[]
  for i,order in enumerate(range(1,5)):
   block=xs[i*n:(i+1)*n];frames.append(make(i,n,order,block[:order],residual_bits(residuals(block,order),1),lpc=mode=='lpc'));expected.extend(block if mode=='lpc'else[x+correction(order,j)for j,x in enumerate(block)])
  (p/'source.flac').write_bytes(stream(frames,1,16,len(xs),minblock=n,maxblock=n));out=(lpc_to_fixed if mode=='lpc'else edit_warmups)((p/'source.flac').read_bytes())
 dest=p/'output.flac';dest.write_bytes(out);expectedbytes=array.array('h',expected).tobytes();assert decode(dest)==expectedbytes
 (p/'reference.s16').write_bytes(expectedbytes);cmd=['ffmpeg','-v','error','-y','-f','s16le','-ar','48000','-ac','1','-i',str(p/'reference.s16'),'-c:a','flac',str(p/'reference.flac')];subprocess.run(cmd,check=True);commands.append(cmd);controls={};raw=(p/'source.flac').read_bytes()
 for name,bad in [('CRC',raw[:-3]+bytes([raw[-3]^1])+raw[-2:]),('truncated',raw[:-1])]:
  try:parse(bad);controls[name]=False
  except ValueError:controls[name]=True
 if mode=='mix':
  for name,fn in [('alignment',lambda:mix(raw,(p/'second.flac').read_bytes(),0,1)),('overflow',lambda:mix(stream([make(0,n,3,[30000]*3,residual_bits([0]*(n-3),1))],1,16,n,minblock=n,maxblock=n),stream([make(0,n,3,[30000]*3,residual_bits([0]*(n-3),1))],1,16,n,minblock=n,maxblock=n)))]:
   try:fn();controls[name]=False
   except ValueError:controls[name]=True
 elif mode=='lpc':
  for name,coeff,shift in [('nearCoefficient',[2,-2],0),('shift',[2,-1],1)]:
   bad=stream([make(0,n,2,[1,2],residual_bits([0]*(n-2),1),lpc=True,coeff=coeff,shift=shift)],1,16,n,minblock=n,maxblock=n)
   try:lpc_to_fixed(bad);controls[name]=False
   except ValueError:controls[name]=True
 else:
  try:edit_warmups(raw,True);controls['overflow']=False
  except ValueError:controls['overflow']=True
 assert all(controls.values());r=subprocess.run(['flac','-t',str(p/'source.flac'),str(dest)],capture_output=True);assert r.returncode==0;(p/'independent-flac-validation.txt').write_bytes(r.stdout+r.stderr)
 proof=True if mode=='mix'else all(a['resbits']==b['resbits']for a,b in zip(parse(raw),parse(out)));assert proof
 result={'mode':mode,'samples':len(expected),'hostExact':True,'residualBitsPreserved':proof if mode!='mix'else'new residual sum encoded','controls':controls,'sourceBytes':len(raw),'outputBytes':len(out),'outputRange':[min(expected),max(expected)],'sourceRiceParameters':[r['k']for r in parse(raw)],'sourceOrders':[r['order']for r in parse(raw)]};(p/'results.json').write_text(json.dumps(result,indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/flac_predictive_edits.py '+str(p)+' '+mode+'\n'+'\n'.join(map(json.dumps,commands))+'\n');print(result)
if __name__=='__main__':main()
