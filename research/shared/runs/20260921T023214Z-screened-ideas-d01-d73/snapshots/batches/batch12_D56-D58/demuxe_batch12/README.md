<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Demuxe batch 12 — D56–D58

Start with REPORT.md and LOCAL_AGENT_HANDOFF.md. Three actual standalone screens: VP9 picture recalls versus long holds; sparse WAVE held samples into native scheduling; bounded-error native IIR preview windows. No whole-player or performance qualification.

Replay in a new copy with `python scripts/run_all.py`. It overwrites that copy's evidence. Python numpy/playwright, Chromium and FFmpeg with libvpx are needed. Sources, generated fixtures, raw observations, negative controls and consistency checks are included.

`initial_without_fact_*` contains an invalid initial WAVE fixture run, retained for audit and excluded from positive source-admission evidence. Final source includes and validates required FACT. The S16 dense-WAVE browser scaling difference and all negative picture/state cases remain recorded.
