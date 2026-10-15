<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Demuxe agent task and verification template

Use with [HIERARCHY.md](HIERARCHY.md) and [domains.json](domains.json). A domain card identifies where to investigate; it **never grants file write access**. Fill each placeholder before starting a task. Independent verification requires a different agent execution.

## Assignment

~~~yaml
task_id: "<unique identifier>"
repository: Jagalite/demuxe
scope_id: "<e.g. F02.cache, F02, F>"
scope_level: "<L1 | L2 | L3 | L4>"
mode: "<audit | reproduce | implement | verify>"
owner: "<agent execution identifier>"
independent_verifier: "<different agent execution identifier>"
base_commit: "<full immutable SHA>"
branch: "<isolated topic branch>"
objective: "<one falsifiable question or measurable improvement>"
claim_kind: "<hypothesis | reproduced-defect | qualification-gap | maintainability>"
non_goals:
  - "<what is expressly excluded>"
in_flight_work:
  checked_at: "<timestamp>"
  existing_prs: []
  collision_resolution: "<none | review existing | depend on existing | handoff>"
source_anchors: []       # read targets, not a permission grant
read_dependencies: []    # related callers, consumers, tests, assets
allowed_write_paths: []  # exact paths, including additions/deletions; no directories
shared_contracts: []
reviewing_domains: []
lease:
  lease_id: "<grant ID, or null if read-only>"
  generation: "<current generation>"
  expires_at: "<expiry>"
  granted: false
workspace:
  checkout: "<isolated worktree or checkout>"
  generated_outputs: "<task-specific build path>"
  runtime_assets: "<identified immutable asset set, if applicable>"
  browser_profile: "<task-unique path, if applicable>"
  server_ports: []
  results_directory: "<unique task/run path>"
verification:
  lanes: []  # V0 structural, V1 deterministic, V2 browser, V3 native/artifact, V4 performance
  host_lease: null
  exclusive_benchmark_host: false
acceptance:
  invariant: "<the behavior that must remain true>"
  baseline_reproduction: "<commands, fixture, observable result>"
  independent_oracle: "<why this expected result is correct>"
  negative_cases: []
  exact_commands: []
  artifact_identity: []
  observable_output: []
  cleanup_and_resource_checks: []
  integration_recheck: "<how to test after rebasing/integration>"
  stop_condition: "<verified fix | no-change result | bounded handoff>"
  rollback: "<clear rollback path>"
~~~

## Agent instructions

1. Check the baseline SHA, relevant scope card, current PR inventory, source and test contracts. Distinguish a confirmed failure from a static risk or a missing qualification.
2. Inspect all relevant policy and effect/runtime implementations. Identify neighboring reviewers and list exact paths before requesting a lease.
3. Reproduce a reported defect or document why reproduction is not currently possible. Preserve baseline failures. Never invent a baseline or assume that an unchecked fixture passed.
4. Modify only explicitly leased files. Request a new lease or transfer ownership before changing a shared contract, another component's file, a generated artifact, a golden result, or a test-gate definition.
5. Produce the smallest justified implementation and appropriate negative/regression tests. A no-change finding with evidence is a successful outcome.
6. Review every changed commit, run relevant deterministic checks, and run physical/browser/native/artifact gates when the changed behavior requires them. Use Demuxe's testing standard for performance work and never run competing benchmarks on an exclusive host.
7. Have an independent verifier assess assertions, oracle quality, actual behavior, and cross-domain consequences. Rerun checks on the integrated candidate if its base or dependency changes.
8. Stop at the bounded acceptance condition. Do not merge, alter repository settings, publish artifacts or initiate recurring work without separate authorization.

## Result report

~~~yaml
task_id: "<same ID>"
status: "<verified | no-change | rejected | blocked | needs-integration>"
base_commit: "<SHA>"
candidate_commit: "<SHA or null>"
integrated_commit: "<SHA or null>"
claim: "<evidence-supported result>"
claim_classification: "<reproduced-defect | static-only | qualification-gap | hypothesis | not-an-issue>"
changed_paths: []
reviewed_contracts: []
verification:
  independent_verifier: "<execution identifier>"
  commands: []           # command, environment, exit status, assertion counts, logs
  browser: "<version/OS/flags/profile/viewport or not applicable>"
  runtime_artifacts: []  # source commit, archive, manifest and file hashes
  fixtures: []           # fixture identities/hashes
  physical_output: "<observed output, progression and teardown>"
  performance: "<protocol, raw samples and rejected windows or not applicable>"
  passed: []
  failed: []
  skipped: []
  not_run: []
remaining_risk: []
follow_up: "<explicit work item or closure rationale>"
rollback: "<how to reverse it>"
~~~

Do not claim browser correctness from a pure reducer test, or performance wins from incidental CPU readings. Preserve rejected evidence. The agent who wrote the change must not approve its own verification.
