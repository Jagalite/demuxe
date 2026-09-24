// SPDX-License-Identifier: Apache-2.0
import {serve as base} from '../pipeline-qualification/server.mjs';
export const serve=()=>base({pagePath:'experiments/decoder-lowres/page.html',mediaPaths:{mpeg2_1080:'build/decoder-lowres/mpeg2-1080.ts',mpeg4_1080:'build/decoder-lowres/mpeg4-1080.avi',mpeg2_4k:'build/decoder-lowres/mpeg2-4k.ts',bbb_mpeg2:'build/decoder-lowres/bbb-mpeg2-1080.ts',bbb_mpeg4:'build/decoder-lowres/bbb-mpeg4-1080.avi'}});
