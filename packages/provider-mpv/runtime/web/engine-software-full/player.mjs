// SPDX-License-Identifier: Apache-2.0
import createEngine from '../engine-mpv/player.mjs';
export default async function(options){const engine=await createEngine(options);if(engine._web_set_render_mode(0)!==0)throw Error('Unified mpv mode initialization failed');return engine;}
