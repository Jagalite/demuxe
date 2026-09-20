# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json
p=pathlib.Path(sys.argv[1]);w,h=512,384
for name,shift in [('source',0),('replacement',91)]:
 data=bytes(v for y in range(h) for x in range(w) for v in [((x*3+y*7+shift)^((x//8+y//8)%2*127))%256,((x*11+y*2+shift)%256),((x-y)*5+shift)%256]);(p/(name+'.ppm')).write_bytes(f'P6\n{w} {h}\n255\n'.encode()+data);subprocess.run(['cjpeg','-progressive','-quality','90','-sample','1x1','-outfile',str(p/(name+'.jpg')),str(p/(name+'.ppm'))],check=True,capture_output=True)
b=(p/'source.jpg').read_bytes();at=2;cuts=[];scans=0
while at<len(b):
 assert b[at]==255
 marker=b[at+1]
 if marker==217:break
 n=int.from_bytes(b[at+2:at+4],'big');at+=2+n
 if marker==218:
  scans+=1
  while at<len(b)-1:
   if b[at]!=255:at+=1;continue
   if b[at+1]==0 or 208<=b[at+1]<=215:at+=2;continue
   cuts.append(at);break
assert scans>=6
(p/'plan.json').write_text(json.dumps({'width':w,'height':h,'bytes':len(b),'scans':scans,'cuts':cuts,'releaseCuts':[cuts[0]+2,cuts[scans//2]+2,len(b)],'scope':'Image-element compositor provisional preview kept distinct from committed final decoded image; trusted owned source epoch and actual cancellation.'},indent=2)+'\n');print({'bytes':len(b),'scans':scans})
