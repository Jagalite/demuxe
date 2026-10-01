#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Assemble an isolated atomic mpv source/package candidate from exact retained bytes.

Never builds native libraries or updates the public catalog. Requires a byte-exact
isolated replay, retains original records, and uses the ordinary package auditor
with a narrowly recorded private consolidated-layout override.
"""
import argparse, copy, gzip, hashlib, importlib.util, io, json, re, sys, tarfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import license_policy

def encoded(v): return (json.dumps(v, indent=2, sort_keys=True)+'\n').encode()
def sha(v): return hashlib.sha256(v).hexdigest()
def read(p):
    p=Path(p)
    if p.is_symlink() or not p.is_file(): raise ValueError('Missing/nonregular material: '+str(p))
    return p.read_bytes()
def write(root,name,data):
    p=root/name; p.parent.mkdir(parents=True,exist_ok=True); p.write_bytes(data)
def module(name,path):
    s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m

def archive(path, files):
    with path.open('xb') as raw, gzip.GzipFile(filename='',fileobj=raw,mode='wb',mtime=0) as gz:
        with tarfile.open(fileobj=gz,mode='w',format=tarfile.PAX_FORMAT) as t:
            for name,data in sorted(files.items()):
                f=tarfile.TarInfo(name);f.size=len(data);f.mode=0o644;f.mtime=0;t.addfile(f,io.BytesIO(data))

def load_source(path):
    files={};total=0
    with tarfile.open(path) as t:
        for f in t:
            n=PurePosixPath(f.name)
            if not f.isfile() or n.is_absolute() or '..' in n.parts or n.as_posix()!=f.name or f.name in files:raise ValueError('Unsafe source entry')
            total+=f.size
            if len(files)>=20000 or f.size>256*1024**2 or total>1024**3:raise ValueError('Source budget')
            files[f.name]=t.extractfile(f).read()
    manifest=json.loads(files.pop('source-manifest.json'))
    if {n:sha(d) for n,d in files.items()}!=manifest['files']:raise ValueError('Inherited source manifest mismatch')
    return files,manifest

def main():
    p=argparse.ArgumentParser(description=__doc__)
    for name in ['old-root','native','candidate','inherited-source','relink','output']:p.add_argument('--'+name,type=Path,required=True)
    a=p.parse_args();a.output.mkdir(parents=True,exist_ok=False)
    if sha(read(a.inherited_source))!='f6c03b6ab618566ec0b3f250071b8769bf6567aa9885a53f2f976f644dbcac95':raise ValueError('Unexpected inherited source identity')
    source,old_manifest=load_source(a.inherited_source)
    original_beta=source['engine-build.json'];engine=json.loads(original_beta)
    raw=read(a.native/'build-record.json');native=json.loads(raw);proof=json.loads(read(a.relink/'relink-proof.json'))
    if sha(raw)!='9aad5b5a62f05ed72e277c5aee1a23cf810828bf39f49f5179e1b37ead404302':raise ValueError('Unexpected original native record identity')
    if proof.get('librariesUnchanged') is not True:raise ValueError('Relink library snapshots differ')
    if proof.get('exitCode')!=0 or proof.get('nativeCodecLibrariesRebuilt') is not False or proof.get('originalRecordSHA256')!=sha(raw):raise ValueError('Unqualified relink proof')
    for n in ['player.mjs','player.wasm']:
        original=read(a.native/n);replayed=read(a.relink/n);expected=native['outputs'][n]
        if sha(original)!=expected['sha256'] or len(original)!=expected['bytes'] or original!=replayed or proof['outputs'][n].get('byteExact') is not True:raise ValueError('Relink output differs: '+n)
    for path,h in native['inputs'].items():
        if sha(read(path))!=h:raise ValueError('Original native input differs: '+path)
    # All baseline preferred/configuration/SDK/upstream bytes already passed the
    # retained manifest, and must also match the actual original engine record.
    for group,prefix in [('inputs','demuxe/'),('sdkSources','toolchain/emscripten/'),('configurations','build-materials/')]:
        for n,h in engine[group].items():
            if group=='configurations' and n in old_manifest['excludedConfigurations']:continue
            if sha(source[prefix+n])!=h:raise ValueError('Original preferred material differs: '+n)
    for n,h in engine['sources'].items():
        if sha(source['demuxe/build/downloads/'+n+'.tar.gz'])!=h:raise ValueError('Original archive differs: '+n)
    # Source-generator reconstruction is separate from codec compilation.
    generator=read(a.old_root/'scripts/build-unified-mpv.py')
    if sha(generator)!='f9aa89803b31b82a1f893fb57c111dc824dc877e321d85e20baa07257dc22b96':raise ValueError('Unexpected source generator identity')
    text=generator.decode()
    context={'root':a.old_root,'native':ROOT,'out':a.output/'reconstructed','record':{'inputs':{}},'hashlib':hashlib,'shutil':__import__('shutil'),'sdk':Path('/')}
    context['out'].mkdir()
    context['read']=lambda f:read(f).decode()
    def replace(s,b,c):
        if s.count(b)!=1:raise ValueError('Generator anchor differs')
        return s.replace(b,c)
    context['replace']=replace;context['run']=lambda *args:None;reconstructed={}
    def compile_source(suffix,s,name,extra=()):
        if s.encode()!=read(a.native/(name+'.c')):raise ValueError('Generated source differs: '+name)
        reconstructed[name]=sha(s.encode());return a.native/(name+'.o'),Path(name+'.o')
    context['compile_source']=compile_source
    exec(text[text.index('# Preserve the selective'):text.index('libs=shlex.split')],context)
    if read(context['out']/'mode.c')!=read(a.native/'mode.c'):raise ValueError('Generated mode source differs')
    reconstructed['mode']=sha(read(a.native/'mode.c'))
    for n in reconstructed:
        name='native/unified/'+n+'.c';data=read(a.native/(n+'.c'));source['demuxe/'+name]=data;engine['inputs'][name]=sha(data)
    for n in ['scripts/build-unified-mpv.py','scripts/prepare-unified-mpv-candidate.mjs']:
        data=read(a.old_root/n);source['demuxe/'+n]=data;source['application/'+n]=data;engine['inputs'][n]=sha(data)
    source['build-materials/unified/original-beta-record.json']=original_beta
    source['build-materials/unified/original-build-record.json']=raw
    source['build-materials/unified/relink-proof.json']=read(a.relink/'relink-proof.json')
    source['build-materials/unified/original-link.map']=read(a.native/'unified.map')
    source['build-materials/unified/relink.map']=read(a.relink/'unified.map')
    # Relink inputs are supplemental observations; no historical library-source
    # hash binding or clean dependency rebuild is inferred from their mtimes.
    libs=sorted(set(re.findall(r'(/[^\n()]+?\.a)\(',source['build-materials/unified/original-link.map'].decode())))
    if len(libs)!=25:raise ValueError('Unexpected linked archive closure')
    ledger={}
    for i,path in enumerate(libs):
        data=read(path)
        if proof['librarySHA256Before'].get(path)!=sha(data) or proof['librarySHA256After'].get(path)!=sha(data):raise ValueError('Relink library differs from replay: '+path)
        name=f'relink-materials/libraries/{i:02d}-{Path(path).name}';source[name]=data
        ledger[path]={'sha256':sha(data),'bytes':len(data),'archivePath':name,'originalRecordHashBound':native['inputs'].get(path)==sha(data),'evidence':'byte-exact-isolated-relink'}
    for n in ['vo.o','yuv.o','rgb.o','ao.o','buffer.o','emscripten.config.py']:
        source['relink-materials/generated/'+n]=read(a.native/n)
    source['build-materials/unified/library-observations.json']=encoded(ledger)
    payload=a.output/'payload';payload.mkdir()
    files={f.relative_to(a.candidate).as_posix():read(f) for f in a.candidate.rglob('*') if f.is_file()}
    for name in ['player.mjs','player.wasm']:
        if files['runtime/web/engine-mpv/'+name]!=read(a.native/name):raise ValueError('Candidate native engine differs: '+name)
    for role in ['hybrid','selective','software-full','software-yuv']:
        mode=0 if role=='software-full' else 1 if role=='software-yuv' else 2
        expected=("// SPDX-License-Identifier: Apache-2.0\nimport createEngine from '../engine-mpv/player.mjs';\nexport default async function(options){const engine=await createEngine(options);if(engine._web_set_render_mode("+str(mode)+")!==0)throw Error('Unified mpv mode initialization failed');return engine;}\n").encode()
        if files['runtime/web/engine-'+role+'/player.mjs']!=expected:raise ValueError('Candidate mode adapter differs: '+role)
    base=json.loads(read(a.old_root/'build/media-components/provider-mpv-final/build-inventory.json'))
    config=json.loads(read(ROOT/'licensing/provider-packages.json'));boundaries=json.loads(read(ROOT/'licensing/boundaries.json'))
    engines=['web/engine-mpv/player.mjs','web/engine-mpv/player.wasm']
    config['profiles']['mpv']['engines']=engines
    config['ownershipRules'].insert(0,{'owner':'mpv','paths':['web/engine-mpv/*','scripts/build-unified-mpv.py','scripts/prepare-unified-mpv-candidate.mjs']})
    boundaries['rules'].insert(0,{'license':'Apache-2.0','paths':['scripts/build-unified-mpv.py','scripts/prepare-unified-mpv-candidate.mjs']})
    boundaries['rules'].insert(0,{'license':'LGPL-2.1-or-later','paths':['web/engine-mpv/*']})
    metadata=json.loads(files['package.json']);metadata.pop('private',None);files['package.json']=encoded(metadata)
    shadow=a.output/'audit-root';shadow.mkdir()
    config_bytes=encoded(config);write(shadow,'licensing/provider-packages.json',config_bytes);write(shadow,'licensing/boundaries.json',encoded(boundaries))
    write(shadow,'packages/provider-mpv/package.json',files['package.json'])
    source['application/licensing/provider-packages.json']=config_bytes;source['application/licensing/boundaries.json']=encoded(boundaries)
    source['application/packages/provider-mpv/package.json']=files['package.json']
    # Bind this normalized engine to the same runtime identity as the historical
    # browser-tested candidate, without transferring that qualification to release.
    manifest=json.loads(files['provider-manifest.json']);engine['artifacts']={n:{'sha256':sha(files['runtime/'+n]),'bytes':len(files['runtime/'+n])} for n in engines}
    engine['unifiedCorrespondence']={'schema':1,'originalRecordSHA256':sha(raw),'inheritedSourceSHA256':sha(read(a.inherited_source)),'relinkProofSHA256':sha(read(a.relink/'relink-proof.json')),'relinkByteExact':True,'cleanDependencyRebuildQualified':False,'releaseQualified':False,'generatedSourceSHA256':reconstructed,'libraries':ledger,'historicalRuntimeIdentity':manifest['provides'][0]['implementationIdentity']}
    files['engine-build.json']=encoded(engine);source['engine-build.json']=files['engine-build.json']
    record={'schema':1,'target':'mpv','sources':{},'files':{},'engineBuildRecord':engine}
    for n,data in files.items():
        if n in ['engine-build.json','source-companion.json','license-map.json','provider-manifest.json']:
            item={'inputs':['licensing/provider-packages.json'],'kind':'metadata','licenses':['Apache-2.0']}
        elif n=='package.json':item={'inputs':['packages/provider-mpv/package.json'],'kind':'metadata','licenses':['Apache-2.0']}
        elif n=='LGPL-RELINK.md':
            source['application/docs/PROVIDER-RELINK.md']=data;item=copy.deepcopy(base['files'][n])
        elif n.startswith('runtime/web/engine-'):
            inp=n[8:] if n[8:] in engines else 'scripts/prepare-unified-mpv-candidate.mjs'
            item={'inputs':[inp],'kind':'code','licenses':json.loads(files['license-map.json'])[n]}
            if inp in engines:write(shadow,inp,data)
        else:
            item=copy.deepcopy(base['files'][n])
            if sha(data)!=item['sha256']:raise ValueError('Unexpected candidate artifact drift: '+n)
        item['sha256']=sha(data);record['files'][n]=item
        for inp in item['inputs']:
            if inp=='licensing/provider-packages.json':src=config_bytes
            elif inp=='packages/provider-mpv/package.json':src=files['package.json']
            elif inp in engines:src=files['runtime/'+inp]
            else:
                src=source.get('application/'+inp)
                expected=base['sources'].get(inp,{}).get('sha256')
                if n!='LGPL-RELINK.md' and inp not in ['scripts/prepare-unified-mpv-candidate.mjs'] and (src is None or sha(src)!=expected):
                    src=read(a.old_root/inp)
                    if sha(src)!=expected:raise ValueError('Missing exact application input: '+inp)
                source['application/'+inp]=src
            write(shadow,inp,src);record['sources'][inp]={'sha256':sha(src)}
    # Snapshot exact auditing implementation; only its root/profile input changes.
    for n in ['audit-provider-package.py','license_policy.py','audio_source_policy.py','package-provider.py','package-unified-mpv-source.py']:
        source['application/scripts/'+n]=read(ROOT/'scripts'/n)
    source['application/tests/unified-mpv-source-gate.py']=read(ROOT/'tests/unified-mpv-source-gate.py')
    source['source-manifest.json']=encoded({'schema':1,'engineBuildSHA256':sha(files['engine-build.json']),'excludedConfigurations':old_manifest['excludedConfigurations'],'files':{n:sha(d) for n,d in source.items()}})
    companion_path=a.output/'unified-mpv-source.tar.gz';archive(companion_path,source)
    companion={'schema':1,'qualification':'corresponding-source-audited-local-candidate','filename':companion_path.name,'repositoryPath':'unified-mpv-source.tar.gz','sha256':sha(read(companion_path)),'bytes':companion_path.stat().st_size,'files':len(source),'engineBuildSHA256':sha(files['engine-build.json'])}
    # The audit root is private, and supplies this exact source path to unmodified
    # audit code; no production profile/catalog is rewritten.
    import os
    os.link(companion_path,shadow/'unified-mpv-source.tar.gz')
    files['source-companion.json']=encoded(companion);record['sourceCompanion']=companion
    license_map={n:item['licenses'] for n,item in record['files'].items()};files['license-map.json']=encoded(license_map)
    for n,data in files.items():record['files'][n]['sha256']=sha(data);write(payload,n,data)
    write(a.output,'build-inventory.json',encoded(record));write(a.output,'private-layout-override.json',encoded({'scope':'local-candidate-only','engines':engines,'catalogSHA256':sha(config_bytes),'boundariesSHA256':sha(encoded(boundaries))}))
    auditor=module('unified_mpv_audit',ROOT/'scripts/audit-provider-package.py');auditor.ROOT=shadow;auditor.Policy=lambda:license_policy.Policy(shadow)
    packer=module('unified_mpv_packer',ROOT/'scripts/package-provider.py');packer.auditor=auditor
    result=packer.assemble('mpv',payload,record,a.output/'demuxe-provider-mpv-unified.tgz')
    result.update({'schema':1,'status':'PASS','qualification':'local-source-and-package-only','runtimeIdentity':manifest['provides'][0]['implementationIdentity'],'sourceCompanion':companion,'relinkByteExact':True,'releaseQualified':False,'cleanDependencyRebuildQualified':False,'originalCandidatePreserved':str(a.candidate),'originalSourceArchivePreserved':str(a.inherited_source),'originalNativeRecordSHA256':sha(raw),'buildInventorySHA256':sha(encoded(record)),'privateLayoutOverrideSHA256':sha(read(a.output/'private-layout-override.json'))})
    write(a.output,'result.json',encoded(result));print(json.dumps(result,indent=2))

if __name__=='__main__':main()
