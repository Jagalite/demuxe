#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Recreate local selective-route lifecycle fixtures from tracked media."""
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'build/selective-production'
AAC = ROOT / 'results/unsupported-audio-cpu/20260924-three-arm-qualified/fixtures/h264-1080p60-aac.mkv'
AC3 = ROOT / 'results/unsupported-audio-cpu/20260924-three-arm-qualified/fixtures/h264-1080p60-ac3.mkv'
DTS = ROOT / 'results/unsupported-audio-cpu/20260924-codec-variants/fixtures/h264-1080p60-dts.mkv'
PGS = ROOT / 'results/top100/pgs/caption.sup'


def make(name, *inputs_and_options):
    target = OUT / name
    subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
                    *map(str, inputs_and_options), '-c', 'copy', str(target)], check=True)
    return target


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    make('aac-ac3.mkv', '-i', AAC, '-i', AC3, '-map', '0:v:0', '-map', '0:a:0', '-map', '1:a:0')
    make('ac3-dts.mkv', '-i', AC3, '-i', DTS, '-map', '0:v:0', '-map', '0:a:0', '-map', '1:a:0')
    ass = OUT / 'captions.ass'
    ass.write_text('[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\n'
                   '[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, '
                   'OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, '
                   'Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, '
                   'MarginV, Encoding\nStyle: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,'
                   '&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1\n'
                   '[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'
                   'Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,Selective fixture\n')
    make('h264-ac3-ass.mkv', '-i', AC3, '-i', ass, '-map', '0:v:0', '-map', '0:a:0', '-map', '1:0')
    make('h264-ac3-pgs.mkv', '-i', AC3, '-i', PGS, '-map', '0:v:0', '-map', '0:a:0', '-map', '1:0')
    make('h264-ac3-long.mkv', '-stream_loop', '4', '-i', AC3, '-t', '150')


if __name__ == '__main__':
    main()
