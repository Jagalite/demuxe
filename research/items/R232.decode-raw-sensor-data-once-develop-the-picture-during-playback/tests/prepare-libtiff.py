# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import sys,struct,json,array,subprocess,ctypes,shutil,hashlib
lib=ctypes.CDLL('/opt/homebrew/opt/libtiff/lib/libtiff.dylib');lib.TIFFOpen.argtypes=[ctypes.c_char_p,ctypes.c_char_p];lib.TIFFOpen.restype=ctypes.c_void_p;lib.TIFFReadScanline.argtypes=[ctypes.c_void_p,ctypes.c_void_p,ctypes.c_uint32,ctypes.c_uint16];lib.TIFFReadScanline.restype=ctypes.c_int;lib.TIFFClose.argtypes=[ctypes.c_void_p]
p=Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=False);W,H=64,48;gains=[[256,256,256],[512,256,128],[128,384,512]]
def color(x,y):return 0 if x%2==0 and y%2==0 else 2 if x%2==1 and y%2==1 else 1
results={}
for name,variant in [('source',0),('replacement',1)]:
 raw=[(x*31+y*53+color(x,y)*701+variant*997)%4096 for y in range(H)for x in range(W)];tags=[(256,4,1,W),(257,4,1,H),(258,3,1,16),(259,3,1,1),(262,3,1,32803),(273,4,1,0),(274,3,1,1),(277,3,1,1),(278,4,1,H),(279,4,1,W*H*2),(284,3,1,1),(339,3,1,1),(33421,3,2,struct.pack('<HH',2,2)),(33422,1,4,bytes([0,1,1,2])),(50706,1,4,bytes([1,4,0,0])),(50707,1,4,bytes([1,1,0,0])),(50714,4,1,64),(50717,4,1,4095)];tags.sort();offset=8+2+len(tags)*12+4;buf=bytearray(b'II'+struct.pack('<HIH',42,8,len(tags)))
 for tag,typ,count,value in tags:
  if tag==273:value=offset
  if isinstance(value,int):value=struct.pack('<I',value)
  buf.extend(struct.pack('<HHI',tag,typ,count)+value)
 buf.extend(bytes(4));buf.extend(array.array('H',raw).tobytes());(p/f'{name}.dng').write_bytes(buf);(p/f'{name}.r16').write_bytes(array.array('H',raw).tobytes());cmd=['ffmpeg','-v','error','-i',str(p/f'{name}.dng'),'-f','rawvideo','-pix_fmt','bayer_rggb16le','-y',str(p/f'{name}-host.r16')];q=subprocess.run(cmd,capture_output=True,text=True);(p/f'{name}-host.log').write_text(q.stderr);assert q.returncode==0,q.stderr;tif=lib.TIFFOpen(str(p/f'{name}.dng').encode(),b'r');assert tif;decoded=bytearray()
 try:
  row=ctypes.create_string_buffer(W*2)
  for y in range(H):assert lib.TIFFReadScanline(tif,row,y,0)==1;decoded.extend(row.raw)
 finally:lib.TIFFClose(tif)
 (p/f'{name}-libtiff.r16').write_bytes(decoded);assert decoded==array.array('H',raw).tobytes()
 recipes=[]
 for gain in gains:
  pixels=[]
  for y in range(H):
   for x in range(W):
    for c in range(3):
     if color(x,y)==c:value=raw[y*W+x]
     else:
      samples=[raw[yy*W+xx]for yy in range(max(0,y-1),min(H,y+2))for xx in range(max(0,x-1),min(W,x+2))if color(xx,yy)==c];value=sum(samples)//len(samples)
     pixels.append(min(4095,max(0,value-64)*gain[c]//256))
    pixels.append(4095)
  recipes.append({'gain':gain,'pixels':pixels})
 (p/f'{name}-oracle.json').write_text(json.dumps(recipes)+'\n');results[name]={'raw_samples':len(raw),'libtiff_raw_exact':True,'FFmpeg_applies_DNG_black_white_scaling':True,'command':cmd}
(p/'prepare-results.json').write_text(json.dumps(results,indent=2)+'\n');(p/'plan.json').write_text(json.dumps({'contract':'ActualuncompressedTIFF/DNG R16 RGGB64x48 sensorplane; validateCFA/bitdepth/orientation/black64/white4095/stripbounds. IndependentlibTIFF scanlines exact authoredsensorplane; FFmpegappliesDNG black/whitescaling andisnotrawsampleoracle. Declaredintegerdevelopment: same-sitesample ormeanofmatching3x3CFAneighbors, flooraverage, subtract64clamp0, Q8whitebalancefloor/clamp4095, opaquealpha4095. PythonindependentRGBAinteger oracle3recipes, edgesincluded. Not camera-calibrated color orgeneralRAWcodecclaim.','performance':'9alternating colddevice30developmentviews rotating3WBrecipes; fetch/parse/unpacksensoronce eachjob, retainraw owner, baselineCPUdevelopeachview+RGBAu32upload vsGPUrawuploadonce+recipeuniform+compute; bothGPUintegerconsumer copy/readback/compare/close. Count rawretention/upload andshader/setup costs; lower95saving>=10%. BadCFA/grayasRGB/truncation andstalesource/freshreplacement reject or differ.'},indent=2)+'\n')

(p/'snapshots').mkdir();shutil.copyfile('/opt/homebrew/Cellar/libtiff/4.7.2/LICENSE.md',p/'snapshots/libtiff-LICENSE.md');(p/'source-notice.json').write_text(json.dumps({'component':'libtiff4.7.2 installedHomebrew','library':'/opt/homebrew/opt/libtiff/lib/libtiff.dylib','library_sha256':hashlib.sha256(Path('/opt/homebrew/opt/libtiff/lib/libtiff.dylib').read_bytes()).hexdigest(),'license':'retainedupstreamnotice snapshots/libtiff-LICENSE.md; not researchgrant'},indent=2)+'\n')
