<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Demuxe agent ownership

These files propose a hierarchy for ongoing auditing, implementation and independent verification of Demuxe. This is **documentation**, not a deployed scheduler, permission system or a request to run 40 writers concurrently.

| File | Purpose |
| --- | --- |
| [HIERARCHY.md](HIERARCHY.md) | Complete design: eight parent domains, 40 component cards, 120 narrow audit scopes, invariants, file boundaries, example tests, coordination and rollout |
| [domains.json](domains.json) | Structured navigation manifest for agents and future tooling; deliberately contains no implicit write grants |
| [TASK-TEMPLATE.md](TASK-TEMPLATE.md) | Bounded assignment, lease, evidence, acceptance and independent verification contract |

## Suggested rollout

Start with a coordinator, independent verification and **four non-overlapping active production-writing tasks**. Other agents can investigate and reproduce in read-only scopes. Use a task-specific base commit, write lease, checkout/worktree and runner allocation. Validate the complete physical behavior where appropriate, not only the policy module.

The 44-role detailed model consists of 40 component owners plus four shared coordination/verification roles. The eight parents are organizational nodes; the 120 smaller scopes are not independently writable packages by default.

The inspected baseline is main at d467c6bbe693bd64f142d62d391519883250792f (October 15, 2026 review). Refresh all source paths and the in-flight PR inventory before assigning new work. In particular, [draft PR #6](https://github.com/Jagalite/demuxe/pull/6) already addresses overlapping preview/navigation/replay behavior.

Do not reorganize the source tree to match the document without first proving a useful extraction seam. Obey [CONTRIBUTING.md](../../CONTRIBUTING.md) and [TESTING-STANDARD.md](../TESTING-STANDARD.md); the project’s existing contracts and license provenance rules remain authoritative.
