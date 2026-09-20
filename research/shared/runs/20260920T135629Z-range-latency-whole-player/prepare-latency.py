# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import shutil
p=Path('build/research-player-policies-latency-01/harness');shutil.copytree('build/research-player-policies-01/harness',p)
s=(p/'server.mjs').read_text().replace('http.createServer((req, res) => {','http.createServer(async (req, res) => {')
old="      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);"
assert s.count(old)==1
s=s.replace(old,old+"\n      if(pathname.startsWith('/fixtures/')){await new Promise(r=>setTimeout(r,50));if(res.destroyed)return;}")
s=s.replace('status:res.statusCode, bytes, elapsedMs:', 'status:res.statusCode, bytes, responseComplete:res.writableFinished, responseAborted:!res.writableFinished, byteAccounting:\"server ReadStream bytes, not exact client-received bytes\", elapsedMs:')
(p/'server.mjs').write_text(s)
