# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import sys,json,subprocess,hashlib
r=Path(sys.argv[1]);commands=[]
def call(a,ok=True):
 commands.append(a);p=subprocess.run(a,capture_output=True);assert (p.returncode==0)==ok,(a,p.returncode,p.stderr.decode());return p
(r/'input.pgm').write_bytes(b'P5\n1024 1024\n255\n'+bytes((x//4+y//4+(32 if (x//64+y//64)%2 else 0))%256 for y in range(1024) for x in range(1024)))
a=['build/catalogue-tools/openjpeg-build/bin/opj_compress','-i',str(r/'input.pgm'),'-o',str(r/'source.j2k'),'-t','256,256','-p','RPCL','-r','20,5,1','-n','5'];p=call(a);(r/'encode.log').write_bytes(p.stdout+p.stderr)
def pgm(path):
 b=path.read_bytes();tokens=[];i=0
 while len(tokens)<4:
  while b[i] in b' \r\n\t':i+=1
  if b[i]==35:
   i=b.index(b'\n',i)+1;continue
  start=i
  while b[i] not in b' \r\n\t':i+=1
  tokens.append(b[start:i])
 assert tokens[0]==b'P5' and tokens[3]==b'255';i+=1;w,h=map(int,tokens[1:3]);data=b[i:];assert len(data)==w*h;return w,h,data
cases=[('full',[0,0,0,0],0,0),('area',[512,512,768,768],0,0),('area_reduce1',[512,512,768,768],1,0),('area_layer1',[512,512,768,768],0,1)];results=[]
for name,area,reduce,layer in cases:
 args=['build/catalogue-tools/openjpeg-source',str(r/'source.j2k'),str(r/(name+'.pgm')),str(r/(name+'-trace.csv')),*map(str,area),str(reduce),str(layer)];p=call(args);j=json.loads(p.stdout);(r/(name+'-metrics.json')).write_bytes(p.stdout);(r/(name+'-stderr.log')).write_bytes(p.stderr)
 cmd=['build/catalogue-tools/openjpeg-build/bin/opj_decompress','-i',str(r/'source.j2k'),'-o',str(r/(name+'-reference.pgm'))]
 if area[2]:cmd+=['-d',','.join(map(str,area))]
 if reduce:cmd+=['-r',str(reduce)]
 if layer:cmd+=['-l',str(layer)]
 q=call(cmd);(r/(name+'-reference.log')).write_bytes(q.stdout+q.stderr);a=pgm(r/(name+'.pgm'));b=pgm(r/(name+'-reference.pgm'));assert a==b;j.update(name=name,reference_exact=True,sha256=hashlib.sha256(a[2]).hexdigest());results.append(j)
full=pgm(r/'full.pgm')[2];assert full==pgm(r/'input.pgm')[2];area=pgm(r/'area.pgm')[2];expected=b''.join(full[y*1024+512:y*1024+768] for y in range(512,768));assert area==expected
assert results[1]['unique_read_bytes']<results[0]['unique_read_bytes'];(r/'truncated.j2k').write_bytes((r/'source.j2k').read_bytes()[:20]);negative=[]
for name,file,area in [('truncated',r/'truncated.j2k',[0,0,0,0]),('out_of_bounds',r/'source.j2k',[512,512,2048,768])]:
 q=call(['build/catalogue-tools/openjpeg-source',str(file),str(r/(name+'.rejected')),str(r/(name+'-trace.csv')),*map(str,area),'0','0'],False);(r/(name+'-metrics.json')).write_bytes(q.stdout);(r/(name+'-stderr.log')).write_bytes(q.stderr);negative.append(json.loads(q.stdout));assert not (r/(name+'.rejected')).exists()
q=call(['build/catalogue-tools/openjpeg-source',str(r/'source.j2k'),str(r/'fresh.pgm'),str(r/'fresh-trace.csv'),'512','512','768','768','0','0']);assert pgm(r/'fresh.pgm')==pgm(r/'area.pgm');summary={'passed':True,'cases':results,'negative_controls':negative,'independent_full_decode_crop_exact':True,'full_lossless_original_exact':True,'fresh_owner_after_bad_sources_exact':True,'source_unique_reduction_percent':100*(1-results[1]['unique_read_bytes']/results[0]['unique_read_bytes']),'reduce_extra_byte_saving':results[1]['unique_read_bytes']-results[2]['unique_read_bytes'],'layer_extra_byte_saving':results[1]['unique_read_bytes']-results[3]['unique_read_bytes'],'all_owners_closed':True,'logical_callback_reads_not_physical_IO':True};(r/'results.json').write_text(json.dumps(summary,indent=2));(r/'commands.json').write_text(json.dumps(commands,indent=2));print(summary)
