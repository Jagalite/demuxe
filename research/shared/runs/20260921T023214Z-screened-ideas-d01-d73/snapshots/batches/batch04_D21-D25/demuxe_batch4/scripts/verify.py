"""Reconcile executed observations, including controls expected to fail.
SPDX-License-Identifier: MIT.
"""
from common import *
from PIL import Image
import io,numpy as np,itertools
from rle_png import transcode_rows
checks=[]
def check(name,value,detail=None):
 checks.append({'name':name,'passed':bool(value),'detail':detail})
def read(name):return json.loads((E/name).read_text())
b=read('browser_first.json');j=read('jpeg_host.json');a=read('browser_images.json');ori=read('orientation_host.json');ch=read('channel_host.json');am=read('animation_manifest.json')
for row in j['cases']:
 n=row['name'];check(n+' scan+host identity',row['scan_retained'] and row['host_rgb_equal'])
 check(n+' browser admission and image identity','error'in b[n+'_short.jpg'] and b[n+'_full.jpg'].get('hash')==b[n+'_restored.jpg'].get('hash'))
check('JPEG wrong source tables can decode wrong pixels','error'not in b['jpeg_wrong_tables.jpg'] and b['jpeg_wrong_tables.jpg']['hash']!=b['jpeg_e1_0_full.jpg']['hash'])
check('JPEG all table-source controls reject',all(x['rejected']for x in j['controls'].values()))
sei=read('orientation_sei.mp4.probe.json');matrix=read('orientation_matrix.mp4.probe.json')
fields=['pts','dts','duration','size','data_hash']
check('orientation all packet payloads/timing preserved',[[p.get(k)for k in fields]for p in sei['packets']]==[[p.get(k)for k in fields]for p in matrix['packets']])
check('orientation full host YUV unchanged',ori['orientation_sei.mp4']['raw_yuv_sha256']==ori['orientation_matrix.mp4']['raw_yuv_sha256'])
comparisons={}
for direct in [True,False]:
 suffix=':'+str(direct);base=b['orientation_base.mp4'+suffix]['frames'];rows=[]
 for n in ['base','sei','matrix','wrong']:check('orientation '+n+suffix+' seek+EOF',b['orientation_'+n+'.mp4'+suffix].get('ended') and len(b['orientation_'+n+'.mp4'+suffix]['frames'])==3 and b['orientation_'+n+'.mp4'+suffix]['cleanup']==0)
 for src,plain,good,bad in zip(base,b['orientation_sei.mp4'+suffix]['frames'],b['orientation_matrix.mp4'+suffix]['frames'],b['orientation_wrong.mp4'+suffix]['frames']):
  x=np.array(src['rgba'],dtype='uint8').reshape(src['h'],src['w'],4);y=np.array(good['rgba'],dtype='uint8').reshape(good['h'],good['w'],4);z=np.array(bad['rgba'],dtype='uint8').reshape(bad['h'],bad['w'],4)
  row={'target':src['target'],'media_times':[f['time']for f in [src,plain,good,bad]],'sei_ignored_in_this_profile':src['hash']==plain['hash'],'counterclockwise90_exact':bool(np.array_equal(np.rot90(x),y)),'wrong_sign_detected':bool(np.any(y!=z))};rows.append(row)
 check('orientation precise pixels and wrong-sign witness'+suffix,all(r['counterclockwise90_exact'] and r['sei_ignored_in_this_profile'] and r['wrong_sign_detected'] and len(set(r['media_times']))==1 for r in rows));comparisons[str(direct)]=rows
save('orientation_comparison.json',comparisons)
check('orientation guards',all(c['rejected']for c in ori['guards'].values()))
check('FLAC exact host selected integers',ch['host_exact_selected_pcm'] and ch['wrong_pair_differs'])
ac=b['channel_projection'];check('FLAC browser exact requested channels',ac['selected_front.flac']['channelHashes']==ac['six_channel.flac']['channelHashes'][:2] and ac['selected_front.flac']['frames']==ac['six_channel.flac']['frames']==192000)
check('FLAC wrong pair and order detected',sum(ac['selected_rear.flac']['frontMismatches'])>0 and sum(ac['selected_reversed.flac']['frontMismatches'])>0)
check('FLAC request/truncation guards',all(c['rejected']for c in ch['controls'].values()))
for name,r in read('rle_host.json').items():
 check('RLE '+name+' host/reference identity',r['host_rgba_exact'] and r['zlib_exact_scanlines'])
 check('RLE '+name+' both native PNG variants exact',a[f'rle_{name}_candidate.png'].get('hash')==a[f'rle_{name}_reference.png'].get('hash')==a[f'rle_{name}_row_reuse.png'].get('hash'))
