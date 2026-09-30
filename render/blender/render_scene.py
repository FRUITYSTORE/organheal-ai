"""Entry point Blender runs headlessly:

    blender --background --python render_scene.py -- <scene_config.json> <output_path.png|.mp4>

Config JSON in (written by lib/medical-motion/render/blender-renderer.ts,
with anatomy and landmark ids already resolved to object names) ->
Blender headless -> real GPU-rendered output file out, with explicit error
handling rather than a silent empty/corrupt file.

output.media "still" renders one PNG frame at the scene's shot. "video"
renders an MP4 of durationSeconds: the camera glides from camera.fromShot
to camera.shot, the motion controller runs (heart_motion.py), and the
highlight fades in once the camera arrives.
"""

import json
import os
import sys
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from heart_builder import build_heart  # noqa: E402
from heart_motion import MOTION_CONTROLLERS  # noqa: E402
from scene_presets import apply_camera_move, apply_camera_shot, apply_highlight, camera_shot_objects  # noqa: E402

_VIDEO_FPS = 24
_CAMERA_ARRIVAL_FRACTION = 0.45
_HIGHLIGHT_FADE_FRAMES = 12


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
                # The denoiser otherwise runs on the CPU while the GPU
                # idles: measured on a 24-frame clip, 150-240 s with it on
                # the CPU versus 43 s with it on the GPU.
                scene.cycles.denoising_use_gpu = True
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
        build_heart()
    except Exception as error:
        raise SystemExit(f"ASSET_NOT_FOUND: heart_builder.build_heart() failed: {error}")

    # The render layer (lib/medical-motion/render/blender-renderer.ts) maps
    # anatomy and landmark ids to these object names through the organ
    # module. A name the build didn't produce means the module promised
    # something the asset lacks: fail, rather than render without it and
    # "succeed".
    camera = scene_config.get("camera", {})
    shot = camera.get("shot")
    from_shot = camera.get("fromShot")
    if not shot:
        raise SystemExit("INVALID_SCENE: the scene config has no resolved camera shot")
    highlight = scene_config.get("highlight", {})
    structures = highlight.get("structures", [])
    needed = structures + camera_shot_objects(shot) + (camera_shot_objects(from_shot) if from_shot else [])
    missing = [name for name in needed if name not in bpy.data.objects]
    if missing:
        raise SystemExit(f"ANATOMY_STRUCTURE_NOT_FOUND: the built heart has no object named {missing}")

    output = scene_config.get("output", {})
    is_video = output.get("media") == "video"
    scene = bpy.context.scene

    if is_video:
        motion_name = scene_config.get("motion", {}).get("preset")
        motion = MOTION_CONTROLLERS.get(motion_name)
        if motion is None:
            raise SystemExit(f"INVALID_SCENE: no motion controller named {motion_name!r}")
        frame_count = max(1, round(float(scene_config.get("durationSeconds", 0)) * _VIDEO_FPS))
        scene.frame_start, scene.frame_end = 1, frame_count
        scene.render.fps = _VIDEO_FPS
        # The camera arrives a little under halfway through, then the
        # highlight fades in on the structures it arrived at.
        arrive = max(2, round(frame_count * _CAMERA_ARRIVAL_FRACTION)) if from_shot else 1
        if from_shot:
            apply_camera_move(from_shot, shot, arrive)
        else:
            apply_camera_shot(shot)
        motion(frame_count, _VIDEO_FPS)
        apply_highlight(structures, highlight.get("intensity", 0), fade_frames=(arrive, arrive + _HIGHLIGHT_FADE_FRAMES))
    else:
        apply_camera_shot(shot)
        apply_highlight(structures, highlight.get("intensity", 0))

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

    backend = _configure_gpu_cycles(output.get("resolution", "1080p"))
    scene.render.filepath = output_path

    try:
        if is_video:
            image_settings = scene.render.image_settings
            if hasattr(image_settings, "media_type"):
                image_settings.media_type = "VIDEO"
            image_settings.file_format = "FFMPEG"
            scene.render.ffmpeg.format = "MPEG4"
            scene.render.ffmpeg.codec = "H264"
            scene.render.ffmpeg.constant_rate_factor = "HIGH"
            scene.render.ffmpeg.audio_codec = "NONE"
            bpy.ops.render.render(animation=True)
        else:
            scene.render.image_settings.file_format = "PNG"
            bpy.ops.render.render(write_still=True)
    except Exception as error:
        raise SystemExit(f"BLENDER_FAILED: render.render() raised: {error}")

    if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        raise SystemExit("OUTPUT_VALIDATION_FAILED: output file missing or empty")

    print(f"RENDER_OK backend={backend} output={output_path}")


if __name__ == "__main__":
    main()
