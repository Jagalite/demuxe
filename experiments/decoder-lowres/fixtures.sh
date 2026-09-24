#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
mkdir -p build/decoder-lowres
ffmpeg -nostdin -hide_banner -loglevel error -y -f lavfi -i 'testsrc2=size=1920x1080:rate=30' -f lavfi -i 'sine=frequency=440:sample_rate=48000' -t 24 -vf 'drawgrid=width=120:height=120:thickness=2:color=white@0.8' -c:v mpeg2video -threads 4 -q:v 5 -pix_fmt yuv420p -g 30 -bf 2 -c:a mp2 -b:a 192k -f mpegts build/decoder-lowres/mpeg2-1080.ts
ffmpeg -nostdin -hide_banner -loglevel error -y -f lavfi -i 'testsrc2=size=1920x1080:rate=30' -f lavfi -i 'sine=frequency=550:sample_rate=48000' -t 24 -vf 'drawgrid=width=120:height=120:thickness=2:color=white@0.8' -c:v mpeg4 -threads 4 -q:v 4 -pix_fmt yuv420p -g 30 -bf 2 -c:a mp3 -b:a 160k build/decoder-lowres/mpeg4-1080.avi
ffmpeg -nostdin -hide_banner -loglevel error -y -f lavfi -i 'testsrc2=size=3840x2160:rate=30' -f lavfi -i 'sine=frequency=660:sample_rate=48000' -t 16 -vf 'drawgrid=width=240:height=240:thickness=4:color=white@0.8' -c:v mpeg2video -threads 4 -q:v 6 -pix_fmt yuv420p -g 30 -bf 2 -c:a mp2 -b:a 192k -f mpegts build/decoder-lowres/mpeg2-4k.ts
