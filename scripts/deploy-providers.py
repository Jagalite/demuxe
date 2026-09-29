#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Compose explicitly supplied installed packages into a fresh asset deployment.

No package discovery, installation, network access or qualification grant. Hash
and compatibility failures abort before output is created. Core and provider
package audits remain the release gate; this verifies installed runtime bytes.
"""
import argparse, hashlib, json
from pathlib import Path
from license_policy import encoded, sha

def relative_file(root, name):
    if not name or '\\' in name or any(p in ('','.','..') for p in name.split('/')):raise ValueError('Invalid installed package path')
    path=root
    for part in name.split('/'):
        path=path/part
        if path.is_symlink():raise ValueError('Symlink in installed package')
    if not path.is_file():raise ValueError('Missing installed package file: '+name)
    return path

def compose(core, providers, output):
    for root in [core,*providers]:
        if any(p.is_symlink() for p in [root,*root.parents]):raise ValueError('Symlinked installed package root')
    metadata=json.loads(relative_file(core,'package.json').read_bytes())
    if metadata['name']!='demuxe' or metadata.get('dependencies'):raise ValueError('Expected standalone Apache Player core')
    inventory=json.loads(relative_file(core,'license-map.json').read_bytes());files={}
    for name,licenses in inventory.items():
        if licenses!=['Apache-2.0']:raise ValueError('Non-Apache core package file')
        files[name]=relative_file(core,name).read_bytes()
    facts=[{'id':id,'implementationIdentity':'demuxe-browser-v1','technology':'browser-native','delivery':['browser','application-bundle'],'applicationBuild':'demuxe-'+metadata['version'],'offers':[{'capability':cap,'version':1,'profile':profile}]} for id,cap,profile in [('browser-original','media.present.original','selected-source'),('browser-prepared','media.present.prepared','selected-streams'),('web-audio-gain','audio.gain','scalar')]]
    assets={};ids={f['id'] for f in facts}
    for root in providers:
        package=json.loads(relative_file(root,'package.json').read_bytes());manifest=json.loads(relative_file(root,'provider-manifest.json').read_bytes())
        if manifest.get('providerContractVersion')!=1 or manifest.get('package')!=package['name'] or manifest.get('version')!=package['version'] or manifest.get('compatibleCore')!=metadata['version'] or package.get('peerDependencies',{}).get('demuxe')!=metadata['version']:raise ValueError('Incompatible provider package')
        artifacts=manifest['artifacts'];identity='sha256:'+sha(encoded(artifacts));deployed={}
        for name,digest in artifacts.items():
            if not name.startswith('runtime/'):raise ValueError('Provider artifact is outside runtime/')
            data=relative_file(root,name).read_bytes();path=name[len('runtime/'):]
            if sha(data)!=digest:raise ValueError('Installed provider artifact integrity mismatch: '+name)
            if path in files:raise ValueError('Runtime package collision: '+path)
            files[path]=data;deployed[path]=(digest,len(data))
        for asset in manifest['assets']:
            if asset['id'] in assets or deployed.get(asset['path'])!=(asset['sha256'],asset['bytes']):raise ValueError('Invalid provider asset declaration')
            assets[asset['id']]=asset
        if {a['path'] for a in manifest['assets']}!=set(deployed):raise ValueError('Incomplete provider asset inventory')
        for fact in manifest['provides']:
            if fact['id'] in ids or fact['implementationIdentity']!=identity or any(id not in assets for id in fact['assetIds']):raise ValueError('Invalid installed provider identity/closure')
            ids.add(fact['id']);facts.append(fact)
    manifest={'schema':1,'providerContractVersion':1,'revision':'sha256:'+sha(encoded({'providers':facts,'assets':list(assets.values())})),'providers':facts,'assets':list(assets.values())}
    files['demuxe-providers.json']=encoded(manifest)
    if output.exists():raise ValueError('Deployment output must not exist')
    output.mkdir(parents=True)
    for name,data in files.items():path=output/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
    return {'output':str(output),'providers':[f['id'] for f in facts],'files':len(files),'deploymentSHA256':sha(files['demuxe-providers.json'])}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--core',type=Path,required=True);p.add_argument('--provider',type=Path,action='append',default=[]);p.add_argument('--output',type=Path,required=True);a=p.parse_args();print(json.dumps(compose(a.core.absolute(),[x.absolute() for x in a.provider],a.output.absolute()),indent=2))
