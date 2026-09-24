#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
mkdir -p build/yuv-cpu-investigation
ffmpeg -nostdin -hide_banner -loglevel error -y -f lavfi -i 'testsrc2=size=960x540:rate=30' -f lavfi -i 'sine=frequency=440:sample_rate=48000' -t 38 -c:v mpeg2video -q:v 6 -pix_fmt yuv420p -c:a ac3 -b:a 192k -f mpegts build/yuv-cpu-investigation/mpeg2-ac3.ts
ffmpeg -nostdin -hide_banner -loglevel error -y -f lavfi -i 'testsrc2=size=960x540:rate=30' -f lavfi -i 'sine=frequency=660:sample_rate=48000' -t 38 -c:v mpeg2video -q:v 6 -pix_fmt yuv420p -c:a mp2 -b:a 192k -f vob build/yuv-cpu-investigation/mpeg2-mp2.mpg
ffmpeg -nostdin -hide_banner -loglevel error -y -f lavfi -i 'testsrc2=size=960x540:rate=30' -f lavfi -i 'sine=frequency=880:sample_rate=48000' -t 38 -c:v mpeg4 -q:v 5 -pix_fmt yuv420p -c:a mp3 -b:a 160k build/yuv-cpu-investigation/mpeg4-mp3.avi
ffmpeg -nostdin -hide_banner -loglevel error -y -f lavfi -i 'testsrc2=size=640x360:rate=24' -f lavfi -i 'sine=frequency=330:sample_rate=48000' -t 18 -c:v prores_ks -profile:v 0 -pix_fmt yuv422p10le -c:a pcm_s16le build/yuv-cpu-investigation/prores-pcm.mov
ffmpeg -nostdin -hide_banner -loglevel error -y -f lavfi -i 'testsrc2=size=320x240:rate=30' -t 6 -c:v libx264 -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 build/yuv-cpu-investigation/rotation-base.mp4
ffmpeg -nostdin -hide_banner -loglevel error -y -display_rotation:v:0 90 -i build/yuv-cpu-investigation/rotation-base.mp4 -c copy build/yuv-cpu-investigation/rotation.mp4
ffmpeg -nostdin -hide_banner -loglevel error -y -f lavfi -i 'nullsrc=size=65x49:rate=30:duration=6,format=yuv420p' -color_primaries bt470bg -color_trc bt709 -colorspace smpte170m -chroma_sample_location left -c:v ffv1 build/yuv-cpu-investigation/odd-yuv420p.mkv
shasum -a 256 build/yuv-cpu-investigation/{mpeg2-ac3.ts,mpeg2-mp2.mpg,mpeg4-mp3.avi,prores-pcm.mov,rotation.mp4,odd-yuv420p.mkv}
