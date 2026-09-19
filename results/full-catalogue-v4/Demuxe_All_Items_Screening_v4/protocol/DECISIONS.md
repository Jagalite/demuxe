# Decisions and evidence are separate

| Decision | Meaning for first pass | Expected next action |
|---|---|---|
| ADVANCE_CONFIRMATION | Further investigation is worth its cost; not a production pass. | Record the smallest remaining confirmation, then move on. |
| DEFER_SETUP | Useful question but the next honest implementation/oracle exceeds the current scope. | Name the exact prerequisite and reopening condition. |
| STOP_PROFILE | Evidence closes the stated implementation/profile/outcome for now. | Preserve scope; do not turn it into a universal no-benefit claim. |
| ALREADY_IMPLEMENTED | Actual code already provides the relevant behavior. | Cite code and remaining coverage gaps; do not claim a new gain. |
| DUPLICATE | Another stable record covers the same hypothesis and output contract. | Identify that record and explain equivalence/differences. |
| INCONCLUSIVE | Current measurements or observation cannot decide. | State whether a bounded next test is worth it; do not keep looping. |
| HOLD_SOURCE | Required mechanism/source content cannot be recovered. | Keep it visible and continue elsewhere. |
| HOLD_ENV | A specific runtime/asset/origin/device prerequisite is unavailable. | Attach shared prerequisite evidence; not a universal rejection. |

Evidence levels: NONE, SOURCE_REVIEW, PREREQUISITE_PROBE, COMPONENT_TEST, REAL_PATH_SCREEN, IMPORTED_LOCAL_EVIDENCE. A favorable source review may justify further testing; it is not a benchmark. A browser accepting a preconverted file is a destination probe, not complete adaptation. User-reported local results remain user-reported until their actual artifacts are checked.

`REOPEN` is an explicit ledger event for a changed condition, not a new test verdict. Do not reopen merely because the queue restarted or a result was disappointing. The tool deliberately has no QUALIFIED/RELEASED decision: that phase is outside this assignment.

The inherited R74 disposition is translated to STOP_PROFILE for its stated CPU contract without overwriting the user's original NO_CURRENT_OPPORTUNITY wording. R27 is a later-test candidate; its initial evidence remains inconclusive relative to the declared threshold and deployment scope. R48's corrected boundary observer does not resolve every design question about cue virtualization.

Evidence files may be tiny source-audit notes. They must say what was inspected and what was not. Do not attach a general report and invent a claim that the local candidate executed. For REAL_PATH_SCREEN, provide the actual build/revision, effective candidate execution, no silent fallback and an adverse control.
