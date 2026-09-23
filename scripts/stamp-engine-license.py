#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Label a freshly linked LGPL engine JavaScript wrapper without changing code."""
import pathlib
import sys

if len(sys.argv) != 2:
    raise SystemExit('usage: stamp-engine-license.py <linked-engine.mjs>')
path = pathlib.Path(sys.argv[1])
data = path.read_text()
notice = '// SPDX-License-Identifier: LGPL-2.1-or-later\n'
if data.startswith('// SPDX-License-Identifier:') and not data.startswith(notice):
    raise SystemExit('Conflicting linked-engine SPDX header: ' + str(path))
if not data.startswith(notice):
    path.write_text(notice + data)
