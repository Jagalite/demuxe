# SPDX-License-Identifier: Apache-2.0
"""Read-only verification of the sealed study, including the exact timing matrix."""
import gzip
import hashlib
import json
import math
import statistics
from pathlib import Path
from run_guard import resolve_run

BASE = Path('research/items/unified-hybrid-software-engine')


def read(path):
    return json.loads(Path(path).read_text())


def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def timing_key(row):
    return tuple(row[k] for k in ('browser', 'variant', 'stage', 'prepare', 'network', 'pair'))


def expected_matrix():
    keys = set()
    for browser in ('chrome', 'firefox'):
        for pair in range(3):
            for variant in ('baseline', 'unified'):
                keys.add((browser, variant, 'policy', 'all', '10mbps', pair))
    for pair in range(3):
        for variant in ('baseline', 'unified'):
            keys.add(('chrome', variant, 'recovery', 'none', '10mbps', pair))
    for browser in ('chrome', 'firefox'):
        for variant in ('baseline', 'unified'):
            keys.add((browser, variant, 'performance', 'none', 'local', 0))
    return keys


def verify_matrix(analysis, load=read):
    rows = analysis['rows']
    keys = [timing_key(r) for r in rows]
    assert len(keys) == len(set(keys)) == 22 and set(keys) == expected_matrix(), 'Missing or duplicate timing profile'
    for row in rows:
        raw = load(row['path'])
        assert raw['passed'] and raw['stage'] == row['stage'] and raw['family'] == row['browser']
        assert raw['variant'] == row['variant'] and raw['policy'] == row['prepare'] and raw['network'] == row['network']
        assert raw['fixture'] == 'user'
        for field, value in [('prepareMs', raw['preparation']['ms']), ('selectionMs', raw['startup']['movementMs']),
                             ('totalMs', raw['preparation']['ms'] + raw['startup']['movementMs']),
                             ('fallbackMs', raw.get('fallback', {}).get('ms'))]:
            assert row[field] == value, f'Changed raw metric: {field}'
        statuses = {a['name']: a['status'] for a in raw['preparation'].get('report', {}).get('assets', [])}
        assert row['preparationStatuses'] == statuses
        assert row['wasmTransferBytes'] == sum(q['bytes'] for q in raw['requests'] if q['url'].endswith('.wasm'))
        assert row['engineRequests'] == sum(q['url'].endswith('player.wasm') for q in raw['requests'])
        assert row['compileCalls'] == len(raw.get('compilePhases', []))
        if row['prepare'] == 'all':
            assert set(statuses) == {'hybrid', 'software', 'font', 'inspector'}, 'Missing preparation asset'
            if row['variant'] == 'unified' or row['browser'] == 'chrome':
                assert set(statuses.values()) == {'ready'}
    groups = {(r['browser'], r['stage'], r['network']) for r in rows}
    summaries = analysis['summary']
    assert len(summaries) == len(groups)
    assert {(r['browser'], r['stage'], r['network']) for r in summaries} == groups
    for summary in summaries:
        group = [r for r in rows if (r['browser'], r['stage'], r['network']) == (summary['browser'], summary['stage'], summary['network'])]
        assert summary['pairs'] == len(group) // 2
        required = {'prepareMs', 'selectionMs', 'totalMs', 'wasmTransferBytes'}
        if summary['stage'] == 'recovery': required.add('fallbackMs')
        assert set(summary['metrics']) == required, 'Missing summary metric'
        for field, metrics in summary['metrics'].items():
            a = {r['pair']: r[field] for r in group if r['variant'] == 'baseline' and r[field] is not None}
            b = {r['pair']: r[field] for r in group if r['variant'] == 'unified' and r[field] is not None}
            assert a and a.keys() == b.keys()
            am, bm = statistics.median(a.values()), statistics.median(b.values())
            assert metrics['baselineMedian'] == am and metrics['unifiedMedian'] == bm
            expected = 100 * (am - bm) / am if am else None
            actual = metrics['reductionPercent']
            assert actual is None if expected is None else math.isclose(actual, expected, abs_tol=1e-10)
            savings = [a[i] - b[i] for i in a]
            assert metrics['pairedSavings'] == savings and metrics['pairedSavingsRange'] == [min(savings), max(savings)]
    return len(rows)


