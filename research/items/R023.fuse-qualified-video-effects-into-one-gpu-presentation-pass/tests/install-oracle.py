# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
base=Path('build/research-r023-player-01')
for variant in ['canvas','gpu']:
 p=base/variant/'assets/demuxe/web/filter-retained-engine-worker.js';s=p.read_text();assert 'oracleEnabled' not in s
 s=s.replace("import {createPresenter} from './r023-presenter.js';let presenter;", "import {createPresenter} from './r023-presenter.js';import {oracleFrame} from './r023-oracle.js';let presenter;const researchOracles=[];const oracleEnabled=new URL(self.location.href).searchParams.get('oracle')==='1';function captureOracle(frame,overlay){if(oracleEnabled&&[1000000,6000000,10000000].includes(frame.timestamp)&&!researchOracles.some(x=>x.pts===frame.timestamp))researchOracles.push(oracleFrame(frame,overlay));}")
 s=s.replace('presenter.draw(frame,request.overlay,videoTrack);','captureOracle(frame,request.overlay);presenter.draw(frame,request.overlay,videoTrack);').replace('presenter.draw(heldFrame,overlay,videoTrack);','captureOracle(heldFrame,overlay);presenter.draw(heldFrame,overlay,videoTrack);').replace('researchPresenter:presenter?.kind,','researchPresenter:presenter?.kind,researchOracles,')
 p.write_text(s)
 p=base/variant/'assets/demuxe/web/generated/internal/wasm-player.js';s=p.read_text().replace("'web/filter-retained-engine-worker.js?mode=retained'", "'web/filter-retained-engine-worker.js?mode=retained'+(location.search.includes('oracle=1')?'&oracle=1':'')");p.unlink();p.write_text(s)
 (base/variant/'assets/demuxe/web/r023-oracle.js').write_text(Path('research/items/R023.fuse-qualified-video-effects-into-one-gpu-presentation-pass/tests/capture-oracle.js').read_text())
