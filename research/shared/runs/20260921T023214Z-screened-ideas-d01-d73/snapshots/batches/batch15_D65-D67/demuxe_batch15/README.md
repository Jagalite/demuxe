# Demuxe research batch 15

Three executed, scoped screens: D65 multiplexed Ogg page projection; D66 source-local track ID to stable native-lane mapping; D67 animated WebP cold seeking with native patch decoding.

Read [the report](REPORT.md), [the local-agent handoff](LOCAL_AGENT_HANDOFF.md), and [the verification record](evidence/verification.json). Reproduce with `python3 scripts/reproduce.py` in a copy of this directory. Requirements and limitations are in the handoff.

This package does not modify or benchmark the maintained Demuxe player. It includes successful components, explicit stop conditions, actual broken controls, setup corrections, and a clean replay. Callback-count variation in the wrong-video control remains recorded.