check('palette-only update changes delivered colors without new IDAT',read('rle_host.json')['glyphs']['palette_change_keeps_idat'] and a['rle_glyphs_recolored.png']['hash']!=a['rle_glyphs_reference.png']['hash'])
check('RLE run-only controls',all(c['rejected']for c in read('rle_host.json')['glyphs']['controls'].values()))
rr=read('rle_row_reuse.json');check('row reuse all guards',all(c['rejected']for r in rr.values()for c in r['controls'].values()))
# Extra generated edge cases around DEFLATE minimum/multiple-match lengths and row lengths.
rng=np.random.default_rng(22025);props=[]
for w in [1,2,3,4,7,63,64,127,255,256,257,258,259,260,515,516,517,4096]:
 for mode in ['constant','repeat','noise']:
  h=3;arr=rng.integers(0,4,size=(h,w),dtype='uint8')
  if mode=='constant':arr[:]=rng.integers(0,4)
  elif mode=='repeat':arr[1:]=arr[0]
  encoded=bytearray()
  for row in arr:
   for v,g in itertools.groupby(map(int,row)):
    n=sum(1 for _ in g)
    if n==1 and v:encoded.append(v);continue
    f=(128 if v else 0)|(64 if n>=64 else 0)|((n>>8)if n>=64 else n);encoded+=bytes([0,f])
    if n>=64:encoded.append(n&255)
    if v:encoded.append(v)
   encoded+=b'\0\0'
  pal=[(0,0,0,0),(255,255,255,255),(0,0,0,128),(255,0,0,255)];out,_=transcode_rows(bytes(encoded),w,h,pal)
  actual=np.asarray(Image.open(io.BytesIO(out)).convert('RGBA'));expected=np.array(pal,dtype='uint8')[arr]
  props.append({'width':w,'mode':mode,'exact':bool(np.array_equal(actual,expected))})
check('54 symbolic-row DEFLATE edge cases',all(p['exact']for p in props));save('row_reuse_edge_cases.json',props)
check('APNG all independent host comparisons',all(x['pillow_matches_authored_semantics']for x in am['host']))
check('APNG 12 nonmonotonic cold seeks exact',len(a['animation']['cases'])==12 and all(x['differentComponents']==0 for x in a['animation']['cases']))
check('APNG wrong disposal and anchor detected',all(x['differentComponents']>0 for x in a['animation']['controls'].values()))
check('APNG structural controls reject',all(x['rejected']for x in am['controls'].values()))
check('APNG final seek uses 5 decodes',next(x for x in a['animation']['cases']if x['target']==11)['decodedFrames']==5)
check('APNG encoded frame payloads copied exactly',all(f['payload_sha256']==sha((lambda raw:(lambda p:raw[p+4:p+4+int.from_bytes(raw[p-4:p],'big')])(raw.index(b'IDAT')))((F/f'apng_frame_{f["id"]}.png').read_bytes()))for f in am['frames']))
im=Image.open(F/'seek_animation.apng');im.seek(0);poster=sha(np.asarray(im.convert('RGBA')).tobytes());obs=a['animation']['whole_apng_bitmap']['hash'];save('apng_default_image_observation.json',{'authored_static_default_sha256':poster,'whole_apng_imagebitmap_sha256':obs,'animation_zero_sha256':am['host'][0]['pillow_rgba_sha256'],'whole_imagebitmap_is_animation_zero_not_static_poster':obs==am['host'][0]['pillow_rgba_sha256'] and obs!=poster})
summary={'cross_checks':len(checks),'passed':sum(x['passed']for x in checks),'failed':sum(not x['passed']for x in checks),'checks':checks,'interpretation':'Expected rejection and wrong-output controls count as passing checks; not native-route or performance wins.'};save('verification.json',summary)
print(json.dumps({k:v for k,v in summary.items()if k!='checks'},indent=2))
for c in checks:
 if not c['passed']:print('FAILED',c['name'])
if summary['failed']:raise SystemExit(1)
