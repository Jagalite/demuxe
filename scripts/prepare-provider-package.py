#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Prepare and audit current pthread provider packages from an exact native record.

This produces local candidates, never installs, publishes or grants qualification.
"""
import argparse, importlib.util, json, subprocess
from pathlib import Path
from license_policy import ROOT, Policy, encoded, sha
from audio_source_policy import verify_audio_engine_source

def module(name,file):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/file);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m

package=module('provider_package','package-provider.py')

def assemble(target,engine_path,companion_path,output):
    config=json.loads((ROOT/'licensing/provider-packages.json').read_bytes());spec=config['targets'][target];profile=config['profiles'][target];policy=Policy()
    native=spec.get('native',True)
    if native and (not engine_path or not companion_path):raise ValueError('Native provider requires matching build and source records')
    engine=json.loads(engine_path.read_bytes()) if native else None;companion=json.loads(companion_path.read_bytes()) if native else None
    if native:verify_audio_engine_source(target,engine)
    outputs=json.loads(subprocess.check_output(['node','scripts/'+profile.get('compiler','compile-provider-sources.mjs'),target],cwd=ROOT))
    files={};record={'schema':1,'target':target,'files':{},'sources':{},'engineBuildRecord':engine,'sourceCompanion':companion}
    if profile.get('runtimePin'):
        pin=profile['runtimePin'];digest=sha((ROOT/pin).read_bytes())
        record['runtimePin']={'path':pin,'sha256':digest}
        record['sources'][pin]={'sha256':digest}
    def add(name,data,inputs,kind='code',licenses=None):
        licenses=licenses or sorted(set(policy.classify(p) for p in inputs));files[name]=data
        record['files'][name]={'sha256':sha(data),'inputs':inputs,'kind':kind,'licenses':licenses}
        for p in inputs:record['sources'][p]={'sha256':sha((ROOT/p).read_bytes())}
    for name in profile['files']+profile['engines']:
        source=profile.get('fileOverrides',{}).get(name,name)
        data=(ROOT/source).read_bytes()
        if name in profile['engines'] and engine['artifacts'].get(name,{}).get('sha256')!=sha(data):raise ValueError('Engine differs from native build: '+name)
        add('runtime/'+(profile.get('runtimePrefix','')+name[len('web/'):] if profile.get('runtimePrefix') and name not in profile['engines'] else name),data,[source],kind='code' if name.endswith(('.js','.mjs','.wasm')) else 'asset',licenses=profile.get('engineLicenses',['Apache-2.0','LGPL-2.1-or-later','MIT','LicenseRef-Native-Dependencies']) if name in profile['engines'] else None)
    for name,item in outputs.items():add('runtime/'+(profile.get('runtimePrefix','')+name[len('web/'):] if profile.get('runtimePrefix') else name),item['data'].encode(),item['inputs'])
    template=spec['template'];metadata=json.loads((ROOT/template).read_bytes());metadata.pop('private');metadata.pop('scripts')
    add('package.json',encoded(metadata),[template],'metadata',['Apache-2.0'])
    for name in spec['requiredFiles']:
        notice=config['retainedNotices'].get(name)
        if notice:add(name,(ROOT/notice['source']).read_bytes(),[notice['source']],'notice',[notice['license']])
    if native:
        source_doc=spec.get('sourceDocument',{'name':'LGPL-RELINK.md','source':'docs/PROVIDER-RELINK.md'})
        add(source_doc['name'],(ROOT/source_doc['source']).read_bytes(),[source_doc['source']],'documentation')
    # Fixed entry source is intentionally inert: importing npm providers does not
    # instantiate or fetch engines. Deployment is an explicit assembly operation.
    for name in ['index.js','index.d.ts']:add('dist/'+name,(ROOT/f'packages/provider-{target}'/name).read_bytes(),[f'packages/provider-{target}/'+name])
    artifacts={name:sha(data) for name,data in files.items() if name.startswith('runtime/')}
    identity='sha256:'+sha(encoded(artifacts))
    descriptions=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {MEDIA_PROVIDERS} from './web/generated/internal/media-providers.js';console.log(JSON.stringify(MEDIA_PROVIDERS));"],cwd=ROOT))
    asset_graph={'roots':[p[len('runtime/'):] for p in artifacts],'dependencies':{}}
    if target=='container' or profile.get('assetGraph',False):
        asset_graph=json.loads(subprocess.check_output(['node','scripts/provider-asset-graph.mjs'],input=json.dumps({'files':{p[len('runtime/'):]:files[p].decode() if p.endswith(('.js','.mjs')) else '' for p in artifacts},'computedImports':profile.get('computedImports',[])}).encode(),cwd=ROOT))
    providers=[]
    for id in profile['providers']:
        d=profile.get('descriptors',{}).get(id) or descriptions[id];offers=d['provides']
        if target=='ffmpeg':offers=[o for o in offers if o['profile'] in ['packet-copy','video-only']]
        providers.append({'id':id,'implementationIdentity':identity,'technology':d['technology'],'delivery':list(d['delivery']),'applicationBuild':identity,'offers':offers,'packageName':spec['npmName'],'assetIds':asset_graph['roots']})
    manifest={'schema':1,'providerContractVersion':1,'package':spec['npmName'],'version':metadata['version'],'compatibleCore':metadata['peerDependencies']['demuxe'],'provides':providers,'artifacts':artifacts,'assets':[{'id':p[len('runtime/'):],'path':p[len('runtime/'):],'sha256':digest,'bytes':len(files[p]),'dependencies':asset_graph['dependencies'].get(p[len('runtime/'):],[])} for p,digest in artifacts.items()]}
    for name,value in [('provider-manifest.json',manifest)]+([('engine-build.json',engine),('source-companion.json',companion)] if native else []):add(name,encoded(value),['licensing/provider-packages.json'],'metadata',['Apache-2.0'])
    add('license-map.json',encoded({name:item['licenses'] for name,item in record['files'].items()}|{'license-map.json':['Apache-2.0']}),['licensing/provider-packages.json'],'metadata',['Apache-2.0'])
    output.mkdir(parents=True,exist_ok=True);payload=output/'payload'
    for name,data in files.items():p=payload/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
    record_path=output/'build-inventory.json';record_path.write_bytes(encoded(record))
    result=package.assemble(target,payload,record,output/f'demuxe-provider-{target}-{metadata["version"]}.tgz')
    result.update({'record':str(record_path),'recordSHA256':sha(record_path.read_bytes()),'implementationIdentity':identity,'qualification':'candidate-not-published'})
    (output/'assembly.json').write_bytes(encoded(result));print(json.dumps(result,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--target',choices=list(json.loads((ROOT/'licensing/provider-packages.json').read_bytes())['profiles']),required=True);p.add_argument('--engine-record',type=Path);p.add_argument('--source-companion',type=Path);p.add_argument('--output',type=Path,required=True);a=p.parse_args();assemble(a.target,a.engine_record,a.source_companion,a.output.absolute())
