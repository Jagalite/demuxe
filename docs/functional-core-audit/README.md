# Supported runtime retained-state review

This inventory records explicit source review of supported first-party adapter storage and its pure owner or physical exception. It is not an exhaustive semantic proof from syntax and does not grant browser, performance, endurance, provider, or release qualification. Long runtime qualification remains deferred at the user's request.

Reproduce from the repository root, using the installed TypeScript dependency:

```sh
node scripts/audit-functional-core-fields.cjs . docs/functional-core-audit
python3 scripts/classify-functional-core-fields.py . docs/functional-core-audit
```

The scanner records declarations, reads, writes, recognized mutators, dynamic indexed writes, async functions and potential callback registrations. `reviewed-annotations.json` contains exact file/scope/field annotations. The classifier never approves fields by type, name, readonly syntax, or presence of a pure import. A missing supported annotation is `reviewPending`; a changed source hash is `sourceChanged`. Either makes classification fail. Re-review changed source before updating an annotation's SHA-256. Updating hashes alone does not establish review.

`ownership-fields.json` joins source locations with explicit authority, bounds and liveness notes. `source-hashes.json` records scanned shell, pure-machine and packaging/scope-guard files. The independent frozen `reviewed-source-hashes.json` is never overwritten by the scanner; any addition, deletion or changed hash fails classification until semantic re-review. `derived-facades.raw.json` lists methods/accessors excluded from storage (including computed presentation leases and custom-element getters). `reviewed-dynamic-writes.json` records the separately reviewed indexed writes, including property upgrade, native property projections and physical ABI/sample buffers. The classifier reconciles it with `dynamic-writes.raw.json`; missing or changed indexed writes fail the gate.

`async-closures.raw.json` and `callback-registrations.raw.json` are review leads, not automatically approved closures. Per-file resource annotations review the retained callback maps, serial chains, timers and external settlement assumptions which own them. These lists include false positives and can miss indirect scheduling, aliased callbacks, custom APIs and native retention. Module identifier matching is syntactic and may include shadowed references; mutations through aliases/getters/external objects require semantic review. Local scratch bindings and machine-value fields are not independently listed. Imported third-party/runtime internals and native memory are not proven bounded by this scan.

Supported scope follows `generated-runtime-files.mjs` public package closure plus explicit `package-beta.py` worker assets and their private helpers. Historical demos/benchmarks remain visible as excluded rows. The frozen empty qualified WebGPU registry and executable worker guard make its codec service/runtime/presenter dormant; activation requires a fresh ownership migration. See `../FUNCTIONAL-CORE-WORKER-SCOPE.md` for reachability evidence. Active WebGL/YUV rendering is included.

Bounds distinguish counts, byte budgets and borrowed inputs. Source track catalogs, declared provider manifests and caller-owned descriptors have finite input cardinality, not a universal constant. Public subscriber registration and hostile host cleanup promises are explicit exceptions, not internal queue proofs. Admission remains charged for native/provider work after logical cancellation where the physical operation cannot be canceled. Browser decoder, AudioContext, device and compilation liveness depends on actual settlement or worker containment. Timeout alone never proves physical release.

The source review found and repaired queue, attachment, intent, capability, worker, metadata, provider-cache and resource-acquisition gaps with focused regressions and old-code controls. Those focused receipts establish the exercised source behavior only. Deferred runtime qualification remains a separate handoff obligation.
