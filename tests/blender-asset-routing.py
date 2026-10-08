"""Run in real headless Blender: dispatch identity only, no geometry changes."""
import importlib.util
import pathlib
import sys
sys.dont_write_bytecode = True
source = pathlib.Path(__file__).resolve().parents[1] / "render/blender/render_scene.py"
spec = importlib.util.spec_from_file_location("routing_review", source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
assert module.resolve_asset_builder("heart", "heart-v2-development") is module.build_heart
for organ, version, code in [
    ("heart", "unknown-heart-version", "ASSET_NOT_FOUND"),
    ("heart", "../heart_builder.py", "ASSET_NOT_FOUND"),
    ("heart", "build_heart", "ASSET_NOT_FOUND"),
    ("heart", None, "ASSET_NOT_FOUND"),
    ("heart", {"module": "heart_builder"}, "ASSET_NOT_FOUND"),
    ("lungs", "heart-v2-development", "INVALID_ORGAN"),
]:
    try:
        module.resolve_asset_builder(organ, version)
        raise AssertionError("unexpected builder")
    except SystemExit as error:
        assert str(error).startswith(code)
print("ASSET_DISPATCH_CHECKS_PASSED=7")
