# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,array,json,struct
p=pathlib.Path(sys.argv[1]);short=p/'short-cli-variance';source=short/'source.dsd';coeff=p/'coefficients.bin';exe=p/'filter';ref=array.array('f');ref.frombytes((short/'fused.f32').read_bytes());rows={}
for name,inp,coef in [('wrongBitOrder',p/'wrong-bit-order.dsd',coeff),('wrongFilter',source,p/'wrong-filter.bin')]:
 if name=='wrongBitOrder':inp.write_bytes(bytes(int(format(x,'08b')[::-1],2)for x in source.read_bytes()))
 else:
  raw=bytearray(coeff.read_bytes());value=struct.unpack_from('<d',raw,8+47*8)[0];struct.pack_into('<d',raw,8+47*8,value*.9);coef.write_bytes(raw)
 out=p/(name+'.f32');subprocess.run([str(exe),'fused',str(coef),str(inp),str(out)],check=True);actual=array.array('f');actual.frombytes(out.read_bytes());error=max(abs(a-b)for a,b in zip(actual,ref));assert error>1e-6;rows[name]={'maxError':error,'detected':True}
bad=p/'wrong-coefficient-shape.bin';bad.write_bytes(struct.pack('<II',95,17));r=subprocess.run([str(exe),'fused',str(bad),str(source),str(p/'must-not-publish.f32')]);assert r.returncode==3 and not(p/'must-not-publish.f32').exists();rows['wrongCoefficientShape']={'exit':r.returncode,'noOutputPublished':True};(p/'controls.json').write_text(json.dumps(rows,indent=2));(p/'controls-commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/dsd_fused_controls.py '+str(p)+'\n');print(rows)
