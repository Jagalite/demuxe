#!/usr/bin/env python3
"""Summarize CPU-only windows and add qualified values to README pass cells."""
import hashlib
import json
import math
import statistics
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / "results/head-to-head/passing-cell-cpu-exploratory-20260923-01"
MEASUREMENT = OUT / "measurement"
README = ROOT / "README.md"
RUNS = MEASUREMENT / "runs"
CAMPAIGN_LINK = "results/head-to-head/passing-cell-cpu-exploratory-20260923-01/measurement/CPU-REPORT.md"
TIMELINE_REASON = "timeline did not advance at approximately 1x for the full window"
MIN_WINDOW_SECONDS = 19.75


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fmt(value):
    return f"{value:.1f}"


def compact_reason(record):
    reason = record.get("reason") or (record.get("measurement") or {}).get("exclusionReason")
    if not reason:
        return "no accepted steady window"
    if "fixtures/undefined" in reason or any(
        item.get("url", "").endswith("/undefined")
        for item in record.get("requestFailures", [])
        if isinstance(item, dict)
    ):
        return "source fixture unavailable (catalogue has no media file)"
    if "Timeout" in reason or "timeout" in reason.lower():
        return "did not reach measurement window before timeout"
    if TIMELINE_REASON in reason:
        return "timeline did not advance at approximately 1x"
    return "open failed before CPU window"


def run_link(record):
    return f"[r{record['round']}]({record['recordPath']})"


