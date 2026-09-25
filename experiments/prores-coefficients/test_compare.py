#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Small comparator checks; the full fixture is verified by run.py."""

from pathlib import Path
import struct
import tempfile
import unittest

from compare import ParityMismatch, compare_captures


def write_capture(path: Path, changed: bool) -> None:
    with path.open("wb") as out:
        out.write(b"DPC1FRAM")
        out.write(struct.pack("<IIIIq", 0, 16, 16, 0, 0))
        out.write(b"SLIC")
        out.write(struct.pack("<11I", 0, 0, 0, 0, 0, 1, 4, 8, 4, 4, 8))
        out.write(bytes(range(64)) * 3)
        for component, blocks in ((0, 4), (1, 2), (2, 2)):
            coefficients = [0] * (blocks * 64)
            if changed and component == 1:
                coefficients[64 + 7] = -3
            out.write(b"COMP")
            out.write(struct.pack("<5I", 0, 0, 0, component, blocks))
            out.write(struct.pack(f"<{len(coefficients)}h", *coefficients))


class CompareTest(unittest.TestCase):
    def test_exact_and_first_coefficient_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            reference = Path(directory) / "reference.dpc"
            extraction = Path(directory) / "extraction.dpc"
            write_capture(reference, False)
            write_capture(extraction, False)
            self.assertEqual(compare_captures(reference, extraction)["coefficients"], 512)
            write_capture(extraction, True)
            with self.assertRaisesRegex(
                ParityMismatch, r"frame=0 field=0 slice=0 component=1 block=1 index=7"
            ):
                compare_captures(reference, extraction)


if __name__ == "__main__":
    unittest.main()
