# Startup standard validation

Shared CpuBrowserBlocks completed a fresh installed-Chrome launch, confirmed the completed hardware-key startup task, stopped tracing, observed 20 seconds idle, and retired all tracked Chrome processes. See blocks.json for exact identity, task event, idle samples and cleanup.

Whole idle CPU: 1.39%; browser: 0.33% of one core. This is readiness validation, not another playback campaign.

Automated validation: 26 Node contract/measurement tests and 3 report tests passed (the final added success-path gate test was run with the 13-test shared-helper suite). README, production code, and routing unchanged. No AGENTS.md added.
