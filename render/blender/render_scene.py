"""Entry point Blender runs headlessly:

    blender --background --python render_scene.py -- <scene_config.json> <output_path.png>

Proves the exact pipeline the architecture brief's Phase 4 asks for:
config JSON in -> Blender headless -> real GPU-rendered output file out,
with explicit error handling rather than a silent empty/corrupt file.

This renders a single representative still frame for the given scene (the
real camera + highlight selection this scene asks for). Heartbeat motion
across a multi-second clip is a real next increment, not faked here.
"""

import json
import os
import sys
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from heart_builder import build_heart  # noqa: E402
from scene_presets import apply_camera_preset, apply_highlight  # noqa: E402


def _parse_args():
    argv = sys.argv
    if "--" not in argv:
        raise SystemExit("INVALID_SCENE: expected `-- <scene_config.json> <output_path>`")
    after = argv[argv.index("--") + 1:]
    if len(after) < 2:
        raise SystemExit("INVALID_SCENE: missing scene_config.json or output_path")
    return after[0], after[1]


def _clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block_collection in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras):
        for block in list(block_collection):
            if block.users == 0:
                block_collection.remove(block)


def _configure_gpu_cycles(resolution):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 64
    sizes = {"720p": (1280, 720), "1080p": (1920, 1080)}
    scene.render.resolution_x, scene.render.resolution_y = sizes.get(resolution, sizes["1080p"])

    prefs = bpy.context.preferences.addons["cycles"].preferences
    for backend in ("OPTIX", "CUDA"):
        try:
            prefs.compute_device_type = backend
            prefs.get_devices()
            enabled = False
            for device in prefs.devices:
                if device.type in ("OPTIX", "CUDA"):
                    device.use = True
                    enabled = True
            if enabled:
                scene.cycles.device = "GPU"
                return backend
        except Exception:
            continue
    scene.cycles.device = "CPU"
    return "CPU"


def main():
    config_path, output_path = _parse_args()

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            scene_config = json.load(f)
    except (OSError, json.JSONDecodeError) as error:
        raise SystemExit(f"INVALID_SCENE: could not read scene config: {error}")

    if scene_config.get("organ") != "heart":
        raise SystemExit(f"INVALID_ORGAN: render_scene.py only builds 'heart', got {scene_config.get('organ')!r}")

    _clear_scene()

    try:
        objects, materials = build_heart()
    except Exception as error:
        raise SystemExit(f"ASSET_NOT_FOUND: heart_builder.build_heart() failed: {error}")

    apply_camera_preset(scene_config.get("camera", {}).get("preset", "CAM_HEART_OVERVIEW"))

    highlight = scene_config.get("highlight", {})
    apply_highlight(materials, highlight.get("structures", []), highlight.get("intensity", 0))

    key_light_data = bpy.data.lights.new("KeyLight", type="AREA")
    key_light_data.energy = 400
    key_light_data.size = 3
    key_light = bpy.data.objects.new("KeyLight", key_light_data)
    key_light.location = (2.5, -3.5, 2.5)
    bpy.context.collection.objects.link(key_light)

    fill_light_data = bpy.data.lights.new("FillLight", type="AREA")
    fill_light_data.energy = 150
    fill_light_data.size = 4
    fill_light = bpy.data.objects.new("FillLight", fill_light_data)
    fill_light.location = (-3.0, -2.0, 1.0)
    bpy.context.collection.objects.link(fill_light)

    bpy.context.scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.02, 0.05, 0.08, 1.0)

    backend = _configure_gpu_cycles(scene_config.get("output", {}).get("resolution", "1080p"))
    bpy.context.scene.render.filepath = output_path
    bpy.context.scene.render.image_settings.file_format = "PNG"

    try:
        bpy.ops.render.render(write_still=True)
    except Exception as error:
        raise SystemExit(f"BLENDER_FAILED: render.render() raised: {error}")

    if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        raise SystemExit("OUTPUT_VALIDATION_FAILED: output file missing or empty")

    print(f"RENDER_OK backend={backend} output={output_path}")


if __name__ == "__main__":
    main()
