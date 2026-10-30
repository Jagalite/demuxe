#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Compose explicitly supplied installed packages into a fresh asset deployment.

No package discovery, installation, network access or qualification grant. Hash
and compatibility failures abort before output is created. Core and provider
package audits remain the release gate; this verifies installed runtime bytes.
"""
import argparse, hashlib, json
from pathlib import Path
from license_policy import ROOT, encoded, sha

def relative_file(root, name):
    if not name or '\\' in name or any(p in ('','.','..') for p in name.split('/')):raise ValueError('Invalid installed package path')
    path=root
    for part in name.split('/'):
        path=path/part
        if path.is_symlink():raise ValueError('Symlink in installed package')
    if not path.is_file():raise ValueError('Missing installed package file: '+name)
    return path

def compose(core, providers, output, content_addressed_presenter=False, format_delivery=None, format_entries=(), format_source=None):
    for root in [core,*providers,*([format_delivery] if format_delivery else []),*([format_source] if format_source else [])]:
        if any(p.is_symlink() for p in [root,*root.parents]):raise ValueError('Symlinked installed package root')
    metadata=json.loads(relative_file(core,'package.json').read_bytes())
    if metadata['name']!='demuxe' or metadata.get('dependencies'):raise ValueError('Expected standalone Apache Player core')
    inventory=json.loads(relative_file(core,'license-map.json').read_bytes());files={}
    for name,licenses in inventory.items():
        if licenses!=['Apache-2.0']:raise ValueError('Non-Apache core package file')
        files[name]=relative_file(core,name).read_bytes()
    # Opt-in identity binds the complete installed core inventory, including the presenter.
    # Legacy deployments keep their existing browser provider identities.
    presenter_identity='sha256:'+sha(encoded({name:sha(data) for name,data in files.items()})) if content_addressed_presenter else 'demuxe-browser-v1'
    facts=[{'id':id,'implementationIdentity':presenter_identity if id=='browser-prepared' else 'demuxe-browser-v1','technology':'browser-native','delivery':['browser','application-bundle'],'applicationBuild':'demuxe-'+metadata['version'],'offers':[{'capability':cap,'version':1,'profile':profile}]} for id,cap,profile in [('browser-original','media.present.original','selected-source'),('browser-prepared','media.present.prepared','selected-streams'),('web-audio-gain','audio.gain','scalar')]]
    assets={};provider_paths=set();ids={f['id'] for f in facts}
    for root in providers:
        package=json.loads(relative_file(root,'package.json').read_bytes());manifest=json.loads(relative_file(root,'provider-manifest.json').read_bytes())
        if manifest.get('providerContractVersion')!=1 or manifest.get('package')!=package['name'] or manifest.get('version')!=package['version'] or manifest.get('compatibleCore')!=metadata['version'] or package.get('peerDependencies',{}).get('demuxe')!=metadata['version']:raise ValueError('Incompatible provider package')
        provider_licenses=json.loads(relative_file(root,'license-map.json').read_bytes())
        artifacts=manifest['artifacts'];identity='sha256:'+sha(encoded(artifacts));deployed={}
        for name,digest in artifacts.items():
            if not name.startswith('runtime/'):raise ValueError('Provider artifact is outside runtime/')
            data=relative_file(root,name).read_bytes();path=name[len('runtime/'):]
            if sha(data)!=digest:raise ValueError('Installed provider artifact integrity mismatch: '+name)
            shared_core=path.startswith('web/') and path.endswith(('.js','.mjs')) and inventory.get(path)==['Apache-2.0'] and provider_licenses.get(name)==['Apache-2.0']
            if path in files and (files[path]!=data or (not shared_core if path in inventory else path not in provider_paths)):raise ValueError('Runtime package collision: '+path)
            provider_paths.add(path)
            files[path]=data;deployed[path]=(digest,len(data))
        for asset in manifest['assets']:
            if (asset['id'] in assets and assets[asset['id']]!=asset) or deployed.get(asset['path'])!=(asset['sha256'],asset['bytes']):raise ValueError('Invalid provider asset declaration')
            assets[asset['id']]=asset
        if {a['path'] for a in manifest['assets']}!=set(deployed):raise ValueError('Incomplete provider asset inventory')
        for fact in manifest['provides']:
            if fact['id'] in ids or fact['implementationIdentity']!=identity or any(id not in assets for id in fact['assetIds']):raise ValueError('Invalid installed provider identity/closure')
            ids.add(fact['id']);facts.append(fact)
    # Inspector/preview adapters are application imports, not playback provider
    # registrations. Copy only explicitly requested self-contained candidates.
    allowed_formats={'inspect-mp4','inspect-webm','preview-mp4','preview-webm'}
    if len({bool(format_delivery),bool(format_entries),bool(format_source)})!=1:raise ValueError('Format delivery, selected entries and source must be supplied together')
    if len(format_entries)!=len(set(format_entries)) or set(format_entries)-allowed_formats:raise ValueError('Invalid or duplicate format entry')
    if format_delivery:
        with relative_file(format_delivery,'format-delivery.json').open('rb') as stream:report_bytes=stream.read(1024*1024+1)
        if len(report_bytes)>1024*1024:raise ValueError('Format report exceeds byte budget')
        report=json.loads(report_bytes)
        if report.get('status')!='format-delivery-build-checked-not-browser-qualification':raise ValueError('Invalid format delivery report')
        entries=report.get('entries')
        if not isinstance(entries,list) or any(not isinstance(entry,dict) for entry in entries):raise ValueError('Invalid format entry inventory')
        names=[entry.get('name') for entry in entries]
        if len(names)!=len(set(names)) or set(names)!=allowed_formats:raise ValueError('Unexpected format entry inventory')
        selected=[];selected_reports=[]
        for name in sorted(format_entries):
            entry=next(entry for entry in entries if entry['name']==name);path='web/providers/mediabunny/formats/'+name+'.js'
            source=relative_file(format_delivery,name+'.js')
            with source.open('rb') as stream:data=stream.read(16*1024*1024+1)
            if len(data)>16*1024*1024:raise ValueError('Format entry exceeds byte budget')
            if len(data)!=entry.get('bytes') or sha(data)!=entry.get('sha256'):raise ValueError('Format entry integrity mismatch: '+name)
            if path in files:raise ValueError('Runtime package collision: '+path)
            files[path]=data;selected.append({'name':name,'path':path,'bytes':len(data),'sha256':sha(data)});selected_reports.append(entry)
        from mediabunny_format_source import verify as verify_format_source
        source_identity=verify_format_source(format_source,report,selected_reports)
        notice_inputs={
            'Apache-2.0.txt':(ROOT/'LICENSES/Apache-2.0.txt').read_bytes(),
            'MPL-2.0.txt':(ROOT/'packages/provider-mediabunny/source-build/mediabunny/LICENSE').read_bytes(),
            'NOTICE.txt':b'Demuxe adapter code: Apache-2.0. MediaBunny1.63.0: Copyright(c)2026-present Vanilagy and contributors; MPL-2.0. Original source notices remain in the bundles. Corresponding preferred source is provided separately by build.mjs; verify exact correspondence with test/rebuild-source.mjs and DEMUXE_FORMAT_DELIVERY. These artifacts remain candidates, not release qualification.\n',
        }
        notices=[]
        for name,expected in notice_inputs.items():
            with relative_file(format_delivery,name).open('rb') as stream:data=stream.read(128*1024+1)
            if data!=expected:raise ValueError('Format notice differs from retained source: '+name)
            path='web/providers/mediabunny/formats/'+name
            if path in files:raise ValueError('Format notice collision: '+path)
            files[path]=data;notices.append({'path':path,'bytes':len(data),'sha256':sha(data)})
        format_manifest='demuxe-mediabunny-format-assets.json'
        if format_manifest in files:raise ValueError('Format manifest collision')
        files[format_manifest]=encoded({'schema':1,'status':'candidate-not-qualified','entries':selected,'notices':notices,'source':source_identity})
    manifest={'schema':1,'providerContractVersion':1,'revision':'sha256:'+sha(encoded({'providers':facts,'assets':list(assets.values())})),'providers':facts,'assets':list(assets.values())}
    files['demuxe-providers.json']=encoded(manifest)
    if output.exists():raise ValueError('Deployment output must not exist')
    output.mkdir(parents=True)
    for name,data in files.items():path=output/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
    return {'output':str(output),'providers':[f['id'] for f in facts],'files':len(files),'deploymentSHA256':sha(files['demuxe-providers.json'])}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--core',type=Path,required=True);p.add_argument('--provider',type=Path,action='append',default=[]);p.add_argument('--output',type=Path,required=True);p.add_argument('--content-addressed-presenter',action='store_true',help='Bind browser-prepared identity to the complete installed core inventory; requires explicit qualification');p.add_argument('--format-delivery',type=Path,help='Format-specific adapter candidate directory');p.add_argument('--format-entry',action='append',default=[],choices=['inspect-mp4','inspect-webm','preview-mp4','preview-webm']);p.add_argument('--format-source',type=Path,help='Installed candidate containing the corresponding-source companion');a=p.parse_args();print(json.dumps(compose(a.core.absolute(),[x.absolute() for x in a.provider],a.output.absolute(),a.content_addressed_presenter,a.format_delivery.absolute() if a.format_delivery else None,a.format_entry,a.format_source.absolute() if a.format_source else None),indent=2))
