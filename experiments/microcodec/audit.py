#!/usr/bin/env python3
import pathlib,json,re,subprocess,hashlib
r=pathlib.Path.cwd();rows=[]
for name in ['ac3-Oz','ac3-Os','ac3-O2','dts-Oz','flac-Oz','libflac-Oz']:
 p=r/'build/microcodec'/name;wat=p/'module.wat';subprocess.run([str(r/'build/emsdk-4.0.14/upstream/bin/wasm-dis'),str(p/'module.wasm'),'-o',str(wat)],check=True)
 w=wat.read_text();js=(p/'module.mjs').read_text();mapping=re.search(r'var wasmImports=\{([^}]+)\}',js)
 memory=[x.strip() for x in w.splitlines() if re.match(r'\s*\(memory ',x)]
 symbols=re.findall(r'\(import "([^"]+)" "([^"]+)"',w)
 assert not re.search(r'asyncify|JSPI|Suspending|promising\(',js+w,re.I)
 assert not re.search(r'\(memory[^\n]*shared',w)
 assert not any('pthread' in b for a,b in symbols)
 assert 'FS_create' not in js and 'FS.init' not in js
 cfg=(p/'config.h').read_text() if (p/'config.h').exists() else ''
 disabled={k:bool(re.search(r'#define '+('HAVE_' if k=='PTHREADS' else 'CONFIG_')+k+r' 0\b',cfg)) for k in ['PTHREADS','AVFORMAT','SWRESAMPLE','AVFILTER']}
 if cfg:assert all(disabled.values()),disabled
 rows.append({'name':name,'sha256':hashlib.sha256((p/'module.wasm').read_bytes()).hexdigest(),'memory':memory,'imports':symbols,'glueMapping':mapping.group(1) if mapping else None,'disabledLibraries':disabled if cfg else 'libFLAC only','noAsyncRuntime':True,'noSharedMemory':True,'filesystemEmulation':False})
(r/'results/microcodec/runtime-audit.json').write_text(json.dumps(rows,indent=2))
