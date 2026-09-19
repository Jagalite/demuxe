# Package validation, not playback qualification

The local queue/bookkeeping utility passed 28 tests. Catalogue validation checked all 366 legacy slots, 425 records, and 60 registered source documents. All six handbook pages were rendered and visually inspected. These checks do not qualify the research hypotheses or assert that a Demuxe build passes.

The utility tests use temporary package copies. Synthetic decisions never enter the delivered ledger. The user-supplied local findings remain separately identified as reported evidence, not newly reproduced results.

The original R239–R246 and R268–R275 report bodies match their previously recorded SHA-256 values. Other extracted representations have their own explicit local hashes. Historical references to unbundled lab assets are listed separately; the package does not claim to include all raw run archives or fixture binaries.

Re-run `python3 tools/screening.py verify` for source/ledger integrity. `SHA256SUMS` describes the delivered snapshot; ledger/evidence files will legitimately change as screening proceeds.
