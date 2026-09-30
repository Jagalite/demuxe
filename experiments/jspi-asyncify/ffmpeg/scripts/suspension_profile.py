# SPDX-License-Identifier: MIT
"""Build-time policy only. Full Emscripten/FFmpeg compilation remains unqualified."""
import json

KINDS = ('jspi', 'asyncify')
ALLOWED_EXPORTS = frozenset(('rm_error','rm_set_demuxer','rm_probe','rm_open','rm_start',
    'rm_set_container','rm_step','rm_close','rm_duration','rm_video_codec',
    'rm_audio_codec','rm_adapt_audio'))

def suspension_flags(kind, exports, saved_stack_bytes=65536):
    if kind not in KINDS:
        raise ValueError('Unknown suspension kind')
    if not isinstance(saved_stack_bytes, int) or isinstance(saved_stack_bytes, bool) or not 4096 <= saved_stack_bytes <= 1048576 or saved_stack_bytes % 16:
        raise ValueError('Saved-stack budget must be aligned and between 4 KiB and 1 MiB')
    if not isinstance(exports, (list, tuple)) or not exports or any(
            not isinstance(x, str) or x not in ALLOWED_EXPORTS for x in exports):
        raise ValueError('Expected explicit admitted rm_* exports')
    if len(set(exports)) != len(exports):
        raise ValueError('Duplicate async export')
    if kind == 'jspi':
        return ['-sJSPI=1', '-sJSPI_EXPORTS='+json.dumps(list(exports))]
    # EM_ASYNC_JS declares the read boundary to the toolchain. In particular, do
    # NOT ignore indirect calls: FFmpeg reaches browser I/O via AVIO callbacks.
    return ['-sASYNCIFY=1', '-sASYNCIFY_STACK_SIZE='+str(saved_stack_bytes), '-sASYNCIFY_IGNORE_INDIRECT=0']
