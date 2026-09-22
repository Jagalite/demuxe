# SPDX-License-Identifier: Apache-2.0
"""Derive immutable lab assets, preserving parent and optional renderer provenance."""
import hashlib,json,pathlib,shutil,sys
base,runtime,out=map(pathlib.Path,sys.argv[1:])
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
m=json.loads((base/'manifest.json').read_text())
for name,r in m['files'].items():
 assert sha(base/name)==r['sha256'],name
assert not out.exists()
shutil.copytree(base,out)
for name in ['subtitles.mjs','subtitles.wasm']:
 dest=out/'demuxe/web/engine-ass'/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(runtime/name,dest)
shutil.copy2(runtime/'manifest.json',out/'preparation/component-ass-link-manifest.json')
shutil.copy2(__file__,out/'preparation/prepare-component-study.py')
# Native ASS resolves the default font relative to its Demuxe asset base.
(out/'demuxe/fixtures').mkdir(exist_ok=True)
shutil.copy2(out/'fixtures/DejaVuSans.ttf',out/'demuxe/fixtures/DejaVuSans.ttf')
c=json.loads((out/'fixtures/catalogue.json').read_text())
c['pcm-ass']={'label':'H.264 + PCM24 / MKV + external ASS','file':'pcm.mkv','video':True,'audio':True,'channels':2,'subtitleIntegration':'built-in','subtitleCheck':'ass'}
(out/'fixtures/catalogue.json').write_text(json.dumps(c,indent=2)+'\n')
m['component_study']={'parent':str(base.resolve()),'parent_manifest_sha256':sha(base/'manifest.json'),'optional_ass_link_manifest_sha256':sha(runtime/'manifest.json'),'scope':'Explicit lab substitutions only; automatic production routing unchanged.'}
m['engines']['engine-ass']=True
for p in out.rglob('*'):
 if p.is_file() and p.name!='manifest.json':
  name=str(p.relative_to(out));m['files'][name]={'sha256':sha(p),'bytes':p.stat().st_size}
(out/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
print(out)
