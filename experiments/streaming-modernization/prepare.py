#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Materialize a non-release baseline without modifying the working engines."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]
PROFILE = Path(__file__).resolve().parent / 'baseline'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--switching', action='store_true', help='Apply paused mpv video-switch experiment (includes transport)')
parser.add_argument('--transport', action='store_true', help='Apply unqualified incremental AVIO experiment')
parser.add_argument('--concurrent', action='store_true', help='Apply independent nested-resource mailbox lanes (includes transport)')
parser.add_argument('--timeline', action='store_true', help='Apply final-window transition stage (includes subtitles)')
parser.add_argument('--subtitles', action='store_true', help='Apply pinned libass subtitle-retention stage (includes discontinuity)')
parser.add_argument('--discontinuity', action='store_true', help='Apply unqualified discontinuity/resource-retirement stage (includes DASH)')
parser.add_argument('--dash', action='store_true', help='Apply unqualified all-period DASH session stage (includes live)')
parser.add_argument('--live', action='store_true', help='Apply unqualified native live component/window stage (includes quality)')
parser.add_argument('--quality', action='store_true', help='Apply the source-scoped quality API/component overlay (includes integration)')
parser.add_argument('--integration', action='store_true', help='Apply unqualified mpv adaptive session (includes concurrent transport)')
parser.add_argument('--downloads', type=Path, help='Optional verified archive cache')
args = parser.parse_args()
args.subtitles = args.subtitles or args.timeline
args.discontinuity = args.discontinuity or args.subtitles
args.dash = args.dash or args.discontinuity
args.live = args.live or args.dash
args.quality = args.quality or args.live
args.integration = args.integration or args.quality
args.concurrent = args.concurrent or args.integration
args.transport = args.transport or args.switching or args.concurrent
out = args.output.resolve()
if out.exists():
    raise SystemExit('Output must be new; preserve previous attempts and logs')
profile = json.loads((PROFILE / 'profile.json').read_text())
for name, digest in profile['baseSHA256'].items():
    if hashlib.sha256((ROOT / name).read_bytes()).hexdigest() != digest:
        raise SystemExit('Profile needs review against changed input: ' + name)
# Reject stale generated native code before starting an expensive clean build.
if args.timeline:
    provenance = json.loads((PROFILE.parent / 'live/timeline/patch-inputs.json').read_text())
    patch = PROFILE.parent / 'live/timeline/files/patches/0018-demuxe-live-components.patch'
    if hashlib.sha256(patch.read_bytes()).hexdigest() != provenance['patchSHA256']:
        raise SystemExit('Timeline patch changed without regenerated input provenance')
    for name, digest in provenance['files'].items():
        if hashlib.sha256((PROFILE.parent / name).read_bytes()).hexdigest() != digest:
            raise SystemExit('Regenerate the timeline patch and its input provenance: ' + name)
names = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
# Include the CLI explicitly for the original dirty-snapshot workflow as well
# as checkouts containing the committed rename. Arbitrary untracked mocks,
# private local inputs and test outputs are not build inputs.
names.append('bin/demuxe.mjs')
out.mkdir(parents=True)
inputs = {}
for name in sorted(set(names)):
    if not name or name.startswith(('results/', 'build/', 'experiments/streaming-modernization/')):
        continue
    source = ROOT / name
    if not source.is_file() or source.is_symlink():
        continue
    destination = out / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
    inputs[name] = hashlib.sha256(source.read_bytes()).hexdigest()
for name in profile['removed']:
    (out / name).unlink()
for source in (PROFILE / 'files').rglob('*'):
    if source.is_file():
        destination = out / source.relative_to(PROFILE / 'files')
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
if args.transport:
    transport = PROFILE.parent / 'transport/files'
    for source in transport.rglob('*'):
        if source.is_file():
            destination = out / source.relative_to(transport)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
if args.switching:
    switching = PROFILE.parent / 'switching/files'
    for source in switching.rglob('*'):
        if source.is_file():
            destination = out / source.relative_to(switching)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
if args.concurrent:
    concurrent = PROFILE.parent / 'concurrent/files'
    for source in concurrent.rglob('*'):
        if source.is_file():
            destination = out / source.relative_to(concurrent)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
if args.integration:
    integration = PROFILE.parent / 'integration/files'
    for source in integration.rglob('*'):
        if source.is_file():
            destination = out / source.relative_to(integration)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
if args.quality:
    quality = PROFILE.parent / 'quality/files'
    for source in quality.rglob('*'):
        if source.is_file():
            destination = out / source.relative_to(quality)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
if args.live:
    live = PROFILE.parent / 'live/files'
    for source in live.rglob('*'):
        if source.is_file():
            destination = out / source.relative_to(live)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
if args.dash:
    dash = PROFILE.parent / 'live/dash/files'
    for source in dash.rglob('*'):
        if source.is_file():
            destination = out / source.relative_to(dash)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
