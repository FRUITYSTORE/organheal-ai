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
from bp3d_heart_builder import build_bp3d_heart  # noqa: E402
from ssm_heart_builder import build_ssm_heart  # noqa: E402
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


def _configure_video_timing(scene, timing):
    """Consume TS duration-policy output; never independently round duration.

    Validate the transport and runtime ceiling to prevent Blender clamping.
    Inclusive start/end and step 1 yield exactly frameCount encoded frames.
    """
    if not isinstance(timing, dict):
        raise SystemExit("INVALID_SCENE: missing videoTiming")
    keys = ("fps", "fpsBase", "frameStep", "frameStart", "frameEnd", "frameCount")
    if any(type(timing.get(key)) is not int for key in keys):
        raise SystemExit("INVALID_SCENE: invalid videoTiming numbers")
    count = timing["frameCount"]
    if (timing["fps"] != _VIDEO_FPS or timing["fpsBase"] != 1 or
            timing["frameStep"] != 1 or timing["frameStart"] != 1 or
            timing["frameEnd"] != count or count < 1 or
            count > scene.bl_rna.properties["frame_end"].hard_max):
        raise SystemExit("INVALID_SCENE: unsupported videoTiming")
    scene.render.fps = timing["fps"]
    scene.render.fps_base = timing["fpsBase"]
    scene.frame_step = timing["frameStep"]
    scene.frame_start, scene.frame_end = timing["frameStart"], timing["frameEnd"]
    return count


def _clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block_collection in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras):
        for block in list(block_collection):
            if block.users == 0:
                block_collection.remove(block)


def _configure_output_dimensions(scene, dimensions):
    """Apply TS-resolved pixel dimensions without a competing ratio matrix."""
    if not isinstance(dimensions, dict):
        raise SystemExit("INVALID_SCENE: missing outputDimensions")
    render = scene.render
    for key, setting in (("width", "resolution_x"), ("height", "resolution_y")):
        value = dimensions.get(key)
        prop = render.bl_rna.properties[setting]
        if type(value) is not int or not prop.hard_min <= value <= prop.hard_max:
            raise SystemExit(f"INVALID_SCENE: invalid outputDimensions.{key}")
    render.resolution_x = dimensions["width"]
    render.resolution_y = dimensions["height"]
    render.resolution_percentage = 100
    render.pixel_aspect_x = 1
    render.pixel_aspect_y = 1
    render.use_border = False
    render.use_crop_to_border = False


def _configure_render_state(scene, output, output_path):
    """Backend encoding policy for the existing PNG / MP4-H264 contract.

    Preserve factory encoding channel/depth behavior explicitly. Scene color
    transform, samples, denoising and encoder speed remain visual/performance
    policy. No startup compositor or sequencer may replace the anatomy render.
    """
    if not isinstance(output, dict) or output.get("media") not in ("still", "video"):
        raise SystemExit("INVALID_SCENE: unsupported output.media")
    if not isinstance(output_path, str) or not output_path.strip():
        raise SystemExit("INVALID_SCENE: missing output filepath")
    render = scene.render
    render.engine = "CYCLES"  # Existing engine-specific Cycles pipeline.
    render.filepath = output_path
    render.use_file_extension = False  # Write to the exact caller-provided path.
    render.use_overwrite = True
    render.use_placeholder = False
    render.use_sequencer = False
    render.use_compositing = False
    render.use_multiview = False
    render.frame_map_old = 100
    render.frame_map_new = 100
    scene.frame_set(1)
    image = render.image_settings
    # Keep the background the script explicitly lights; no inherited alpha film.
    render.film_transparent = False
    image.color_management = "FOLLOW_SCENE"
    if output["media"] == "video":
        image.media_type = "VIDEO"
        image.file_format = "FFMPEG"
        image.color_mode = "RGB"
        image.color_depth = "8"
        render.ffmpeg.format = "MPEG4"
        render.ffmpeg.codec = "H264"
        render.ffmpeg.constant_rate_factor = "HIGH"
        render.ffmpeg.audio_codec = "NONE"
        render.ffmpeg.use_autosplit = False
        render.ffmpeg.use_lossless_output = False
    else:
        image.media_type = "IMAGE"
        image.file_format = "PNG"
        image.color_mode = "RGBA"
        image.color_depth = "8"


def _configure_gpu_cycles():
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 64

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


_ASSET_BUILDERS = {("heart", "heart-v2-development"): build_heart,
                   ("heart", "heart-bp3d-4.0-internal-review-v1"): build_bp3d_heart,
                   ("heart", "heart-ssm-4506463-v2-internal-review-v1"): build_ssm_heart}


def resolve_asset_builder(organ, asset_version):
    if organ != "heart":
        raise SystemExit("INVALID_ORGAN: unsupported organ")
    if not isinstance(asset_version, str):
        raise SystemExit("ASSET_NOT_FOUND: exact asset version required")
    builder = _ASSET_BUILDERS.get((organ, asset_version))
    if builder is None:
        raise SystemExit("ASSET_NOT_FOUND: unknown asset version")
    return builder


def main():
    config_path, output_path = _parse_args()

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            scene_config = json.load(f)
    except (OSError, json.JSONDecodeError) as error:
        raise SystemExit(f"INVALID_SCENE: could not read scene config: {error}")

    if scene_config.get("organ") != "heart":
        raise SystemExit(f"INVALID_ORGAN: render_scene.py only builds 'heart', got {scene_config.get('organ')!r}")

    builder = resolve_asset_builder(scene_config.get("organ"), scene_config.get("assetVersion"))
    _configure_output_dimensions(bpy.context.scene, scene_config.get("outputDimensions"))
    _configure_render_state(bpy.context.scene, scene_config.get("output"), output_path)
    _clear_scene()

    try:
        builder()
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
        frame_count = _configure_video_timing(scene, scene_config.get("videoTiming"))
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

    backend = _configure_gpu_cycles()

    try:
        if is_video:
            bpy.ops.render.render(animation=True)
        else:
            bpy.ops.render.render(write_still=True)
    except Exception as error:
        raise SystemExit(f"BLENDER_FAILED: render.render() raised: {error}")

    if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        raise SystemExit("OUTPUT_VALIDATION_FAILED: output file missing or empty")

    print(f"RENDER_OK backend={backend} output={output_path}")


if __name__ == "__main__":
    main()
