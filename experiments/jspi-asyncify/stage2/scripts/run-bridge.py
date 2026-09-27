#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Common suite names retained; both engines use scripts/run-dual.py.
import pathlib,subprocess,sys
NAMES=['real-blob-read-seek-eof', 'short-read-retry', 'seek-boundaries', 'two-handle-independent-positions', 'cancel-observed-pending-read-late-completion', 'source-replacement-drops-stale-read', 'close-during-pending-read', 'cancel-after-ready-before-c-owner-resume', 'memory-growth-while-read-suspended', 'reader-rejection-unwinds-c', 'premature-zero-rejected', 'oversized-reader-result-rejected', 'pending-read-deadline', 'cancelled-handle-cannot-read-or-seek', 'cancel-one-handle-other-survives', 'source-generation-cannot-revive-old-handle', 'large-safe-offset-addressing', '100-open-read-close-cycles', 'pending-read-budget-enforced', 'seek-while-read-pending-rejected', 'unadmitted-uri-fails-closed', 'numeric-count-reader-rejected', 'nan-reader-rejected', 'infinity-reader-rejected', 'ready-reader-buffer-snapshotted', 'cancel-before-reader-call-avoids-work', 'invalid-resource-limits-rejected', 'host-stack-restored-while-suspended', 'stack-slot-abi-mismatch-rejected', 'reader-error-preserved-for-host-classification']
ROOT=pathlib.Path(__file__).resolve().parents[2]
if __name__=='__main__':
    sys.exit(subprocess.call([sys.executable,str(ROOT/'scripts/run-dual.py'),'--suites','range',*sys.argv[1:]]))