def verify(run):
    run = Path(run)
    manifest = read(run / 'manifest.json')
    paths = set()
    for artifact in manifest['artifacts']:
        p = Path(artifact['path'])
        assert p.resolve().is_relative_to(run.resolve()), f'Artifact outside run: {p}'
        assert str(p) not in paths, f'Duplicate artifact: {p}'
        paths.add(str(p))
        assert p.stat().st_size == artifact['bytes'] and digest(p) == artifact['sha256'], f'Changed evidence: {p}'
    # No fallback to "performanceComplete: false": this study claims completed timing.
    analysis = read(run / 'performance-analysis.json')
    count = verify_matrix(analysis)
    for row in analysis['rows']:
        assert row['path'] in paths, 'Unsealed timing result'
    pictures = read(run / 'pictures.json')['checks']
    qualified = set()
    for row in pictures:
        if 'oracleMAE' not in row:
            continue  # Recorded rejected attempts must remain rejected.
        assert row['path'] in paths and read(row['path'])['passed']
        assert row['passed'] and row['oracleMAE'] <= 6 and row['wrongPictureMAE'] > 6
        assert row.get('baselineMAE', 0) <= 2
        assert row['fixture'] == 'user' or row['subtitleChangedPixels'] > 50
        qualified.add((row['variant'], row['family'], row['mode'], row['fixture']))
    for browser, mode in [('chrome', 'hybrid'), ('chrome', 'software'), ('firefox', 'software')]:
        for variant in ('baseline', 'unified'):
            for fixture in ('user', 'rotation90'):
                assert (variant, browser, mode, fixture) in qualified
        assert ('unified', browser, mode, 'h264') in qualified
    trials = [read(p) for p in run.glob('*/result.json')]
    successful = [r for r in trials if r['passed']]
    assert successful
    for raw in successful:
        assert raw['remainingWorkers'] == 0 and raw['survivingPids'] == [], 'Missing or failed teardown evidence'
        assert raw['state']['mode'] == raw['expected']
        assert raw['state']['diagnostics']['backend']['decoder'] == ('webcodecs' if raw['expected'] == 'hybrid' else 'software')
        if raw['variant'] == 'unified':
            assert sum(q['url'].endswith('/engine-unified/player.wasm') for q in raw['requests']) == 1
            assert sum(q['bytes'] > 20_000_000 for q in raw['compilePhases']) == 1
            assert not any('/engine-hybrid/player.wasm' in q['url'] or '/engine-software-full/player.wasm' in q['url'] for q in raw['requests'])
    cache = read(run / 'cache-contract.json')
    assert cache['passed'] and len(cache['results']) == 4 and all(r['passed'] for r in cache['results'])
    sizes = {r['variant']: r for r in read(run / 'sizes.json')}
    for name, row in sizes.items():
        p = run / 'variants' / name / 'player.wasm'
        assert p.stat().st_size == row['bytes'] and digest(p) == row['sha256']
        compressed = Path(str(p) + '.gz').read_bytes()
        assert len(compressed) == row['gzipBytes'] and gzip.decompress(compressed) == p.read_bytes()
    combined = sizes['baseline']['gzipBytes'] + sizes['software-baseline']['gzipBytes']
    unified = sizes['unified']['gzipBytes']
    assert analysis['size']['combinedGzipBytes'] == combined and analysis['size']['unifiedGzipBytes'] == unified
    assert math.isclose(analysis['size']['savedPercent'], 100 * (combined - unified) / combined)
    assert analysis['size']['savedPercent'] >= 40
    assert unified <= sizes['baseline']['gzipBytes'] * 1.05
    chrome = next(s for s in analysis['summary'] if s['browser'] == 'chrome' and s['stage'] == 'policy')
    assert chrome['metrics']['prepareMs']['reductionPercent'] >= 25
    return {'passed': True, 'sealedArtifacts': len(paths), 'timingTrials': count, 'successfulBrowserTrials': len(successful),
            'failedAttemptsPreserved': len(trials) - len(successful), 'scope': 'Read-only sealed-study verification; live checkout changes do not invalidate historical evidence.'}


if __name__ == '__main__':
    print(json.dumps(verify(resolve_run(BASE)), indent=2))
