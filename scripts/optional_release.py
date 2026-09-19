# SPDX-License-Identifier: Apache-2.0
"""Validate exact-archive optional-runtime evidence for the standard release gate."""
import hashlib
import json
import pathlib

OPTIONAL_CHECKS = {'ass-source', 'adaptation-source', 'assets'} | {
    f'{name}-{browser}' for browser in ['chrome', 'firefox'] for name in [
        'consumer', 'automatic', 'fractional-seek', 'ass', 'ass-selection', 'ass-style', 'flac',
        'opus', 'lifecycle-flac', 'lifecycle-opus', 'gain', 'unequal-tails']}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def verify(report_path, archive, manifest, source_files):
    report_path = pathlib.Path(report_path).resolve()
    record = json.loads(report_path.read_text())
    if not record.get('passed') or record.get('archiveSHA256') != digest(archive):
        raise ValueError('Optional qualification failed or used a different archive')
    checks = record.get('checks', [])
    if len(checks) != len(OPTIONAL_CHECKS) or {c['name'] for c in checks} != OPTIONAL_CHECKS:
        raise ValueError('Incomplete optional-runtime qualification matrix')
    expected = {n:v for n,v in manifest['files'].items()
                if n.startswith('web/') and pathlib.Path(n).suffix in ['.js', '.mjs', '.wasm']}
    if record.get('runtimeFiles') != expected:
        raise ValueError('Optional runtime file inventory differs from release')
    for check in checks:
        if not check.get('passed') or check.get('exitCode') != 0:
            raise ValueError('Failed optional-runtime check: '+check['name'])
        log = (report_path.parent/check['log']).resolve()
        if not log.is_relative_to(report_path.parent) or digest(log) != check['sha256']:
            raise ValueError('Optional qualification log changed or escapes its directory')
        harnesses = check.get('harnesses', {})
        if not harnesses:
            raise ValueError('Missing optional qualification harness identity')
        for name, sha in harnesses.items():
            if source_files.get('demuxe/'+name) != sha:
                raise ValueError('Optional harness differs from release source: '+name)
    return {'file':str(report_path), 'sha256':digest(report_path),
            'suite':'optional-runtime-exact-archive', 'checks':len(checks)}


def required_consumer_cases(manifest):
    """The standard installed-consumer suite adds external ASS only when shipped."""
    cases={'automatic-local','native-no-isolation','hybrid-pin','software-pin','automatic-ass','native-remux','transitions','rollback','missing-engine','isolation-error','omitted-yuv','av1-software','hdr-software','external-subtitles','surround-output','hls-expanded','dash-periods'}
    if 'web/engine-ass/subtitles.wasm' in manifest['files']:
        cases.add('native-external-ass')
    return cases
