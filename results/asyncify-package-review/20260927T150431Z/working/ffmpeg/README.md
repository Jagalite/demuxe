# Standalone FFmpeg — separate serialized candidate
The media algorithms and Promise host contract are shared; final-link JSPI and Asyncify artifacts remain distinct.
See `../docs/BUILD_AND_TEST.md` for prepared build commands.

`runtime/ffmpeg-bridge.mjs` uses `SingleOwner`, not the raw multi-task mpv driver.
Unexpected `ccall` rejection/trap or shutdown timeout marks `requiresDiscard=true`; do not enter that module again.
A negative C result, a pre-entry busy rejection, or a reader error mapped to the normal C failure path is not automatically a runtime trap.
Terminal failures retain their cause. Disposal is the host's responsibility; stopped/abandoned C execution is not completed teardown.

The setup now rejects wildcard/duplicate/unreviewed JSPI exports and statically audits defined memory.
`--saved-stack-bytes` changes only the explicit Asyncify saved-state budget. Indirect-call coverage is retained.
Prepared scripts still require a full local library build and media comparison; this package has not executed FFmpeg libraries.
