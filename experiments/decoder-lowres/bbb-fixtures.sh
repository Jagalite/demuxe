#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
# Big Buck Bunny sample: (c) 2008 Blender Foundation, CC BY 3.0.
# https://github.com/bower-media-samples/big-buck-bunny-1080p-60fps-30s
set -euo pipefail
mkdir -p build/decoder-lowres
source=build/decoder-lowres/bbb-source.mp4
if [ ! -s "$source" ]; then
 curl -fL --silent --show-error https://raw.githubusercontent.com/bower-media-samples/big-buck-bunny-1080p-60fps-30s/master/video.mp4 -o "$source"
fi
ffmpeg -nostdin -hide_banner -loglevel error -y -ss 3 -i "$source" -t 24 -vf fps=30 -c:v mpeg2video -threads 4 -q:v 5 -pix_fmt yuv420p -g 30 -bf 2 -c:a mp2 -b:a 192k -f mpegts build/decoder-lowres/bbb-mpeg2-1080.ts
ffmpeg -nostdin -hide_banner -loglevel error -y -ss 3 -i "$source" -t 24 -vf fps=30 -c:v mpeg4 -threads 4 -q:v 4 -pix_fmt yuv420p -g 30 -bf 2 -c:a mp3 -b:a 160k build/decoder-lowres/bbb-mpeg4-1080.avi
