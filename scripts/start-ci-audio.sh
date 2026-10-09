#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

pulseaudio --start --exit-idle-time=-1
pactl info

# Default runner audio can delay the first playback clock by two seconds.
# A dedicated, unsuspended 48 kHz sink keeps native output checks within their
# normal budget. This supplies a clock; it does not qualify audible fidelity.
audio_modules=$(pactl list short modules)
while read -r module name _; do
  if [[ "$name" == "module-suspend-on-idle" ]]; then
    pactl unload-module "$module"
  fi
done <<< "$audio_modules"

audio_sinks=$(pactl list short sinks)
if ! awk '$2 == "demuxe_ci" {found=1} END {exit !found}' <<< "$audio_sinks"; then
  pactl load-module module-null-sink sink_name=demuxe_ci rate=48000 channels=2 norewinds=1
fi
pactl set-default-sink demuxe_ci
pactl info
pactl list short sinks
