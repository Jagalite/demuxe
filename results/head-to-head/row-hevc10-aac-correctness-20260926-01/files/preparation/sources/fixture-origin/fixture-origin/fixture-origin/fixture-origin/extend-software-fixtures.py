#!/usr/bin/env python3
"""Extend the frozen software test assets with baseline and specialist fixtures."""
import hashlib, json, shutil
from pathlib import Path

root = Path("build/head-to-head/assets-software-complete-01").resolve()
supplement = Path("build/head-to-head/assets-specialist-screen-02").resolve()
sha = lambda b: hashlib.sha256(b).hexdigest()

def verified_file(source_root, relative, manifest):
    record = manifest["files"].get(relative)
    source = source_root / relative
    if not record or not source.is_file() or sha(source.read_bytes()) != record["sha256"]:
        raise SystemExit(f"Unverified supplemental asset: {source}")
    return source

sup_manifest_bytes = (supplement / "manifest.json").read_bytes()
sup_manifest = json.loads(sup_manifest_bytes)
for folder in ("fixtures/specialist", "fixtures/library"):
    source_dir = supplement / folder
    if source_dir.exists():
        target_dir = root / folder
        if target_dir.exists():
            raise SystemExit(f"Refusing to overwrite {target_dir}")
        for item in source_dir.rglob("*"):
            if item.is_file():
                verified_file(supplement, item.relative_to(supplement).as_posix(), sup_manifest)
        shutil.copytree(source_dir, target_dir)

specialist = verified_file(supplement, "specialist.json", sup_manifest)
shutil.copyfile(specialist, root / "specialist.json")
(root / "preparation/specialist-parent-manifest.json").write_bytes(sup_manifest_bytes)
(root / "preparation/software-fixture-provenance.json").write_text(json.dumps({
    "specialistParent": str(supplement),
    "specialistParentManifestSha256": sha(sup_manifest_bytes),
    "specialistKeys": list(json.loads(specialist.read_text())),
    "baselineParent": str(root / "preparation/fixture-origin"),
    "baselineFiles": ["fixtures/aac.mp4", "fixtures/aac.mkv", "fixtures/pcm.mkv", "fixtures/captions.ass"]
}, indent=2) + "\n")

catalogue_path = root / "fixtures/catalogue.json"
catalogue = json.loads(catalogue_path.read_text())
for key, label, filename in [
    ("aac-mp4", "H.264 + AAC / MP4", "aac.mp4"),
    ("aac-mkv", "H.264 + AAC / MKV", "aac.mkv"),
    ("pcm-mkv", "H.264 + PCM24 / MKV", "pcm.mkv"),
]:
    if key in catalogue:
        raise SystemExit(f"Refusing to replace catalogue entry {key}")
    catalogue[key] = {"label": label, "file": filename, "video": True, "audio": True, "channels": 2}
catalogue_path.write_text(json.dumps(catalogue, indent=2) + "\n")

manifest_path = root / "manifest.json"
manifest = json.loads(manifest_path.read_text())
manifest["software_fixture_extension"] = {
    "script": "preparation/extend-software-fixtures.py",
    "baselineFixtureIds": ["aac-mp4", "aac-mkv", "pcm-mkv"],
    "specialistFixtureCount": len(json.loads(specialist.read_text())),
    "specialistParentManifestSha256": sha(sup_manifest_bytes)
}
manifest["files"] = {
    p.relative_to(root).as_posix(): {"sha256": sha(p.read_bytes()), "bytes": p.stat().st_size}
    for p in sorted(root.rglob("*")) if p.is_file() and p != manifest_path
}
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps({"catalogueFixtures": len(catalogue), "specialistFixtures": len(json.loads(specialist.read_text())), "manifestFiles": len(manifest["files"])}, indent=2))