def main():
    plan = json.loads((OUT / "cells.json").read_text())
    summary_path = MEASUREMENT / "summary.json"
    summary = json.loads(summary_path.read_text())
    update_path = MEASUREMENT / "readme-update.json"
    previous_update = json.loads(update_path.read_text()) if update_path.exists() else {}
    by_cell = {cell["id"]: {"accepted": [], "stalled": [], "records": []} for cell in plan}

    for path in sorted(RUNS.glob("*/result.json")):
        record = json.loads(path.read_text())
        if record["id"] not in by_cell:
            continue
        record["recordPath"] = str(path.relative_to(MEASUREMENT))
        by_cell[record["id"]]["records"].append(record)
        measure = record.get("measurement") or {}
        cpu = measure.get("oneCorePercent")
        if isinstance(cpu, (int, float)) and math.isfinite(cpu) and measure.get("accepted"):
            by_cell[record["id"]]["accepted"].append(record)
        elif (
            record.get("status") == "excluded"
            and isinstance(cpu, (int, float))
            and math.isfinite(cpu)
            and measure.get("wallSeconds", 0) >= MIN_WINDOW_SECONDS
            and measure.get("stableProcesses") is True
            and measure.get("foreground") is True
            and measure.get("exclusionReason") == TIMELINE_REASON
        ):
            by_cell[record["id"]]["stalled"].append(record)

    cell_rows = []
    for cell in plan:
        data = by_cell[cell["id"]]
        accepted = sorted(data["accepted"], key=lambda record: record["round"])
        stalled = sorted(data["stalled"], key=lambda record: record["round"])
        records = sorted(data["records"], key=lambda record: record["round"])
        accepted_values = [(record["measurement"]["oneCorePercent"]) for record in accepted]
        stalled_values = [(record["measurement"]["oneCorePercent"]) for record in stalled]
        routes = sorted({
            route
            for record in records
            for route in (record.get("measurement") or {}).get("routeSamples", [])
        })
        if accepted_values:
            table_value = f"{fmt(statistics.median(accepted_values))}% CPU†"
            availability = "steady-window"
        elif stalled_values:
            table_value = f"{fmt(statistics.median(stalled_values))}% CPU‡"
            availability = "stalled-window"
        else:
            table_value = None
            availability = "unmeasured"

        failed = [record for record in records if record not in accepted and record not in stalled]
        failure_reasons = Counter(compact_reason(record) for record in failed)
        accepted_min = min(accepted_values) if accepted_values else None
        accepted_max = max(accepted_values) if accepted_values else None
        stalled_min = min(stalled_values) if stalled_values else None
        stalled_max = max(stalled_values) if stalled_values else None
        row = {
            **cell,
            "availability": availability,
            "tableCPU": table_value,
            "acceptedRounds": len(accepted),
            "acceptedMedianOneCorePercent": statistics.median(accepted_values) if accepted_values else None,
            "acceptedMinimumOneCorePercent": accepted_min,
            "acceptedMaximumOneCorePercent": accepted_max,
            "stalledRounds": len(stalled),
            "stalledMedianOneCorePercent": statistics.median(stalled_values) if stalled_values else None,
            "stalledMinimumOneCorePercent": stalled_min,
            "stalledMaximumOneCorePercent": stalled_max,
            "routes": routes,
            "failedRounds": len(failed),
            "failureReasons": dict(failure_reasons),
            "records": [record["recordPath"] for record in records],
        }
        cell_rows.append(row)

    counts = {
        "plannedCells": len(plan),
        "cellsWithAnyAcceptedWindow": sum(row["acceptedRounds"] > 0 for row in cell_rows),
        "cellsWithThreeAcceptedWindows": sum(row["acceptedRounds"] == 3 for row in cell_rows),
        "cellsWithPartialAcceptedWindows": sum(0 < row["acceptedRounds"] < 3 for row in cell_rows),
        "acceptedRounds": sum(row["acceptedRounds"] for row in cell_rows),
        "cellsWithStalledWindows": sum(row["stalledRounds"] > 0 for row in cell_rows),
        "stalledTimelineOnlyCells": sum(row["availability"] == "stalled-window" for row in cell_rows),
        "stalledTimelineOnlyRounds": sum(row["stalledRounds"] for row in cell_rows),
        "cellsWithCPUValueInReadme": sum(row["tableCPU"] is not None for row in cell_rows),
        "cellsWithoutCPUValue": sum(row["tableCPU"] is None for row in cell_rows),
        "fidelityLimitedCells": sum(cell["fidelityLimited"] for cell in plan),
        "attemptedRounds": len(list(RUNS.glob("*/result.json"))),
    }
    counts["excludedOrFailedRounds"] = counts["attemptedRounds"] - counts["acceptedRounds"]
    summary["readmeCellCPU"] = cell_rows
    summary["readmeCellCPUCounts"] = counts
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n")

    readme_before = README.read_text()
    original_lines = readme_before.splitlines()
    lines = list(original_lines)
    header_index = next(i for i, line in enumerate(lines) if line.startswith("| Media format |"))
    header = [part.strip() for part in lines[header_index].strip("|").split("|")]
    col_index = {name: i for i, name in enumerate(header)}
    row_indexes = {}
    inside = True
    for index in range(header_index + 1, len(lines)):
        line = lines[index]
        if not line.startswith("|"):
            break
        if line.startswith("| ---"):
            continue
        values = [part.strip() for part in line.strip("|").split("|")]
        if len(values) == len(header):
            row_indexes.setdefault(values[0], []).append(index)

    cell_updates = []
    for row in cell_rows:
        table_rows = row_indexes.get(row["readmeRow"], [])
        if len(table_rows) != 1:
            raise SystemExit(f"Expected one README row for {row['readmeRow']!r}; found {len(table_rows)}")
        index = table_rows[0]
        values = [part.strip() for part in lines[index].strip("|").split("|")]
        position = col_index[row["readmeColumn"]]
        current = values[position]
        expected = row["priorCell"]
        if row["tableCPU"] is None:
            if current != expected:
                raise SystemExit(f"Unmeasured cell changed since planning: {row['readmeRow']} / {row['readmeColumn']}: {current!r}")
            continue
        new_value = f"{expected} · {row['tableCPU']}"
        if current == new_value:
            cell_updates.append({
                "id": row["id"],
                "row": row["readmeRow"],
                "column": row["readmeColumn"],
                "priorCell": expected,
                "newCell": new_value,
                "line": index + 1,
                "alreadyPresent": True,
            })
            continue
        if current != expected:
            raise SystemExit(f"README cell changed since planning: {row['readmeRow']} / {row['readmeColumn']}: {current!r}")
        values[position] = new_value
        lines[index] = "| " + " | ".join(values) + " |"
        cell_updates.append({
            "id": row["id"],
            "row": row["readmeRow"],
            "column": row["readmeColumn"],
            "priorCell": expected,
            "newCell": new_value,
            "line": index + 1,
        })

    replacements = {
        "Except for the PCM24+ASS follow-up below, Demuxe auto and competitor CPU figures\nretain the earlier campaign; these competitor reruns collected no new CPU data.\nForced software CPU values are from the separate campaign linked above.":
        "This supplemental campaign adds CPU values only to previously blank green pass cells; existing CPU values remain from their original campaigns. The configured competitor reruns collected no CPU data. Forced software CPU values elsewhere are from the separate campaign linked above.",
        "Every numeric cell shows actual median CPU usage as a percentage of one CPU core (it can exceed 100%), not a relative gain. The **bold numeric cell** identifies the lowest median among lanes from the same matched campaign; the separately measured forced software values are not part of that ranking. Matched medians use three accepted rounds; this is not a claim about unmeasured players or statistical superiority. Orange numbers indicate higher measured CPU than the row’s reference; round ranges remain in the report. **Green (Pass)** means successful playback without a valid CPU measurement, not a tie or native decoding. `(Pass)*` marks a bounded playback screen with the row’s stated fidelity, profile or duration limit and no CPU median. `(Fail)` means that lane’s playback correctness check failed; it does not establish an unsupported format. N/A means no demonstrated playback result for this scope. Pinned Chrome/macOS evidence; supplemental real-bitstream screening is separate from the synthetic CPU campaign; renderer counters do not certify equal physical smoothness. Native in the original ASS case includes the host ASS renderer.":
        "Every numeric cell shows median CPU usage as a percentage of one Chrome process-family core (it can exceed 100%), not a relative gain. The **bold numeric cell** identifies the lowest median among lanes from the same matched campaign. Exploratory †/‡ readings do not enter that ranking. Existing matched medians use three accepted rounds; this is not a claim about unmeasured players or statistical superiority. † marks the separate pass-cell campaign: median of 1–3 focused, stable-process 20-second windows that advanced at approximately 1×. ‡ marks a median from full, focused stable-process CPU windows that stalled instead of advancing at approximately 1×; it is a measured stalled window, not steady-playback CPU. Round counts, ranges and records are in the linked CPU report. **Green (Pass)** preserves the historical bounded-playback result; supplemental CPU windows did not rerun its content-fidelity checks. `(Pass)*` marks the historical bounded screen with its stated fidelity, profile or duration limit. `(Fail)` means that lane’s playback correctness check failed; it does not establish an unsupported format. N/A means no demonstrated playback result for this scope. Pinned Chrome/macOS evidence; supplemental real-bitstream screening is separate; renderer counters do not certify equal physical smoothness. Native in the original ASS case includes the host ASS renderer."
    }
    text = "\n".join(lines)
    for old, new in replacements.items():
        if old in text:
            text = text.replace(old, new, 1)

    insertion = (
        f"\n\nThe [exploratory pass-cell CPU report]({CAMPAIGN_LINK}) adds readings to the 111 green pass cells that previously had no CPU value, including all 47 Pass* cells, without applying content-fidelity checks. It produced steady-window medians for 93 cells (90 with three accepted rounds), stalled-window readings for seven more cells, and no CPU reading for 11 cells with no available source fixture. † marks a median from 1–3 full, focused CPU windows advancing at approximately 1×; ‡ marks full stable CPU windows that stalled and must not be read as steady-playback cost. Historical playback labels remain unchanged."
    )
    anchor = "The [forced software CPU report](results/head-to-head/demuxe-software-performance-20260922-02/CPU-REPORT.md) contains 45 accepted three-round medians. The live HLS correctness screen passed bounded window progression, while two of its three 20-second CPU windows stopped advancing and were excluded. Software CPU values come from a separate campaign, so they are descriptive and do not enter the matched-lane bold minimums below."
    marker = "The [exploratory pass-cell CPU report]("
    if marker in text:
        start = text.index(marker)
        end = text.index("Historical playback labels remain unchanged.", start) + len("Historical playback labels remain unchanged.")
        text = text[:start] + insertion.strip() + text[end:]
    else:
        if anchor not in text:
            raise SystemExit("Could not find the CPU-report paragraph anchor in README")
        text = text.replace(anchor, anchor + insertion, 1)
    README.write_text(text + ("\n" if readme_before.endswith("\n") else ""))

    readme_after = README.read_text()
    update_record = {
        "schema": 1,
        "campaign": "passing-cell-cpu-exploratory-20260923-01",
        "readmePath": "README.md",
        "readmeBeforeSHA256": previous_update.get("readmeBeforeSHA256", hashlib.sha256(readme_before.encode()).hexdigest()),
        "readmeAfterSHA256": sha256(README),
        "updatedCells": cell_updates,
        "counts": counts,
        "valuePolicy": {
            "dagger": "Median of 1-3 accepted, 20-second, focused, stable-process CPU windows with approximately 1x timeline advancement.",
            "doubleDagger": "Median of full 20-second, focused, stable-process CPU windows excluded only because timeline advancement was below approximately 1x.",
            "fidelity": "No reference/content-fidelity checks were applied; historical pass labels were not changed.",
        },
    }
    update_path.write_text(json.dumps(update_record, indent=2, ensure_ascii=False) + "\n")

    steady = [row for row in cell_rows if row["availability"] == "steady-window"]
    stalled_only = [row for row in cell_rows if row["availability"] == "stalled-window"]
    unmeasured = [row for row in cell_rows if row["availability"] == "unmeasured"]
    all_stalled = [row for row in cell_rows if row["stalledRounds"]]
    report = [
        "# Exploratory CPU readings for previously blank pass cells",
        "",
        "This CPU-only campaign targeted every green `Pass` or `Pass*` README cell that lacked a percentage. It ran three rounds per cell where possible. It did not run correctness, output-fidelity, frame-cadence, subtitle, audio, seek, or EOF checks, and it did not change historical playback labels. Fidelity-limited cases were measured on the same CPU-only basis as other cells.",
        "",
        "## Reading the values",
        "",
        "- `†` is the median of 1–3 accepted CPU windows. Each window lasted about 20 seconds after a 5-second warmup; the browser stayed visible and focused, its process set stayed stable, and the media timeline advanced at approximately 1× for the full window.",
        "- `‡` is the median of full 20-second, visible/focused, stable-process CPU windows that failed only the approximately 1× timeline-advancement condition. These are measured stalled windows, not steady-playback CPU costs.",
        "- CPU is CDP-reported CPU time for the listed Chrome process family divided by wall time, expressed as percent of one core. The fixture server, external OS media services and GPU energy are excluded. The host was shared.",
        "- Counts and ranges are per cell. Round JSON records contain raw process samples, timeline advance, route, CPU window, and failures. No value was imputed for cells without an eligible CPU window.",
        "",
        "## Coverage",
        "",
        f"- Planned cells: **{counts['plannedCells']}**; accepted steady windows: **{counts['acceptedRounds']}** across **{counts['cellsWithAnyAcceptedWindow']}** cells ({counts['cellsWithThreeAcceptedWindows']} with 3/3 accepted; {counts['cellsWithPartialAcceptedWindows']} with 1–2/3).",
        f"- Stalled but fully sampled windows: **{counts['stalledTimelineOnlyRounds']}** across **{counts['cellsWithStalledWindows']}** cells; **{counts['stalledTimelineOnlyCells']}** cells have only these stalled readings and receive a `‡` value in the README.",
        f"- README values added: **{counts['cellsWithCPUValueInReadme']}** of {counts['plannedCells']} cells; no eligible CPU value: **{counts['cellsWithoutCPUValue']}** cells. {counts['fidelityLimitedCells']} cells were historically marked Pass*; these were not excluded for fidelity limitations.",
        f"- Attempts: **{counts['attemptedRounds']}**; accepted: **{counts['acceptedRounds']}**; excluded or failed to reach a window: **{counts['excludedOrFailedRounds']}**.",
        "",
        "## Per-cell readings",
        "",
        "| README row | Lane | CPU added to table | Accepted windows / range | Stalled windows / range | Route | Round records | Notes for missing windows |",
        "| --- | --- | ---: | --- | --- | --- | --- | --- |",
    ]
    for row in cell_rows:
        accepted_range = "—"
        if row["acceptedRounds"]:
            accepted_range = f"{row['acceptedRounds']}/3; {fmt(row['acceptedMinimumOneCorePercent'])}–{fmt(row['acceptedMaximumOneCorePercent'])}%"
        stalled_range = "—"
        if row["stalledRounds"]:
            stalled_range = f"{row['stalledRounds']}/3; {fmt(row['stalledMinimumOneCorePercent'])}–{fmt(row['stalledMaximumOneCorePercent'])}% (median {fmt(row['stalledMedianOneCorePercent'])}%‡)"
        route_text = ", ".join(row["routes"]) or "—"
        links = ", ".join(f"[{record['round']}]({record['recordPath']})" for record in sorted(by_cell[row['id']]['records'], key=lambda item: item['round']))
        notes = "—"
        if row["failedRounds"]:
            notes = "; ".join(f"{reason} ({n})" for reason, n in row["failureReasons"].items())
        cpu_added = row["tableCPU"] or "—"
        report.append(f"| {row['readmeRow']} | {row['readmeColumn']} | {cpu_added} | {accepted_range} | {stalled_range} | {route_text} | {links} | {notes} |")

    report += [
        "",
        "## Cells with stalled CPU windows",
        "",
        "The table reports a `†` value whenever at least one steady accepted window exists. It reports `‡` only when no steady window exists but full CPU windows were captured and rejected solely for timeline advancement. Stalled rounds are retained below even when a cell also has a steady value.",
        "",
        "| README row | Lane | Stalled rounds | Median CPU | Timeline advance per round |",
        "| --- | --- | --- | ---: | --- |",
    ]
    for row in all_stalled:
        stalled_records = [record for record in by_cell[row["id"]]["stalled"]]
        advances = ", ".join(f"r{record['round']}: {record['measurement']['timelineAdvance']:.2f}s/{record['measurement']['wallSeconds']:.2f}s" for record in sorted(stalled_records, key=lambda item: item["round"]))
        rounds = ", ".join(str(record["round"]) for record in sorted(stalled_records, key=lambda item: item["round"]))
        report.append(f"| {row['readmeRow']} | {row['readmeColumn']} | {rounds} | {fmt(row['stalledMedianOneCorePercent'])}% | {advances} |")

    report += [
        "",
        "## Cells with no CPU reading",
        "",
        "All three rounds for these cells failed to reach a full CPU window. The base specialist catalogue has no source media files for these blocked codecs/configurations; no substitute fixture was used.",
        "",
        "| README row | Lane | Round records |",
        "| --- | --- | --- |",
    ]
    for row in unmeasured:
        links = ", ".join(f"[{record['round']}]({record['recordPath']})" for record in sorted(by_cell[row["id"]]["records"], key=lambda item: item["round"]))
        reasons = "; ".join(f"{reason} ({n})" for reason, n in row["failureReasons"].items()) or "no CPU window"
        report.append(f"| {row['readmeRow']} | {row['readmeColumn']} | {links}; {reasons} |")
    report += [
        "",
        "## Reproduction and provenance",
        "",
        "The frozen asset snapshot, source/hash inventory, run plan, request logs, and per-round JSON are retained beside this report. The measurement harness and exact runtime/build snapshots are included in the campaign directory. The CPU-only runner did not apply the correctness gates used by the full head-to-head qualification runs.",
        "",
        "See [README measurement notes](../../../../README.md) and the [CPU protocol](../../../../docs/CPU-BASELINE.md).",
        "",
    ]
    (MEASUREMENT / "CPU-REPORT.md").write_text("\n".join(report))

    report_md = (
        "# Exploratory passing-cell CPU campaign\n\n"
        f"Targeted {counts['plannedCells']} previously blank green pass cells across five lanes. Added README readings to {counts['cellsWithCPUValueInReadme']} cells: {counts['cellsWithAnyAcceptedWindow']} have at least one steady accepted window, {counts['stalledTimelineOnlyCells']} have only stalled full CPU windows, and {counts['cellsWithoutCPUValue']} could not reach a CPU window because the source fixture was unavailable. {counts['acceptedRounds']} of {counts['attemptedRounds']} rounds were accepted; {counts['stalledTimelineOnlyRounds']} additional full windows stalled. No fidelity checks were run and historic pass labels were preserved.\n\n"
        "See [CPU-REPORT.md](CPU-REPORT.md) for medians, ranges, per-round records and exclusions. `†` marks a steady-window median; `‡` marks a stalled-window median that is not a steady-playback cost.\n"
    )
    (MEASUREMENT / "REPORT.md").write_text(report_md)

    manifest_path = MEASUREMENT / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["scope"] = "SHA-256 hashes of campaign scripts, request logs, reports, summaries, README update record and per-round records."
    manifest["sha256"] = {
        str(path.relative_to(MEASUREMENT)): sha256(path)
        for path in sorted(MEASUREMENT.rglob("*"))
        if path.is_file() and path != manifest_path
    }
    manifest["sha256"]["../files/summarize-and-update.py"] = sha256(OUT / "files/summarize-and-update.py")
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")

    print(json.dumps({"counts": counts, "readmeUpdatedCells": len(cell_updates), "unmeasured": [row['id'] for row in unmeasured], "report": str((MEASUREMENT / 'CPU-REPORT.md').relative_to(ROOT)), "readmeSha256": sha256(README)}, indent=2))


if __name__ == "__main__":
    main()
