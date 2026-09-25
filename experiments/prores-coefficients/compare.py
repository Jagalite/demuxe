#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Stream-compare all pre-IDCT ProRes metadata and quantized coefficients."""

import argparse
from pathlib import Path
import struct


class ParityMismatch(Exception):
    pass


def read_exact(stream, count: int) -> bytes:
    data = stream.read(count)
    if len(data) != count:
        raise ParityMismatch(f"truncated capture at offset {stream.tell()}: wanted {count} bytes")
    return data


def records(path: Path):
    with path.open("rb") as stream:
        if read_exact(stream, 4) != b"DPC1":
            raise ParityMismatch(f"{path}: wrong capture magic")
        while tag := stream.read(4):
            if tag == b"FRAM":
                frame, width, height, frame_type, pts = struct.unpack("<IIIIq", read_exact(stream, 24))
                yield ("frame", {"frame": frame, "width": width, "height": height,
                                 "frame_type": frame_type, "pts": pts})
            elif tag == b"SLIC":
                values = struct.unpack("<11I", read_exact(stream, 44))
                names = ("frame", "field", "slice", "mb_x", "mb_y", "mb_count",
                         "qscale", "y_bytes", "u_bytes", "v_bytes", "header_bytes")
                metadata = dict(zip(names, values))
                metadata["scan"] = tuple(read_exact(stream, 64))
                metadata["luma_matrix"] = tuple(read_exact(stream, 64))
                metadata["chroma_matrix"] = tuple(read_exact(stream, 64))
                yield ("slice", metadata)
            elif tag == b"COMP":
                frame, field, slice_index, component, blocks = struct.unpack("<5I", read_exact(stream, 20))
                coeffs = struct.unpack(f"<{blocks * 64}h", read_exact(stream, blocks * 128))
                yield ("component", {"frame": frame, "field": field, "slice": slice_index,
                                     "component": component, "blocks": blocks, "coefficients": coeffs})
            else:
                raise ParityMismatch(f"{path}: unknown tag {tag!r} at offset {stream.tell() - 4}")


def compare_captures(reference: Path, extraction: Path) -> dict:
    counts = {"frames": 0, "slices": 0, "components": 0, "blocks": 0, "coefficients": 0}
    ref_iter, ext_iter = records(reference), records(extraction)
    index = 0
    current_slice = None
    next_component = 0
    while True:
        left = next(ref_iter, None)
        right = next(ext_iter, None)
        if left is None and right is None:
            break
        if left is None or right is None:
            raise ParityMismatch(f"record {index}: capture lengths differ")
        if left[0] != right[0]:
            raise ParityMismatch(f"record {index}: type {left[0]} != {right[0]}")
        kind, expected = left
        actual = right[1]
        for name, value in expected.items():
            observed = actual[name]
            if value == observed:
                continue
            location = (f"frame={expected['frame']} field={expected.get('field', 0)} "
                        f"slice={expected.get('slice', 'n/a')}")
            if kind == "component":
                difference = next(i for i, (a, b) in enumerate(zip(value, observed)) if a != b) \
                    if name == "coefficients" else None
                if difference is not None:
                    location += (f" component={expected['component']} block={difference // 64} "
                                 f"index={difference % 64}")
                    value, observed = value[difference], observed[difference]
            elif name in ("scan", "luma_matrix", "chroma_matrix"):
                difference = next(i for i, (a, b) in enumerate(zip(value, observed)) if a != b)
                location += f" {name}[{difference}]"
                value, observed = value[difference], observed[difference]
            raise ParityMismatch(f"{location} {name}: reference={value} extraction={observed}")
        if kind == "frame":
            if current_slice is not None and next_component != 3:
                raise ParityMismatch(f"incomplete slice before frame {expected['frame']}")
            if expected["frame"] != counts["frames"]:
                raise ParityMismatch(f"nonsequential frame index: {expected['frame']}")
            counts["frames"] += 1
        elif kind == "slice":
            if current_slice is not None and next_component != 3:
                raise ParityMismatch(f"incomplete slice before {expected['frame']}:{expected['slice']}")
            current_slice = expected
            next_component = 0
            counts["slices"] += 1
        else:
            if current_slice is None or next_component != expected["component"]:
                raise ParityMismatch(f"unexpected component at frame={expected['frame']} "
                                     f"slice={expected['slice']} component={expected['component']}")
            for field in ("frame", "field"):
                if expected[field] != current_slice[field]:
                    raise ParityMismatch(f"component {field} does not match current slice")
            if expected["slice"] != current_slice["slice"]:
                raise ParityMismatch("component slice index does not match current slice")
            expected_blocks = current_slice["mb_count"] * (4 if next_component == 0 else 2)
            if expected["blocks"] != expected_blocks:
                raise ParityMismatch(f"frame={expected['frame']} slice={expected['slice']} "
                                     f"component={next_component}: expected {expected_blocks} blocks, "
                                     f"got {expected['blocks']}")
            next_component += 1
            counts["components"] += 1
            counts["blocks"] += expected["blocks"]
            counts["coefficients"] += expected["blocks"] * 64
        index += 1
    if current_slice is not None and next_component != 3:
        raise ParityMismatch("final slice is incomplete")
    if not counts["frames"] or not counts["coefficients"]:
        raise ParityMismatch("empty frame or coefficient capture")
    return {"status": "exact parity", **counts, "records": index}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reference", type=Path)
    parser.add_argument("extraction", type=Path)
    args = parser.parse_args()
    try:
        print(compare_captures(args.reference, args.extraction))
    except ParityMismatch as error:
        raise SystemExit(str(error)) from error
