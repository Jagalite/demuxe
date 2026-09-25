# Benchmark protocol validation — 2026-09-25

This validates harness behavior, not lower CPU variance or a new player ranking.
Installed headed Chrome 153.0.8010.53 was used; no browser pin is required.

- Main catalogue: 2/2 fresh correctness cases passed (plain video and Demuxe Auto,
  exact frozen H.264/AAC MP4), followed by 6/6 accepted 20-second CPU windows in
  three alternating comparison blocks.
- Browser PID pairs by round: `[77177, 77177]`, `[79063, 79063]`,
  `[81486, 81486]`. This confirms reuse within each pair and relaunch between pairs.
  Each block closed with zero remaining observed Chrome processes.
- Actual CPU windows: 20.0011–20.0021 seconds. All six used `native-direct`.
- Campaign progress advanced across the two commands from 0/8 to 8/8;
  final ETA was zero. Countdown fields and cross-step ETA budgeting have unit coverage.
- Specialist: 1/1 HEVC Main10/AAC screen passed, then two CPU rounds reused that
  same screen. Both CPU windows were accepted (20.0048 and 20.0027 seconds).
  Recorded audio-observer arrays were empty during CPU playback. The composite
  specialist campaign finished 3/3, and source/asset/evidence hashes verified.
- 23 Node contract tests and 3 report tests passed, including process turnover,
  counter resets, deadline scheduling, browser ownership, cleanup failure,
  global progress counts, and three/default versus five/optional CPU rounds.
- Main and specialist evidence integrity checks passed. Final cleanup-failure
  refinements are covered by the contract tests; pilot folders retain their exact
  captured source snapshots.

Sources: [main correctness](../benchmark-protocol-20260925-correctness-02/summary.json),
[main CPU](../benchmark-protocol-20260925-cpu-02/summary.json),
[campaign plan](plan.json),
[specialist campaign](../benchmark-protocol-20260925-specialist-campaign/campaign.json).

The earlier `benchmark-protocol-20260925-*-01` pilot used the provisional launch
per arm policy; it remains separate. The final default is three CPU rounds,
with five available for targeted follow-up. No README table or production route
was changed, and the complete release campaign was not rerun in this task.