if args.discontinuity:
    discontinuity = PROFILE.parent / 'live/discontinuity/files'
    for source in discontinuity.rglob('*'):
        if source.is_file():
            destination = out / source.relative_to(discontinuity)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
if args.subtitles:
    subtitles = PROFILE.parent / 'live/subtitles/files'
    for source in subtitles.rglob('*'):
        if source.is_file():
            destination = out / source.relative_to(subtitles)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
if args.timeline:
    timeline = PROFILE.parent / 'live/timeline/files'
    for source in timeline.rglob('*'):
        if source.is_file():
            destination = out / source.relative_to(timeline)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
(out / 'build').mkdir(exist_ok=True)
(out / 'build/modernization-inputs.json').write_text(json.dumps({
    'status': 'unqualified-source-snapshot',
    'timelineOverrides': {str(p.relative_to(PROFILE.parent / 'live/timeline/files')): hashlib.sha256(p.read_bytes()).hexdigest()
                      for p in sorted((PROFILE.parent / 'live/timeline/files').rglob('*')) if p.is_file()} if args.timeline else {},
    'subtitleOverrides': {str(p.relative_to(PROFILE.parent / 'live/subtitles/files')): hashlib.sha256(p.read_bytes()).hexdigest()
                      for p in sorted((PROFILE.parent / 'live/subtitles/files').rglob('*')) if p.is_file()} if args.subtitles else {},
    'discontinuityOverrides': {str(p.relative_to(PROFILE.parent / 'live/discontinuity/files')): hashlib.sha256(p.read_bytes()).hexdigest()
                      for p in sorted((PROFILE.parent / 'live/discontinuity/files').rglob('*')) if p.is_file()} if args.discontinuity else {},
    'dashOverrides': {str(p.relative_to(PROFILE.parent / 'live/dash/files')): hashlib.sha256(p.read_bytes()).hexdigest()
                      for p in sorted((PROFILE.parent / 'live/dash/files').rglob('*')) if p.is_file()} if args.dash else {},
    'stage': 'timeline-integration' if args.timeline else 'subtitle-integration' if args.subtitles else 'discontinuity-integration' if args.discontinuity else 'dash-period-integration' if args.dash else 'live-integration' if args.live else 'adaptive-integration' if args.integration else 'concurrent-transport' if args.concurrent else 'manual-switch-experiment' if args.switching else 'incremental-transport' if args.transport else 'baseline',
    'liveOverrides': {str(p.relative_to(PROFILE.parent / 'live/files')): hashlib.sha256(p.read_bytes()).hexdigest()
                      for p in sorted((PROFILE.parent / 'live/files').rglob('*')) if p.is_file()} if args.live else {},
    'qualityOverrides': {str(p.relative_to(PROFILE.parent / 'quality/files')): hashlib.sha256(p.read_bytes()).hexdigest()
                         for p in sorted((PROFILE.parent / 'quality/files').rglob('*')) if p.is_file()} if args.quality else {},
    'integrationOverrides': {str(p.relative_to(PROFILE.parent / 'integration/files')): hashlib.sha256(p.read_bytes()).hexdigest()
                           for p in sorted((PROFILE.parent / 'integration/files').rglob('*')) if p.is_file()} if args.integration else {},
    'concurrentOverrides': {str(p.relative_to(PROFILE.parent / 'concurrent/files')): hashlib.sha256(p.read_bytes()).hexdigest()
                           for p in sorted((PROFILE.parent / 'concurrent/files').rglob('*')) if p.is_file()} if args.concurrent else {},
    'switchingOverrides': {str(p.relative_to(PROFILE.parent / 'switching/files')): hashlib.sha256(p.read_bytes()).hexdigest()
                           for p in sorted((PROFILE.parent / 'switching/files').rglob('*')) if p.is_file()} if args.switching else {},
    'transportOverrides': {str(p.relative_to(PROFILE.parent / 'transport/files')): hashlib.sha256(p.read_bytes()).hexdigest()
                           for p in sorted((PROFILE.parent / 'transport/files').rglob('*')) if p.is_file()} if args.transport else {},
    'baseCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
    'sourceSHA256': inputs,
    'profileSHA256': hashlib.sha256((PROFILE / 'profile.json').read_bytes()).hexdigest(),
    'removed': profile['removed'],
    'overrides': {str(p.relative_to(PROFILE / 'files')): hashlib.sha256(p.read_bytes()).hexdigest()
                  for p in sorted((PROFILE / 'files').rglob('*')) if p.is_file()},
}, indent=2) + '\n')
if args.downloads:
    downloads = out / 'build/downloads'
    downloads.mkdir()
    for item in json.loads((out / 'sources.lock.json').read_text())['sources']:
        source = args.downloads.resolve() / (item['name'] + '.tar.gz')
        if source.is_file() and hashlib.sha256(source.read_bytes()).hexdigest() == item['sha256']:
            shutil.copy2(source, downloads / source.name)
print(out)
