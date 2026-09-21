"""D34 native host libjxl JPEG reconstruction, NOT a Wasm/browser libjxl build."""
from common import *
import ctypes as C,ctypes.util,numpy as np,io
from PIL import Image,ImageCms
j=C.CDLL(ctypes.util.find_library('jxl'))
P=C.c_void_p; Z=C.c_size_t; I=C.c_int;U8=C.POINTER(C.c_ubyte)
for n,args,res in [
 ('JxlEncoderCreate',[P],P),('JxlEncoderDestroy',[P],None),('JxlEncoderUseContainer',[P,I],I),('JxlEncoderStoreJPEGMetadata',[P,I],I),('JxlEncoderFrameSettingsCreate',[P,P],P),('JxlEncoderAddJPEGFrame',[P,P,Z],I),('JxlEncoderCloseInput',[P],None),('JxlEncoderProcessOutput',[P,C.POINTER(U8),C.POINTER(Z)],I),
 ('JxlDecoderCreate',[P],P),('JxlDecoderDestroy',[P],None),('JxlDecoderSubscribeEvents',[P,I],I),('JxlDecoderSetInput',[P,P,Z],I),('JxlDecoderCloseInput',[P],None),('JxlDecoderProcessInput',[P],I),('JxlDecoderSetJPEGBuffer',[P,P,Z],I),('JxlDecoderReleaseJPEGBuffer',[P],Z),('JxlDecoderVersion',[],C.c_uint32)]:
 f=getattr(j,n);f.argtypes=args;f.restype=res

def encode_jpeg(src,store=True):
 enc=j.JxlEncoderCreate(None)
 if not enc:raise ValueError('alloc')
 try:
  for status in [j.JxlEncoderUseContainer(enc,1),j.JxlEncoderStoreJPEGMetadata(enc,int(store))]:
   if status:raise ValueError('encoder settings')
  settings=j.JxlEncoderFrameSettingsCreate(enc,None)
  inp=C.create_string_buffer(src)
  if j.JxlEncoderAddJPEGFrame(settings,inp,len(src)):raise ValueError('JPEG input rejected')
  j.JxlEncoderCloseInput(enc);parts=[]
  for _ in range(512):
   out=(C.c_ubyte*65536)();ptr=C.cast(out,U8);avail=Z(len(out));status=j.JxlEncoderProcessOutput(enc,C.byref(ptr),C.byref(avail));parts.append(bytes(out[:len(out)-avail.value]))
   if status==0:return b''.join(parts)
   if status!=2:raise ValueError(f'encode status {status}')
  raise ValueError('iteration cap')
 finally:j.JxlEncoderDestroy(enc)

def reconstruct(src,cap=1024*1024):
 if not 1<=cap<=16*1024*1024 or len(src)>16*1024*1024:raise ValueError('size scope')
 dec=j.JxlDecoderCreate(None);events=[];got=False;out=None
 try:
  if j.JxlDecoderSubscribeEvents(dec,0x2000|0x1000):raise ValueError('subscribe')
  inp=C.create_string_buffer(src)
  if j.JxlDecoderSetInput(dec,inp,len(src)):raise ValueError('input')
  j.JxlDecoderCloseInput(dec)
  for _ in range(32):
   status=j.JxlDecoderProcessInput(dec);events.append(status)
   if status==0x2000:
    got=True;out=(C.c_ubyte*cap)()
    if j.JxlDecoderSetJPEGBuffer(dec,out,cap):raise ValueError('jpeg output')
   elif status==0x1000:continue
   elif status==0:
    if not got:raise ValueError('no JPEG reconstruction metadata')
    unused=j.JxlDecoderReleaseJPEGBuffer(dec);return bytes(out[:cap-unused]),events
   elif status==6:raise ValueError('JPEG output cap exceeded')
   elif status==5:raise ValueError('no JPEG reconstruction: pixel fallback required')
   else:raise ValueError(f'JXL decode status {status}')
  raise ValueError('iteration cap')
 finally:j.JxlDecoderDestroy(dec)

if __name__=='__main__':
 r={'libjxl_version':j.JxlDecoderVersion(),'cases':{}}
 icc=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
 for name,w,h,mode,progressive in [('baseline',160,96,'RGB',False),('progressive',191,113,'RGB',True),('gray',127,73,'L',False),('oriented_icc',160,96,'RGB',False)]:
  yy,xx=np.indices((h,w));a=np.stack([(xx*3+yy*2)%256,(xx+yy*5)%256,((xx//9+yy//7)%2)*211],axis=-1).astype('uint8');im=Image.fromarray(a).convert(mode)
  opts={'quality':87,'progressive':progressive}
  if name=='oriented_icc':
   ex=Image.Exif();ex[274]=6;opts.update(exif=ex,icc_profile=icc)
  bio=io.BytesIO();im.save(bio,format='JPEG',**opts);src=bio.getvalue();(F/(name+'.jpg')).write_bytes(src)
  x=encode_jpeg(src);(F/(name+'.jxl')).write_bytes(x);rec,events=reconstruct(x);(F/(name+'_recovered.jpg')).write_bytes(rec)
  no=encode_jpeg(src,False);(F/(name+'_no_recon.jxl')).write_bytes(no)
  r['cases'][name]={'jpeg_bytes':len(src),'jxl_bytes':len(x),'jpeg_exact':src==rec,'jpeg_sha256':sha(rec),'events':events,'no_recon':reject(lambda:reconstruct(no)),'truncated':reject(lambda:reconstruct(x[:-17])),'output_cap':reject(lambda:reconstruct(x,128))}
 save('jxl_component.json',r);print(json.dumps(r,indent=2))
