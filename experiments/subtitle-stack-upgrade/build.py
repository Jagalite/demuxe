# SPDX-License-Identifier: Apache-2.0
"""Link the existing test-only sub-lines bridge against the upgraded service."""
import json
import os
import pathlib
import shlex
import shutil
import subprocess

repo = pathlib.Path(__file__).resolve().parents[2]
out = repo / 'results/subtitle-stack-upgrade/engine'
out.mkdir(parents=True, exist_ok=True)
client = next(x for x in json.loads((repo / 'build/obj-mpv/compile_commands.json').read_text()) if x['file'].endswith('player/client.c'))
args = shlex.split(client['command'])
compiler = args[0]
flags = ['-I' + str(repo / 'build/subtitle-service/normalized'), '-ffile-prefix-map=' + str(repo) + '=/demuxe', *args[1:args.index('-MD')]]
env = os.environ.copy()
env['EM_CONFIG'] = str(repo / 'build/beta.emscripten')
env['EM_CACHE'] = str(repo / 'build/cache')
obj = out / 'bridge.o'
source = repo / 'experiments/subtitle-stack-upgrade/bridge.c'
subprocess.run([compiler, *flags, '-I' + str(repo / 'native'), '-I' + str(repo / 'build/sources/mpv'), '-c', str(source), '-o', str(obj)], cwd=client['directory'], env=env, check=True)
link = json.loads((repo / 'build/subtitle-service/link-command.json').read_text())
link = [str(obj) if x == str(repo / 'build/subtitle-service/bridge.o') else x for x in link]
raw_events = os.environ.get('RAW_EVENTS') == '1'
if raw_events:
    # Test only: suppress mpv's plain-text deduplication, keeping the original
    # ASS event boundaries. Never write into the pinned source or build archive.
    source = (repo / 'build/sources/mpv/sub/dec_sub.c').read_text()
    marker = '        dedup_sub_lines(res);'
    assert source.count(marker) == 1
    source = source.replace(marker, '        // Test-only: retain each decoded event boundary.')
    source = source.replace('#include <assert.h>\n', '#include <assert.h>\n#include <stdatomic.h>\n#include <stdint.h>\n')
    source = source.replace('struct dec_sub {\n', 'static atomic_uint poc_decodes, poc_registered_decodes, poc_setters;\nstatic atomic_uintptr_t poc_global_cb, poc_global_ctx;\nstruct dec_sub {\n')
    # Notify after a packet becomes decoder-visible, including preload and
    # re-decode paths. This never calls back into mpv while dec_sub is locked.
    replacements = [
        ('        sub->sd->driver->decode(sub->sd, sub->new_segment);\n', '        sub->sd->driver->decode(sub->sd, sub->new_segment);\n        if (sub->timing_changed) sub->timing_changed(sub->timing_changed_ctx);\n'),
        ('        sub->sd->driver->decode(sub->sd, pkt);\n        MP_TARRAY_APPEND', '        sub->sd->driver->decode(sub->sd, pkt);\n        if (sub->timing_changed) sub->timing_changed(sub->timing_changed_ctx);\n        MP_TARRAY_APPEND'),
        ('        if (!(sub->preload_attempted && sub->sd->preload_ok))\n            sub->sd->driver->decode(sub->sd, pkt);', '        if (!(sub->preload_attempted && sub->sd->preload_ok)) {\n            sub->sd->driver->decode(sub->sd, pkt);\n            if (sub->timing_changed) sub->timing_changed(sub->timing_changed_ctx);\n        }'),
        ('        sub->sd->driver->decode(sub->sd, sub->cached_pkts[index]);\n', '        sub->sd->driver->decode(sub->sd, sub->cached_pkts[index]);\n        if (sub->timing_changed) sub->timing_changed(sub->timing_changed_ctx);\n'),
    ]
    for old, new in replacements:
        assert source.count(old) == 1, old
        source = source.replace(old, new)
    source = source.replace('if (sub->timing_changed) sub->timing_changed(sub->timing_changed_ctx);',
                            'atomic_fetch_add(&poc_decodes, 1);\n        uintptr_t cb = atomic_load(&poc_global_cb);\n        if (cb) { atomic_fetch_add(&poc_registered_decodes, 1); ((void (*)(void *))cb)((void *)atomic_load(&poc_global_ctx)); }')
    source += '''\n// Test-only timing notification spans dec_sub recreation after seeks.\nvoid sub_set_timing_changed_cb(struct dec_sub *sub, void (*cb)(void *), void *ctx)\n{\n    (void)sub;\n    atomic_store(&poc_global_ctx, (uintptr_t)ctx);\n    atomic_store(&poc_global_cb, (uintptr_t)cb);\n    atomic_fetch_add(&poc_setters, 1);\n}\nunsigned sub_poc_decodes(void) { return atomic_load(&poc_decodes); }\nunsigned sub_poc_registered_decodes(void) { return atomic_load(&poc_registered_decodes); }\nunsigned sub_poc_setters(void) { return atomic_load(&poc_setters); }\n'''
    patched = out / 'dec_sub_raw.c'
    patched.write_text(source)
    compile = next(x for x in json.loads((repo / 'build/obj-mpv/compile_commands.json').read_text()) if x['file'].endswith('sub/dec_sub.c'))
    args = shlex.split(compile['command'])
    raw_obj = out / 'sub_dec_sub.c.o'
    subprocess.run([*args[:args.index('-MD')], '-I' + str(repo / 'build/sources/mpv/sub'), '-o', str(raw_obj), '-c', str(patched)], cwd=compile['directory'], env=env, check=True)
    raw_archive = out / 'libmpv-raw.a'
    shutil.copy2(repo / 'build/prefix/lib/libmpv.a', raw_archive)
    ar = pathlib.Path(compiler).resolve().parents[1] / 'bin/llvm-ar'
    subprocess.run([str(ar), 'r', str(raw_archive), str(raw_obj)], check=True)
    link = [str(raw_archive) if x == '-lmpv' else x for x in link]
link[link.index('-o') + 1] = str(out / ('service-raw.mjs' if raw_events else 'service.mjs'))
link = [('-Wl,-Map,' + str(out / 'subtitles.map')) if x.startswith('-Wl,-Map,') else x for x in link]
subprocess.run(link, cwd=repo, env=env, check=True)
print(out)
