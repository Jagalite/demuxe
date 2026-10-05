# Scoped commit validation

The commit candidate contains only preview changes on top of HEAD. Layout, keyboard, native decoder, packaging, and other unrelated worktree changes were excluded, including overlapping edits in player/index.ts, player/components.ts and API inventory files. Generated preview/UI companions were compiled from this isolated source candidate; the working tree was not overwritten.

- Isolated TypeScript compilation passed.
- All 112 focused preview tests passed against isolated generated output.
- Consumer TypeScript check passed.
- Staged diff whitespace check passed.
- API inventory differs only in the three pre-existing Diagnostics, PlayerOptions and StartupEscalationOptions entries; preview exports and labels match. Those unrelated inventory corrections remain unstaged.

The other artifacts in this directory describe the earlier 864-case matrix and browser smoke in the combined working tree, not a new browser qualification of this isolated commit. Adaptive remains the default.
