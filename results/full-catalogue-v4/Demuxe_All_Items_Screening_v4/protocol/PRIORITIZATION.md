# Ranking every record

## What the ranking means

The full queue ranks the cheapest honest next decision. It is not a prediction of percentage savings, population prevalence, developer hours or runtime route selection. The starting scores are editorial judgments, recorded per item; the local source/workload audit can replace them with a documented reason.

Impact (I) concerns the potential value of the stated output/profile, not whether an idea is exotic:

| Impact | Meaning |
|---|---|
| I5 | A correct route/capability can avoid an expensive fallback or retain required media features. |
| I4 | Potentially substantial work on eligible playback, seeking, preparation, memory or repeated interaction. |
| I3 | Useful conditional stage or operation; workload must justify it. |
| I2 | Narrow format or intentionally altered-output specialty. |
| I1 | Low current value or very narrow infrastructure support. |

Exposure remains UNKNOWN until supported by actual local sources. `core-playback`, `conditional`, and `specialty-or-prepared` describe fit to this campaign, not observed prevalence. A niche route is not automatically common because it is native.

Screen effort (E) includes the observer and setup needed for the next honest decision:

| Grade | Bound |
|---|---|
| E0 | Source audit or exact existing API/prerequisite query; no candidate implementation. |
| E1 | Existing-harness/JS edit or tiny local probe with a ready oracle. |
| E2 | Localized native/integration patch with a compatible existing build and bounded test. |
| E3 | New architecture, difficult oracle, missing fixture family or specialized hardware. Screen the cost/precondition; defer implementation. |

Later qualification burden Q1–Q4 is independent: focused checks; several state/precision boundaries; integration/browser ownership; or new architecture/physical-output qualification. **Do not perform that work during first pass.** A Q4 feature can still have a valuable E0 gate.

## Deterministic starting bands

Lower band is earlier. This is a policy matrix, not measured science.

| Impact | E0 | E1 | E2 | E3 |
|---|---:|---:|---:|---:|
| I5 | 1 | 1 | 2 | 3 |
| I4 | 1 | 2 | 2 | 3 |
| I3 | 2 | 2 | 3 | 4 |
| I2 | 3 | 3 | 4 | 5 |
| I1 | 4 | 4 | 5 | 5 |

Within a band, prefer core-playback relevance, then conditional, then specialty; higher impact; lower screen cost; lower later qualification burden; and finally ID/key as a neutral tie-breaker. A final numeric tie-break does not make this numeric-order execution.

When a cheap API gate succeeds but implementation would be E3, finish the gate and record a bounded next-test/design recommendation. Do not ride that early rank into an unapproved rewrite. When a shared prerequisite fails, hold dependent items individually using the shared record, then select the next eligible item.

Existing reported screens are removed from the fresh lane and shown in the import/follow-up lanes. Before re-testing one, name what changed. Possible duplicates keep separate identities until contract equivalence is checked; reuse their evidence with an explicit mapping instead of running the same experiment again.

## Updating priority

```sh
python3 tools/screening.py reprioritize FULL_STABLE_KEY \
  --impact 4 --effort E1 --qualification Q2 --relevance core-playback \
  --reason "Existing trace exposes one avoidable copy and a ready ownership oracle."
```

This appends a priority decision without rewriting historical findings. The tool does not decide impact for the agent. Missing definitions are unscored and get source gates, not fictional low or high priorities.
