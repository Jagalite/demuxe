# SPDX-License-Identifier: Apache-2.0
"""Strict, explicitly reduced developer-beta evidence; never emits full verification."""
import ast
import subprocess
import hashlib
import importlib.util
import json
from pathlib import Path, PurePosixPath
import re
import tarfile

ROOT = Path(__file__).resolve().parents[1]
DEFERRED = {'complete-readme-catalogue', 'full-optional-runtime-matrix', 'full-streaming-shaka-matrix', 'cpu-performance', 'long-duration-physical-av'}
ROWS = {**{f'component-{b}': 60 for b in ('chrome','firefox','webkit')},
        **{f'keyboard-{b}': 36 for b in ('chrome','firefox','webkit')},
        **{f'timeline-{b}': 1 for b in ('chrome','firefox','webkit')},
        'local-three': 9, 'consumer-chrome': 8, 'consumer-firefox': 8,
        'copy-assets': 11, 'audio-tail-firefox': 1, 'audio-tail-chrome': 1}

def require(value, message):
    if not value:
        raise ValueError(message)

def digest(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def asset(directory, name):
    require(isinstance(name, str) and name not in ('', '.', '..') and PurePosixPath(name).name == name and '\\' not in name, 'Unsafe asset name')
    path = directory / name
    require(path.is_file() and not path.is_symlink(), 'Missing regular asset: ' + name)
    return path

def bound(directory, entry):
    path = asset(directory, entry['file'])
    require(re.fullmatch('[0-9a-f]{64}', entry.get('sha256', '')) and digest(path) == entry['sha256'], 'Evidence/archive hash mismatch: ' + path.name)
    return path

def inventory(archive):
    result = {}
    for member in archive:
        name = PurePosixPath(member.name)
        require(not name.is_absolute() and '..' not in name.parts and str(name) == member.name.rstrip('/'), 'Unsafe archive path')
        require(member.name not in result, 'Duplicate archive member')
        require(member.isfile() or member.isdir(), 'Archive link/special member')
        result[member.name] = None if member.isdir() else hashlib.file_digest(archive.extractfile(member), 'sha256').hexdigest()
    return {name: value for name, value in result.items() if value is not None}

def read(archive, name):
    member = archive.getmember(name)
    require(member.isfile(), 'Nonregular JSON archive member')
    return json.load(archive.extractfile(member))

def tracked_source(commit):
    require(subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()==commit, 'Validator checkout differs from commit')
    preserved=set(json.loads((ROOT/'licensing/boundaries.json').read_text())['preservedFiles'])
    rows=subprocess.check_output(['git','ls-tree','-rz','--full-tree',commit],cwd=ROOT).split(b'\0')
    names=[]
    for row in filter(None,rows):
        meta,name=row.split(b'\t',1);name=name.decode()
        if name.startswith('results/') and name not in preserved:continue
        if meta.split()[1]==b'commit':continue # Source packager omits submodule directories.
        require(meta.split()[1]==b'blob', 'Unsupported tracked source entry')
        names.append(name)
    result={}
    # One persistent process, one bounded blob at a time; never buffer the
    # historical results tree or the entire corresponding-source content.
    with subprocess.Popen(['git','cat-file','--batch'],cwd=ROOT,stdin=subprocess.PIPE,stdout=subprocess.PIPE) as process:
        for name in names:
            process.stdin.write((commit+':'+name+'\n').encode());process.stdin.flush()
            header=process.stdout.readline().split();require(len(header)==3 and header[1]==b'blob','Missing tagged source blob')
            remaining=int(header[2]);h=hashlib.sha256()
            while remaining:
                chunk=process.stdout.read(min(remaining,1024*1024));require(chunk,'Truncated Git blob');h.update(chunk);remaining-=len(chunk)
            require(process.stdout.read(1)==b'\n','Invalid Git blob boundary');result[name]=h.hexdigest()
        process.stdin.close();require(process.wait()==0,'Tagged source reader failed')
    return result

def validate_evidence(directory, record, runtime_hash, source_files, runtime_files, component_names):
    gate = json.loads(bound(directory, record['gate']).read_text())
    bindings = json.loads(bound(directory, record['bindings']).read_text())
    require(gate.get('sourceCommit') == record['sourceCommit'], 'Gate commit mismatch')
    require(gate.get('completed') is True and gate.get('passed') is True and gate.get('fullReleaseQualified') is False, 'Incomplete reduced gate')
    require(all(gate.get(k) is True for k in ('runtimeUnchanged','archiveUnchanged','sourceUnchanged')), 'Gate preservation failed')
    require(bindings.get('archiveSHA256') == runtime_hash, 'Gate archive mismatch')
    require(bindings.get('runtimeFiles')==runtime_files, 'Gate runtime inventory mismatch')
    rows = gate.get('rows', [])
    require(len(rows) == len(ROWS) and {r.get('label') for r in rows} == set(ROWS), 'Wrong reduced gate rows')
    entries = record.get('evidenceFiles', [])
    require(len({e['originalPath'] for e in entries}) == len(entries) and len({e['file'] for e in entries}) == len(entries), 'Duplicate evidence mapping')
    evidence = {e['originalPath']: (bound(directory,e), e['sha256']) for e in entries}
    used = set()
    def lookup(original, expected):
        require(original in evidence and evidence[original][1] == expected, 'Missing bound gate evidence')
        used.add(original)
        return evidence[original][0]
    for row in rows:
        label = row['label']
        require(row.get('passed') is True and row.get('exitCode') == 0 and row.get('expectedCount') == ROWS[label] and not row.get('failure') and not row.get('cleanupUnverified'), 'Failed reduced row: ' + label)
        log = lookup(str(PurePosixPath(record['gateOriginalDirectory']) / (label+'.log')), row['logSHA256']).read_text()
        require('\nRETRY ' not in '\n'+log, 'Retry not admitted')
        reports = row.get('reports', [])
        if label.startswith('timeline-'):
            require(not reports and re.search(r'^PASS '+label[9:]+r' .*: 32 timeline clicks match hover targets.*real playback reaches the displayed target$',log,re.M), 'Incomplete timeline proof')
            continue
        if label == 'copy-assets':
            require(not reports and all(re.search(r'^# '+pattern+r'$',log,re.M) for pattern in ('tests 11','pass 11','fail 0')), 'Incomplete CLI proof')
            continue
        require(len(reports) == 1, 'Expected one terminal row report')
        report = json.loads(lookup(reports[0]['path'], reports[0]['sha256']).read_text())
        if label == 'local-three':
            require(report.get('passed') is True and report.get('completedCases') == 9 and [b['family'] for b in report.get('browsers',[])] == ['chrome','firefox','webkit'], 'Incomplete local player report')
            require(all(b.get('passed') is True and len(b.get('checks',[])) == 3 and all(c.get('passed') is True for c in b['checks']) and [c.get('mode') for c in b['checks']]==['native','hybrid','software'] and not b.get('errors') for b in report['browsers']), 'Failed local player case')
        elif label.startswith('audio-tail-'):
            checks=report.get('cases',[])
            require(len(checks)==1 and checks[0].get('name')=='audio-tail' and checks[0].get('passed') is True, 'Incomplete audio-tail report')
        else:
            checks=report.get('checks',[])
            require(report.get('passed') is True and len(checks)==ROWS[label] and all(c.get('passed') is True for c in checks), 'Incomplete component/consumer report')
            require(report.get('family')==label.split('-',1)[1], 'Report browser mismatch')
            if label.startswith('keyboard-'):
                expected=[(kind,key) for kind in ('playing','paused') for key in ['ArrowLeft','ArrowRight','j','l','Home','End',*'0123456789']]+[(kind,'ArrowRight') for kind in ('drag','volume','timeline','menu')]
                require(report.get('expectedCases')==36 and [(c.get('kind'),c.get('key')) for c in checks]==expected and not report.get('pageErrors') and not report.get('error') and not report.get('cleanupError'), 'Wrong keyboard case set')
            else:
                require(len({c['name'] for c in checks})==len(checks), 'Duplicate case')
                if label.startswith('component-'):require([c['name'] for c in checks]==component_names, 'Wrong component case set')
            if label.startswith('consumer-'):
                expected=['static core-only import has no UI or engine side effects','bundled core-only import has no UI or engine side effects']+[f'{bundle} application at {base}' for bundle in ('static','bundled') for base in ('/assets/demuxe/','/deep/runtime-v2/')]+['missing assets have structured errors','runtime policy separates private qualification from pthread isolation']
                require([c['name'] for c in checks]==expected,'Wrong consumer case set')
                require(report.get('archiveSHA256')==runtime_hash and all(not c.get('attempts') for c in checks), 'Consumer archive/retry mismatch')
    require(used==set(evidence), 'Unreferenced evidence asset')
    harness=bindings.get('harnessSourceFixtures',{});cwd=gate['cwd'].rstrip('/')+'/'
    for name, value in source_files.items():
        if name.startswith(('demuxe/tests/','demuxe/scripts/','demuxe/src/','demuxe/web/generated/','demuxe/examples/')) or name in {'demuxe/web/player.html','demuxe/web/player-demo.js','demuxe/web/player.css','demuxe/web/player-geometry.js'}:
            require(harness.get(cwd+name[len('demuxe/'):])==value, 'Harness differs from tagged source: '+name)
    controller=bound(directory,record['gateController'])
    require(any(p.endswith('/run.py') and value==digest(controller) for p,value in harness.items()), 'Unbound gate controller')
    return gate, bindings

def package_metadata(project, licenses):
    # Exact generated npm metadata policy from maintained package-beta.py.
    package={'name':project['name'],'version':project['version'],'license':'Apache-2.0','demuxeLicenses':licenses,'type':'module','main':'./index.js','types':'./index.d.ts','exports':{'.':{'types':'./index.d.ts','import':'./index.js'},'./player':{'types':'./player.d.ts','import':'./player.js'},'./release-manifest.json':'./release-manifest.json'},'bin':{project['name']:'./bin/demuxe.mjs'},'description':'Browser media compatibility runtime: Native, Hybrid, Software'}
    package.update({key:project[key] for key in ['description','repository','bugs','homepage','keywords']})
    for name,entry in project['exports'].items():
        if name not in ('.','./player'):package['exports'][name]=entry
    package['exports']['./package.json']='./package.json'
    return package

def validate(directory, tag, commit):
    directory=Path(directory)
    require(re.fullmatch(r'reduced-v\d+\.\d+\.\d+-[0-9A-Za-z.-]+',tag), 'Reduced receipt requires reduced prerelease tag')
    require(re.fullmatch('[0-9a-f]{40}',commit), 'Invalid commit')
    require(not (directory/'verification.json').exists(), 'Do not mix reduced and full qualification records')
    record=json.loads(asset(directory,'reduced-qualification.json').read_text())
    require(record.get('schema')==1 and record.get('status')=='reduced-developer-beta-tested' and record.get('fullReleaseQualified') is False, 'Wrong reduced qualification status')
    require(all(record[key]['file'].startswith('reduced-') for key in ('gate','bindings','gateController','releaseNotes','installedManifest','nativeCorrespondence')) and all(e['file'].startswith('reduced-') for e in record.get('evidenceFiles',[])), 'Evidence assets require reduced- prefix')
    asset_names=[record[k]['file'] for k in ('runtime','source','gate','bindings','gateController','releaseNotes','installedManifest','nativeCorrespondence')]+[e['file'] for e in record.get('evidenceFiles',[])]
    require(len(asset_names)==len(set(asset_names)),'Colliding release asset roles')
    require(record.get('sourceTag')==tag and record.get('sourceCommit')==commit, 'Reduced source identity mismatch')
    require(set(record.get('deferredSuites',[]))==DEFERRED and len(record['deferredSuites'])==len(DEFERRED), 'Incomplete deferred scope')
    accepted=record.get('acceptedFindings',[])
    require(len(accepted)==1 and accepted[0].get('id')=='chrome-worker-teardown-historical' and accepted[0].get('status')=='accepted-unresolved' and bool(accepted[0].get('authorization')) and bool(accepted[0].get('limitation')), 'Missing accepted historical uncertainty')
    runtime=bound(directory,record['runtime']);source=bound(directory,record['source'])
    notes=bound(directory,record['releaseNotes']).read_text()
    require('reduced' in notes.lower() and 'unresolved' in notes.lower(), 'Release notes omit reduced scope/uncertainty')
    with tarfile.open(runtime) as tar:
        actual=inventory(tar);package=read(tar,'package/package.json');manifest=read(tar,'package/release-manifest.json');build=read(tar,'package/engine-build.json')
        version=package.get('version','');optional_manifests={}
        entrypoints={name:tar.extractfile('package/'+name).read() for name in ('index.js','index.d.ts','player.js','player.d.ts') if 'package/'+name in actual}
        require(package.get('name')=='demuxe' and not package.get('private') and re.fullmatch(r'\d+\.\d+\.\d+-[0-9A-Za-z.-]+',version), 'Wrong/private/stable package')
        require(tag.startswith('reduced-v'+version+'-rc.') and manifest.get('version')==version and manifest.get('sourceCommit')==commit and manifest.get('sourceTag')==tag and manifest.get('dirtySource') is False, 'Runtime source/tag/version mismatch')
        require(manifest['sourceArchive']['filename']==source.name and manifest['sourceArchive']['sha256']==record['source']['sha256'] and manifest['sourceArchive']['bytes']==source.stat().st_size, 'Source companion mismatch')
        require(set(actual)=={'package/'+n for n in manifest['files']}|{'package/release-manifest.json'}, 'Runtime inventory mismatch')
        for name,fact in manifest['files'].items():
            require(actual['package/'+name]==fact['sha256'] and tar.getmember('package/'+name).size==fact['bytes'], 'Runtime file mismatch: '+name)
            if name.startswith('web/engine-') and name.endswith('/manifest.json'):
                optional=read(tar,'package/'+name);optional_manifests[name]=optional
                if 'sourceCompanion' in optional:
                    require(optional.get('sourceBuildVerification',{}).get('verified') is True, 'Optional source not verified')
                    companion=optional['sourceCompanion'];require(digest(asset(directory,companion['filename']))==companion['sha256'], 'Optional companion mismatch')
        require(len(build['inputs'])==263, 'Unexpected native input inventory')
        for name,fact in build['artifacts'].items():
            require(actual.get('package/'+name)==fact['sha256'] and tar.getmember('package/'+name).size==fact['bytes'], 'Native artifact differs from build record: '+name)
        if any('/engine-remux-jspi/' in n for n in manifest['files']):
            from private_remux_assets import verify_private_release, verify_private_mpv_release
            engines={n:tar.extractfile('package/'+n).read() for n in manifest['files'] if n.startswith('web/engine-')}
            verify_private_release(engines,build);verify_private_mpv_release(engines,build)
    with tarfile.open(source) as tar:
        actual_source=inventory(tar);source_manifest=read(tar,'source-manifest.json')
        require(source_manifest.get('sourceCommit')==commit and source_manifest.get('sourceTag')==tag, 'Source archive revision mismatch')
        source_files=source_manifest['files'];require(actual_source=={**source_files,'source-manifest.json':actual_source['source-manifest.json']}, 'Source inventory/hash mismatch')
        project=read(tar,'demuxe/package.json')
        from license_policy import Policy
        require(package==package_metadata(project,Policy(ROOT).config['packageLicenses']),'Published package metadata differs from standard tagged package policy')
        tagged=tracked_source(commit)
        for name,value in tagged.items():
            if not name.startswith('results/') or 'demuxe/'+name in source_files:
                require(source_files.get('demuxe/'+name)==value,'Source differs from tagged tree: '+name)
        for name in source_files:
            if name.startswith('demuxe/') and not name.startswith('demuxe/build/downloads/'):
                require(name[len('demuxe/'):] in tagged,'Untagged source content: '+name)
        component_text=tar.extractfile('demuxe/tests/player-component.mjs').read().decode()
        component_names=[ast.literal_eval(value) for value in re.findall(r"await check\(('(?:[^'\\]|\\.)*')",component_text)]
        require(record['releaseNotes']['sha256']==source_files.get('demuxe/docs/release-candidates/'+version+'.md'),'Release notes differ from tagged candidate document')
        require(len(component_names)==60 and len(set(component_names))==60,'Unexpected tagged component suite')
        for name,value in build['inputs'].items():require(source_files.get('demuxe/'+name)==value, 'Native input mismatch: '+name)
        for name,value in build['sdkSources'].items():require(source_files.get('toolchain/emscripten/'+name)==value, 'SDK source mismatch')
        for name,value in build['configurations'].items():require(source_files.get('build-materials/'+name)==value, 'Native configuration mismatch')
        original_record_hash=actual_source['build-materials/build/beta-build.json']
        original=read(tar,'build-materials/build/beta-build.json');public={k:v for k,v in original.items() if k not in ('sdk','sharedTools')};public['sharedTools']={name:{k:v for k,v in item.items() if k!='path'} for name,item in original['sharedTools'].items()}
        require(public==build, 'Original native build record mismatch')
        for name in ('scripts/reduced_release.py','scripts/publish-reduced-release.py'):
            require(source_files.get('demuxe/'+name)==digest(ROOT/name), 'Publication validator differs from tagged source')
        if manifest.get('adaptiveStreaming'):
            shaka=read(tar,'demuxe/third_party/shaka-player.json')
            require(source_files['demuxe/third_party/shaka-player.json']==manifest['files']['third_party/shaka-player.json']['sha256'], 'Shaka inventory mismatch')
            require(source_files.get('demuxe/build/downloads/'+shaka['preferredSource']['filename'])==shaka['preferredSource']['sha256'], 'Missing Shaka preferred source')
    shaka_files=shaka['files'] if manifest.get('adaptiveStreaming') else {}
    for name,fact in manifest['files'].items():
        if not name.startswith('web/'):continue
        if name in build['artifacts']:continue # Already checked against immutable compiler record.
        if name=='web/engine-adaptation/manifest.json':continue # Standard packaging-generated companion descriptor.
        if name.startswith('web/engine-adaptation/'):
            descriptor=optional_manifests.get('web/engine-adaptation/manifest.json',{})
            require(name in ('web/engine-adaptation/remux.mjs','web/engine-adaptation/remux.wasm') and descriptor.get('files',{}).get(PurePosixPath(name).name,{}).get('sha256')==fact['sha256'],'Optional artifact descriptor mismatch')
        elif name in shaka_files:
            require(shaka_files[name]['sha256']==fact['sha256'],'Shaka runtime hash mismatch')
        else:require(source_files.get('demuxe/'+name)==fact['sha256'],'Runtime web bytes differ from tagged source: '+name)
    require(manifest['files'].get('bin/demuxe.mjs',{}).get('sha256')==source_files.get('demuxe/bin/demuxe.mjs') and 'demuxe/bin/demuxe.mjs' in source_files,'Published CLI differs from tagged source')
    for name in manifest['files']:
        if not name.startswith('web/') and name.endswith(('.js','.mjs','.cjs','.d.ts')) and name not in entrypoints:
            require(source_files.get('demuxe/'+name)==manifest['files'][name]['sha256'],'Published executable differs from tagged source: '+name)
    for name,blob in entrypoints.items():
        target='player/index.js' if name.startswith('player.') else 'index.js'
        require(blob==("// SPDX-License-Identifier: Apache-2.0\nexport * from './web/generated/"+target+"';\n").encode(),'Unexpected generated public entrypoint')
    require(set(entrypoints)=={'index.js','index.d.ts','player.js','player.d.ts'},'Missing public entrypoints')
    installed=json.loads(bound(directory,record['installedManifest']).read_text())
    require(installed.get('qualificationManifestKind')=='immutable-installed-beta-archive' and installed.get('sourceCommit')==commit and installed.get('archiveSHA256')==record['runtime']['sha256'],'Installed archive binding mismatch')
    expected_outputs={'package/'+name:fact for name,fact in manifest['files'].items()}
    expected_outputs['package/release-manifest.json']={'sha256':actual['package/release-manifest.json'],'bytes':len(json.dumps(manifest).encode())}
    # Preserve actual serialization length, not a reconstructed JSON length.
    with tarfile.open(runtime) as tar:expected_outputs['package/release-manifest.json']['bytes']=tar.getmember('package/release-manifest.json').size
    require(installed.get('outputs')==expected_outputs,'Installed archive inventory mismatch')
    correspondence=json.loads(bound(directory,record['nativeCorrespondence']).read_text())
    require(correspondence.get('candidate')==commit and correspondence.get('recordSHA256')==original_record_hash and correspondence.get('recordedNativeInputsUnchanged') is True,'Native correspondence mismatch')
    validate_evidence(directory,record,record['runtime']['sha256'],source_files,{n[len('package/'):]:h for n,h in actual.items()},component_names)
    from license_policy import Policy, archive_files, LEGAL
    Policy(ROOT).check_package(archive_files(runtime),'player')
    for name in LEGAL:require(source_files.get('demuxe/'+name)==digest(ROOT/name), 'Source license material differs')
    return runtime,version
