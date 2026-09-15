#!/bin/sh
# Run from LAB through ./run; fixture generation only, before browser testing this fixture.
ffmpeg -hide_banner -nostdin -y -f lavfi -i 'testsrc2=size=640x360:rate=30:duration=8.1' -f lavfi -i 'aevalsrc=0.1*sin(2*PI*440*t)+0.2*sin(2*PI*1000*t)*lt(mod(t\,1)\,0.03)|0.07*sin(2*PI*660*t)+0.15*sin(2*PI*1500*t)*lt(mod(t\,1)\,0.03):s=48000:d=7.417:c=stereo' -map 0:v -map 1:a -c:v libx264 -preset veryfast -crf 24 -g 60 -bf 2 -pix_fmt yuv420p -c:a pcm_s24le -output_ts_offset 2 -threads 2 results/risk-review-20260915T015230Z/web/edge.mkv
