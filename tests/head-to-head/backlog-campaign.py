#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Serial README gap testing; publish and push each completed row before the next."""
import argparse, hashlib, json, pathlib, re, subprocess

ROOT = pathlib.Path(__file__).resolve().parents[2]
LANES = {1: 'video.default', 2: 'demuxe.auto', 3: 'demuxe.jspi',
         4: 'demuxe.asyncify', 5: 'demuxe.software', 6: 'movi.default',
         7: 'libmedia.default', 9: 'videojs.default'}

def command(argv, **kwargs):
    return subprocess.run(list(map(str, argv)), cwd=ROOT, **kwargs)

def gaps(cell):
    return ('Untested' in cell or cell == '—' or
            (('🟢' in cell or '🟡' in cell) and not re.search(r'\d+(?:\.\d+)?% CPU', cell)))

def execute(args):
    catalogue = json.loads((args.assets/'fixtures/catalogue.json').read_text())
    specialists = json.loads((args.assets/'specialist.json').read_text())
    labels = {f['label']: key for key, f in catalogue.items()}
    labels['H.264 + PCM24 / MKV + ASS'] = 'pcm-ass'
    for number in range(args.start, args.through+1):
        assert not subprocess.check_output(['git', 'diff', '--cached', '--name-only'], cwd=ROOT, text=True).strip(), 'Preserve existing staged work; publication requires a scoped index'
        rows = [[c.strip() for c in line.strip('|').split('|')]
                for line in (ROOT/'README.md').read_text().splitlines()
                if line.startswith('| ') and len(line.split('|')) == 12][2:]
        row = rows[number-1]
        needs_mediabunny = not args.only_private and gaps(row[8])
        fixture = labels[row[0]]
        if fixture not in specialists and (catalogue[fixture].get('markedAudio') is False or catalogue[fixture].get('blockedReason')):
            raise RuntimeError(f'Row {number} requires specialist screening: {fixture}')
        selected = [f'{lane}.{fixture}' for column, lane in LANES.items()
                    if (column in (3, 4) if args.only_private else gaps(row[column]))]
        if fixture == 'h264-aac-pgs-isolation' and not args.only_private:
            selected = list(dict.fromkeys(selected+['demuxe.software.'+fixture]))
        if not selected and not needs_mediabunny:
            continue
        prefix = ROOT/f'results/head-to-head/backlog-{args.tag+"-" if args.tag else ""}{number:02d}-{fixture}'
        correctness = pathlib.Path(str(prefix)+'-correctness')
        assert args.resume or not correctness.exists(), f'Existing evidence requires review: {correctness}'
        common = ['node', 'tests/head-to-head/run.mjs', '--assets', args.assets,
                  '--catalogue', '--include-private-remux', '--include-videojs',
                  '--include-software', '--headed']
        if args.force_private_remux:
            common.append('--force-private-remux')
        if fixture in specialists:
            common.append('--specialist-catalogue')
        runs = []
        def run(directory, cases, extra=()):
            if args.resume and directory.exists():
                command(['node', 'tests/head-to-head/verify.mjs', directory], check=True, stdout=subprocess.DEVNULL)
                data = json.loads((directory/'summary.json').read_text())
                assert data.get('finishedAt') and not data.get('interrupted'), 'Cannot resume incomplete evidence'
                assert set(data['selected']) == set(cases), 'Existing evidence has different cases'
                runs.append(directory)
                return data
            log = pathlib.Path(str(directory)+'.log')
            with log.open('x') as output:
                result = command(common+['--cases', ','.join(cases), '--output', directory]+list(extra), stdout=output, stderr=subprocess.STDOUT)
            if result.returncode not in (0, 1) or not (directory/'manifest.json').exists():
                raise RuntimeError(f'Incomplete runner; inspect {log}')
            command(['node', 'tests/head-to-head/verify.mjs', directory], check=True, stdout=subprocess.DEVNULL)
            runs.append(directory)
            return json.loads((directory/'summary.json').read_text())
        print(f'ROW {number}: {row[0]} — {len(selected)} gaps', flush=True)
        proof = run(correctness, selected)
        print('Correctness:', [(c['id'], c['status'], c.get('reason', '').split('\n')[0]) for c in proof['cases']], flush=True)
        cpu_paths = []
        supplement_paths = []
        mb_proof = None
        def media_bunny(directory, extra=()):
            with pathlib.Path(str(directory)+'.log').open('x') as output:
                result = command(['node', 'tests/head-to-head/mediabunny-backlog.mjs', '--assets', args.assets,
                                  '--fixture', fixture, '--output', directory]+list(extra), stdout=output, stderr=subprocess.STDOUT)
            assert result.returncode == 0, f'MediaBunny harness incomplete: {directory}'
            command(['node', 'tests/head-to-head/verify.mjs', directory], check=True, stdout=subprocess.DEVNULL)
            runs.append(directory)
            data = json.loads((directory/'summary.json').read_text())
            print('MediaBunny:', [(c['status'], c.get('reason', '').split('\n')[0]) for c in data['cases']], flush=True)
            return data
        if needs_mediabunny:
            if args.mediabunny_tag:
                prior = pathlib.Path(str(prefix)+'-mediabunny-correctness')
                if prior.exists():
                    command(['node', 'tests/head-to-head/verify.mjs', prior], check=True, stdout=subprocess.DEVNULL)
                    runs.append(prior)
            mb_correctness = pathlib.Path(str(prefix)+'-mediabunny'+('-'+args.mediabunny_tag if args.mediabunny_tag else '')+'-correctness')
            mb_proof = media_bunny(mb_correctness)
            supplement_paths.extend(['--supplement', mb_correctness])
        for screened in [False, True]:
            cases = [c['id'] for c in proof['cases'] if
                c.get('runtimeCPUApplicable') is not False and
                (c['status'] == 'passed' if not screened else c['status'] == 'blocked' and c.get('screenPassed') and not c.get('runtimeBypass') and not c.get('failureStage'))]
            if not cases:
                continue
            directory = pathlib.Path(str(prefix)+('-screened-cpu' if screened else '-cpu'))
            extra = ['--performance', '--exclusive', '--browser-scope', 'row', '--correctness', correctness/'summary.json']
            if screened:
                extra.append('--screened-cpu')
            observed = run(directory, cases, extra)
            print('CPU:', [(c['id'], c.get('round'), c['status']) for c in observed['cases']], flush=True)
            cpu_paths.extend(['--cpu', directory])
        if mb_proof and mb_proof['cases'][0]['status'] == 'blocked' and mb_proof['cases'][0].get('screenPassed'):
            mb_cpu = pathlib.Path(str(prefix)+'-mediabunny'+('-'+args.mediabunny_tag if args.mediabunny_tag else '')+'-cpu')
            media_bunny(mb_cpu, ['--cpu', '--correctness', mb_correctness/'summary.json'])
            cpu_paths.extend(['--cpu', mb_cpu])
        command(['python3', 'tests/head-to-head/report-backlog-row.py', '--row', number,
                 '--correctness', correctness]+supplement_paths+cpu_paths+(['--attempt', args.attempt] if args.attempt else []), check=True)
        paths = ['README.md', 'docs/README-TESTING-BACKLOG.md', 'docs/README-BACKLOG-RESULTS.md']+runs
        if number == args.start:
            paths += args.support
        assert not subprocess.check_output(['git', 'diff', '--cached', '--name-only'], cwd=ROOT, text=True).strip(), 'Unrelated staging appeared during tests; preserve it'
        command(['git', 'add', '--']+paths, check=True)
        # Global image/log ignore rules must not silently break a published archive.
        for directory in runs:
            manifest = json.loads((directory/'manifest.json').read_text())
            evidence = [directory/'manifest.json']+[directory/name for name in manifest['sha256']]
            command(['git', 'add', '--force', '--']+evidence, check=True)
            index = {}
            for entry in subprocess.check_output(['git', 'ls-files', '--stage', '-z', str(directory)], cwd=ROOT).split(b'\0'):
                if entry:
                    metadata, name = entry.split(b'\t', 1)
                    index[name.decode()] = metadata.split()[1].decode()
            for file in evidence:
                data = file.read_bytes()
                expected = hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest()
                assert index[str(file.relative_to(ROOT))] == expected, f'Archive not fully staged: {file}'
        command(['git', 'diff', '--cached', '--check'], check=True)
        command(['git', 'commit', '-m', f'Test README row {number}: {row[0]}'], check=True, stdout=subprocess.DEVNULL)
        revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
        command(['git', 'push', 'git@github.com:Jagalite/demuxe.git', 'main'], check=True)
        remote = subprocess.check_output(['git', 'ls-remote', 'git@github.com:Jagalite/demuxe.git', 'refs/heads/main'], cwd=ROOT, text=True).split()[0]
        assert remote == revision, (remote, revision)
        print(f'PUSHED row {number}: {revision}', flush=True)

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--assets', type=lambda s: pathlib.Path(s).resolve(), required=True)
    p.add_argument('--start', type=int, required=True)
    p.add_argument('--through', type=int, required=True)
    p.add_argument('--support', nargs='*', default=[])
    p.add_argument('--force-private-remux', action='store_true')
    p.add_argument('--only-private', action='store_true')
    p.add_argument('--resume', action='store_true', help='Reuse only complete verified evidence; never pool CPU rounds')
    p.add_argument('--mediabunny-tag', default='')
    p.add_argument('--tag', default='')
    p.add_argument('--attempt')
    args = p.parse_args()
    assert re.fullmatch('[a-z0-9-]*', args.tag) and re.fullmatch('[a-z0-9-]*', args.mediabunny_tag), 'Tag must be a simple output path component'
    execute(args)
