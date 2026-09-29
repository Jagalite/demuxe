#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Common suite names retained; both engines use scripts/run-dual.py.
import pathlib,subprocess,sys
NAMES=['mutex-first-lock-trylock', 'producer-consumer-100', '400-create-join-stack-integrity', 'yielding-once-8-callers', '10-monotonic-timed-waits', '50-signal-timer-cleanups', 'mpv-dispatch-80-synchronous-calls', 'mpv-dispatch-coalesce-cancel', 'mpv-dispatch-lock-exclusion-during-async-blob-read', 'mpv-pool-100-jobs-and-destruction', 'detached-coroutine-cleanup', 'mpv-pool-real-10-second-idle-retirement', 'mpv-dispatch-100-create-destroy-cycles', 'read-error-unwind', 'stack-capacity-fail-closed']
ROOT=pathlib.Path(__file__).resolve().parent
if __name__=='__main__':
    sys.exit(subprocess.call([sys.executable,str(ROOT/'scripts/run-dual.py'),'--suites','units',*sys.argv[1:]]))
