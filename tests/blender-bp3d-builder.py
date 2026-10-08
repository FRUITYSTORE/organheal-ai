"""Focused checks and one real headless builder acceptance; no render."""
import sys
from pathlib import Path
from unittest.mock import patch
import tempfile
import json
import bpy
from mathutils import Matrix
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "render/blender"))
import bp3d_heart_builder as builder
import render_scene as dispatch

assert dispatch.resolve_asset_builder("heart", "heart-v2-development") is dispatch.build_heart
assert dispatch.resolve_asset_builder("heart", "heart-bp3d-4.0-internal-review-v1") is builder.build_bp3d_heart
try:
    dispatch.resolve_asset_builder("heart", "unknown")
    raise AssertionError("FALLBACK")
except SystemExit as error:
    assert str(error).startswith("ASSET_NOT_FOUND")

original = builder.ASSET_DIRECTORY
with tempfile.TemporaryDirectory(prefix="organheal-bp3d-builder-test-") as directory:
    test_root = Path(directory)
    (test_root / "selection-manifest.json").write_bytes((original / "selection-manifest.json").read_bytes())
    with patch.object(builder, "ASSET_DIRECTORY", test_root):
        try:
            builder.build_bp3d_heart()
            raise AssertionError("MISSING_ACCEPTED")
        except RuntimeError as error:
            assert str(error) == "BP3D_ASSET_MISSING"
        first = json.loads((test_root / "selection-manifest.json").read_text())["assets"]
        selected = next(a for a in first if a["representationId"] == builder.SELECTED[0])
        (test_root / selected["derivedFile"]).write_text("invalid hash")
        try:
            builder.build_bp3d_heart()
            raise AssertionError("HASH_ACCEPTED")
        except RuntimeError as error:
            assert str(error) == "BP3D_ASSET_HASH_INVALID"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
structures, materials = builder.build_bp3d_heart()
assert len(structures) == 14 and not materials
assets = builder.checked_assets()
assert set(structures) == {a["proposedOrganHealStructureId"] for a, _ in assets}
for asset, _ in assets:
    parent = structures[asset["proposedOrganHealStructureId"]]
    assert parent.name == f'BP3D_{asset["conceptId"]}_{asset["representationId"]}'
    assert len(parent.children) == len(asset["sources"])
    assert parent.matrix_world == Matrix.Identity(4)
    for child in parent.children:
        assert child.matrix_world == Matrix.Identity(4)
        assert all(not p.use_smooth for p in child.data.polygons)
assert len([obj for obj in bpy.data.objects if obj.name.startswith("LM_heart.bp3d.")]) == 6
print(f'BP3D_BUILDER_PASS structures=14 meshes={sum(o.type == "MESH" for o in bpy.data.objects)} objects={len(bpy.data.objects)} Blender={bpy.app.version_string}')
