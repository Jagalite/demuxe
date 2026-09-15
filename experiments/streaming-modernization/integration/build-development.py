#!/usr/bin/env python3
"""Rebuild isolated mpv/bridges with identical pinned dependency libraries.
Not a clean engine build, source-release record, or release qualification.
"""
import argparse,hashlib,json,os,shutil,subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--built',type=Path,required=True);p.add_argument('--work',type=Path,required=True);a=p.parse_args()
built=a.built.resolve();work=a.work.resolve();out=work/'build';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if (out/'sources').exists() or (out/'development-build.json').exists():raise SystemExit('Use a fresh prepared snapshot')
assert sha(built/'sources.lock.json')==sha(work/'sources.lock.json')
def ff_patches(r):return {p.name:sha(p) for p in (r/'patches/ffmpeg').glob('*.patch')}
assert ff_patches(built)==ff_patches(work),'Dependency source changes require their own rebuild'
values={};exec((built/'build/beta.emscripten').read_text(),values);sdk=Path(values['EMSCRIPTEN_ROOT']).parents[1]
venv=Path('/Volumes/seed2/Projects/deplexr/build/beta3-rc4-clean/build/venv')
env=dict(os.environ,EM_CONFIG=str(built/'build/beta.emscripten'),WEBMPV_EM_CONFIG=str(built/'build/beta.emscripten'),DEMUXE_SDK=str(sdk),DEMUXE_DECODER_SIMD='1',PKG_CONFIG_LIBDIR=str(built/'build/prefix/lib/pkgconfig'),PKG_CONFIG_PATH=str(built/'build/prefix/lib/pkgconfig'),GIT_CEILING_DIRECTORIES=str(out/'sources'))
env['PATH']=str(venv/'bin')+':'+str(Path(values['EMSCRIPTEN_ROOT']))+':'+str(sdk)+':'+env['PATH'];env['EM_PKG_CONFIG_PATH']=env['PKG_CONFIG_LIBDIR']
record={'scope':__doc__,'freshNativeBuild':False,'releaseQualified':False,'built':str(built),'work':str(work),'commands':[],'reused':{}}
def run(cmd,log,cwd=work):
 record['commands'].append({'command':cmd,'cwd':str(cwd)})
 with (out/log).open('w') as f:subprocess.run(cmd,cwd=cwd,env=env,stdout=f,stderr=subprocess.STDOUT,check=True)
try:
 for path in [*sorted((built/'build/prefix/lib').glob('*.a')),*sorted((built/'build/obj-software-full-ffmpeg').glob('*/*.a')),*sorted((built/'build/prefix-playback/lib').glob('*.a'))]:record['reused'][str(path)]=sha(path)
 source=out/'sources/mpv';shutil.copytree(built/'build/sources/mpv',source)
 (out/'sources/ffmpeg').symlink_to(built/'build/sources/ffmpeg',target_is_directory=True)
 for name in ['0018-demuxe-live-components.patch','0017-demuxe-presented-quality.patch','0016-demuxe-adaptive-session.patch']:
  if (built/'patches'/name).exists():run(['patch','--batch','--fuzz=0','-R','-p1','-i',str(built/'patches'/name)],'reverse-'+name+'.log',source)
 for name in ['0016-demuxe-adaptive-session.patch','0017-demuxe-presented-quality.patch','0018-demuxe-live-components.patch']:
  if (work/'patches'/name).exists():run(['patch','--batch','--fuzz=0','-p1','-i',str(work/'patches'/name)],name+'.log',source)
 for name in ['prefix','prefix-playback','obj-software-full-ffmpeg']:(out/name).symlink_to(built/'build'/name,target_is_directory=True)
 (work/'node_modules').symlink_to((built/'node_modules').resolve(),target_is_directory=True)
 cross=(built/'build/cross.ini').read_text().replace(str(built),str(work))
 own_map=repr('-ffile-prefix-map='+str(work)+'=/demuxe')
 reused_map=repr('-ffile-prefix-map='+str(built)+'=/demuxe')
 cross=cross.replace(own_map,own_map+', '+reused_map)
 (out/'cross.ini').write_text(cross)
 run(['meson','setup','build/obj-mpv','build/sources/mpv','--cross-file','build/cross.ini','--prefix',str(out/'development-prefix'),'--libdir','lib','--default-library','static','--buildtype','release','--wrap-mode','nofallback','-Dauto_features=disabled','-Dlibmpv=true','-Dcplayer=false','-Dgl=disabled','-Dlua=disabled','-Dbuild-date=false','-Dzlib=enabled'],'mpv-configure.log')
 run(['python3','scripts/normalize-build-paths.py','build/obj-mpv/config.h'],'normalize.log')
 run(['ninja','-C','build/obj-mpv','-j','2'],'mpv-compile.log')
 run(['python3','experiments/retained-subtitles/compile-hook.py'],'retained-vo.log');run(['python3','scripts/compile-software-vo.py'],'software-vo.log')
 for kind in ['hybrid','software-full']:
  if kind=='hybrid':s=(work/'scripts/link-hybrid.sh').read_text()
  else:
   s=(work/'experiments/software-full/build.sh').read_text();start=s.index('# Do not install over the accepted prefix.');s=s[:s.index('OBJ="$ROOT/build/obj-software-full-ffmpeg"')]+'OBJ="$ROOT/build/obj-software-full-ffmpeg"\nmkdir -p web/engine-software-full\n'+s[start:];s=s.replace('python3 scripts/compile-software-vo.py','').replace('python3 experiments/software-full/inventory.py','')
  start=s.index('ROOT=');end=s.index('\n',start);s=s[:start]+'ROOT='+repr(str(work))+s[end:]
  s=s.replace('done\nsource scripts/decoder-simd.sh','done\nfor i in "${!LIBS[@]}"; do if [ "${LIBS[$i]}" = -lmpv ]; then LIBS[$i]="$ROOT/build/obj-mpv/libmpv.a"; fi; done\nsource scripts/decoder-simd.sh')
  s=s.replace('"-ffile-prefix-map=$ROOT=/demuxe"', '"-ffile-prefix-map=$ROOT=/demuxe" '+repr('-ffile-prefix-map='+str(built)+'=/demuxe'))
  script=out/('development-'+kind+'.sh');script.write_text(s);run(['bash',str(script)],kind+'-link.log')
 for directory in ['engine-remux']:
  shutil.copytree(built/'web'/directory,work/'web'/directory,dirs_exist_ok=True)
 run(['npm','run','build'],'typescript.log')
 record['sources']={str(p.relative_to(work)):sha(p) for p in source.rglob('*') if p.is_file()}
 record['artifacts']={str(p.relative_to(work)):sha(p) for p in (work/'web').glob('engine-*/*') if p.suffix in ['.mjs','.wasm']}
 record['passed']=True
finally:
 record['driverSHA256']=sha(Path(__file__));(out/'development-build.json').write_text(json.dumps(record,indent=2)+'\n')
