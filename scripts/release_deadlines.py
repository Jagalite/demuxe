# SPDX-License-Identifier: Apache-2.0
"""Stage the exact packaged range reader and its functional core for Node tests."""
import pathlib
import tarfile


def stage_reader(archive, work):
    work = pathlib.Path(work)
    (work / 'package.json').write_text('{"type":"module"}\n')
    with tarfile.open(archive) as bundle:
        for name in ('range-reader.js', 'generated/internal/machine/range-reader.js'):
            target = work / 'web' / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(bundle.extractfile('package/web/' + name).read())
    return work / 'web/range-reader.js'
