# Demuxe focused research batch 9

Four standalone preliminary screens, provisional D44–D47. Start with [REPORT.md](REPORT.md), then [LOCAL_AGENT_HANDOFF.md](LOCAL_AGENT_HANDOFF.md). Raw observations and 79 cross-record consistency assertions are in `evidence/`.

Main outcomes: unchanged multi-description MP4 works via MSE where direct playback fails; AVC recovery-point cold MSE startup fails; codec/container color conflicts require explicit authority; bounded short/long-block Vorbis decoding plus explicit cropping/scheduling preserves all requested samples, while untrimmed browser tails do not.

No maintained-player modifications, hardware/CPU/energy measurement, or universal compatibility claim. Scripts use synthetic media and local browser endpoints. Code is marked MIT where authored or reused; report text is CC BY 4.0. Synthetic test media is provided for reproducing these experiments. No third-party font files are included.

Run `python scripts/run_all.py` in a fresh copy with the captured environment. See the handoff for dependencies and scope.
