#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Build an isolated packed-PCM staging candidate with the existing observer."""
import pathlib,json,os,subprocess,hashlib,difflib,argparse
root=pathlib.Path(__file__).resolve().parents[1]
base=root/'build/local-screening/adaptation-reference'
reference=pathlib.Path(json.loads((base/'latest.json').read_text())['engine'])
manifest=json.loads((reference/'manifest.json').read_text())
parser=argparse.ArgumentParser();parser.add_argument('--control',choices=['overwrite','precision']);options=parser.parse_args()
out=root/('build/local-screening/adaptation-packed'+('-'+options.control if options.control else ''))
out.mkdir(exist_ok=False)
source=out/'native';(source/'remux').mkdir(parents=True);(source/'adaptation').mkdir()
(source/'remux/remux.c').write_bytes((root/'native/remux/remux.c').read_bytes())
original=(root/'build/local-screening/adaptation-profile/native/adaptation/flac.h').read_text()
start='  AVFrame *converted=av_frame_alloc();'
end='  screen_staging_ms+=emscripten_get_now()-screen_begin;'
assert original.count(start)==1 and original.count(end)==1
text=original.replace(start,'''  if(adapt_enabled==1&&!planar){
   // Validate the complete S24 frame before publishing any samples to the FIFO.
   if(bytes==4)for(int i=0;i<f->nb_samples*channels;i++){
    int32_t value;memcpy(&value,f->extended_data[0]+i*4,4);
    if(value&255)return reject("Decoded samples exceed established 24-bit precision");
   }
   if(av_audio_fifo_size(adapt_fifo)+f->nb_samples>131072)return reject("Audio FIFO budget exceeded");
   r=av_audio_fifo_write(adapt_fifo,(void**)f->extended_data,f->nb_samples);
   if(r!=f->nb_samples)return r<0?r:AVERROR_BUG;
  }else{
''' + start).replace(end,'  }\n'+end)
if options.control=='precision':
 text=text.replace('   // Validate the complete S24', '   if(bytes==4)f->extended_data[0][0]|=1;\n   // Validate the complete S24')
if options.control=='overwrite':
 text=text.replace('   if(r!=f->nb_samples)return r<0?r:AVERROR_BUG;', '   if(r!=f->nb_samples)return r<0?r:AVERROR_BUG;\n   memset(f->extended_data[0],0,f->nb_samples*channels*bytes);')
(source/'adaptation/flac.h').write_text(text)
(out/'candidate.patch').write_text(''.join(difflib.unified_diff(original.splitlines(True),text.splitlines(True),fromfile='profile/flac.h',tofile='packed/flac.h')))
args=manifest['linkCommand'].copy();args[args.index(str(root/'native/remux/remux.c'))]=str(source/'remux/remux.c');args[-1]=str(out/'remux.mjs')
sdk=pathlib.Path('/Volumes/seed2/Projects/webmpv/build/emsdk-4.0.14')
env={**os.environ,'EM_CONFIG':str(base/'emscripten.config'),'PATH':str(sdk/'upstream/emscripten')+os.pathsep+os.environ['PATH']}
subprocess.run(args,cwd=root,env=env,check=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
(out/'manifest.json').write_text(json.dumps({'reference':str(reference),'linkCommand':args,'files':{str(p):sha(p) for p in [source/'remux/remux.c',source/'adaptation/flac.h',out/'remux.mjs',out/'remux.wasm',out/'candidate.patch']},'scope':'Research packed integer FIFO staging bypass; unchanged planar and Opus branches; observer retained'},indent=2)+'\n')
print(out)
