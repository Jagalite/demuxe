#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Instrument a copied adaptation source; reuse verified immutable reference libs."""
import pathlib,json,os,subprocess,hashlib,difflib
root=pathlib.Path(__file__).resolve().parents[1]
base=root/'build/local-screening/adaptation-reference'
reference=pathlib.Path(json.loads((base/'latest.json').read_text())['engine'])
manifest=json.loads((reference/'manifest.json').read_text())
out=root/'build/local-screening/adaptation-profile'
out.mkdir(exist_ok=False)
source=out/'native';(source/'remux').mkdir(parents=True);(source/'adaptation').mkdir()
(source/'remux/remux.c').write_bytes((root/'native/remux/remux.c').read_bytes())
original=(root/'native/adaptation/flac.h').read_text()
text=original.replace('static AVCodecContext *adapt_decoder', 'static double screen_staging_ms;\nstatic int64_t screen_staging_bytes,screen_staging_frames;\nstatic AVCodecContext *adapt_decoder')
text=text.replace('\n}\nstatic void adaptation_close', '\n EM_ASM({Object.assign(Module.adaptation,{screenProfile:1,stagingMs:$0,stagingBytes:$1,stagingFrames:$2});},screen_staging_ms,(double)screen_staging_bytes,(double)screen_staging_frames);\n}\nstatic void adaptation_close',1)
text=text.replace('adapt_first_pts=AV_NOPTS_VALUE;', 'screen_staging_ms=0;screen_staging_bytes=screen_staging_frames=0;adapt_first_pts=AV_NOPTS_VALUE;',1)
text=text.replace('  AVFrame *converted=av_frame_alloc();', '  double screen_begin=emscripten_get_now();\n  AVFrame *converted=av_frame_alloc();',1)
text=text.replace('  adapt_decoded_samples+=f->nb_samples;', '  screen_staging_ms+=emscripten_get_now()-screen_begin;screen_staging_bytes+=(int64_t)f->nb_samples*channels*bytes;screen_staging_frames++;\n  adapt_decoded_samples+=f->nb_samples;',1)
assert text.count('screen_begin')==2 and text.count('screenProfile')==1
(source/'adaptation/flac.h').write_text(text)
(out/'instrumentation.patch').write_text(''.join(difflib.unified_diff(original.splitlines(True),text.splitlines(True),fromfile='native/adaptation/flac.h',tofile='native/adaptation/flac.h')))
args=manifest['linkCommand'].copy()
args[args.index(str(root/'native/remux/remux.c'))]=str(source/'remux/remux.c')
args[-1]=str(out/'remux.mjs')
sdk=pathlib.Path('/Volumes/seed2/Projects/webmpv/build/emsdk-4.0.14')
env={**os.environ,'EM_CONFIG':str(base/'emscripten.config'),'PATH':str(sdk/'upstream/emscripten')+os.pathsep+os.environ['PATH']}
subprocess.run(args,cwd=root,env=env,check=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
(out/'profile-manifest.json').write_text(json.dumps({'reference':str(reference),'referenceManifestSHA256':sha(reference/'manifest.json'),'linkCommand':args,'files':{str(p):sha(p) for p in [source/'remux/remux.c',source/'adaptation/flac.h',out/'remux.mjs',out/'remux.wasm',out/'instrumentation.patch']},'scope':'Observer only; allocation, sample validation/copy and FIFO write upper bound; not an optimization candidate'},indent=2)+'\n')
print(out)
