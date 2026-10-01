"""Poisoned-state tests in real Blender; no rendered files or GPU setup."""
import importlib.util
import pathlib
import sys
import bpy

sys.dont_write_bytecode = True
source = pathlib.Path(__file__).resolve().parents[1] / "render/blender/render_scene.py"
compile(source.read_text(encoding="utf-8"), str(source), "exec")
spec = importlib.util.spec_from_file_location("state_render_scene", source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
scene = bpy.context.scene
render = scene.render
image = render.image_settings

for media in ("still", "video", "still"):
    render.engine = "BLENDER_EEVEE"
    image.media_type = "VIDEO"
    image.file_format = "FFMPEG"
    render.ffmpeg.format = "MKV"
    render.ffmpeg.codec = "FFV1"
    image.color_mode = "BW"
    image.color_management = "OVERRIDE"
    render.ffmpeg.audio_codec = "AAC"
    render.ffmpeg.use_autosplit = True
    render.ffmpeg.use_lossless_output = True
    if media == "still":
        image.media_type = "IMAGE"
        image.file_format = "JPEG"
    render.filepath = "poisoned"
    render.use_file_extension = True
    render.use_overwrite = False
    render.use_placeholder = True
    render.use_sequencer = True
    render.use_compositing = True
    render.use_multiview = True
    render.film_transparent = True
    render.frame_map_old, render.frame_map_new = 50, 200
    scene.frame_set(73)
    render.fps, render.fps_base, scene.frame_step = 30, 1.001, 3
    scene.frame_start, scene.frame_end = 10, 200
    render.resolution_x, render.resolution_y = 400, 300
    render.resolution_percentage = 50
    render.pixel_aspect_x, render.pixel_aspect_y = 2, 3
    render.use_border = render.use_crop_to_border = True
    # Deliberate visual/performance sentinels must survive configuration.
    scene.view_settings.exposure = 0.25
    scene.view_settings.gamma = 1.2
    scene.cycles.samples = 17
    before_visual = (scene.view_settings.view_transform, scene.view_settings.look,
                     scene.view_settings.exposure, scene.view_settings.gamma,
                     scene.cycles.samples, scene.cycles.use_denoising,
                     render.ffmpeg.ffmpeg_preset)
    module._configure_output_dimensions(scene, dict(width=720, height=1280))
    module._configure_render_state(scene, dict(media=media), "exact-output-path")
    if media == "video":
        module._configure_video_timing(scene, dict(fps=24, fpsBase=1, frameStep=1,
                                                  frameStart=1, frameEnd=156, frameCount=156))
        assert (render.fps, render.fps_base, scene.frame_step) == (24, 1, 1)
        assert (scene.frame_start, scene.frame_end) == (1, 156)
        assert image.media_type == "VIDEO" and image.file_format == "FFMPEG"
        assert render.ffmpeg.format == "MPEG4" and render.ffmpeg.codec == "H264"
        assert render.ffmpeg.constant_rate_factor == "HIGH"
        assert render.ffmpeg.audio_codec == "NONE"
        assert not render.ffmpeg.use_autosplit and not render.ffmpeg.use_lossless_output
        assert image.color_mode == "RGB"
    else:
        assert image.media_type == "IMAGE" and image.file_format == "PNG"
        assert image.color_mode == "RGBA"
        # Still path does not assign unrelated video encoder settings.
        assert render.ffmpeg.format == "MKV" and render.ffmpeg.codec == "FFV1"
    assert image.color_depth == "8" and image.color_management == "FOLLOW_SCENE"
    assert render.engine == "CYCLES" and render.filepath == "exact-output-path"
    assert not render.use_file_extension and render.use_overwrite and not render.use_placeholder
    assert not render.use_sequencer and not render.use_compositing and not render.use_multiview
    assert not render.film_transparent
    assert (render.frame_map_old, render.frame_map_new, scene.frame_current) == (100, 100, 1)
    assert (render.resolution_x, render.resolution_y, render.resolution_percentage) == (720, 1280, 100)
    assert render.pixel_aspect_x == render.pixel_aspect_y == 1
    assert not render.use_border and not render.use_crop_to_border
    assert before_visual == (scene.view_settings.view_transform, scene.view_settings.look,
                             scene.view_settings.exposure, scene.view_settings.gamma,
                             scene.cycles.samples, scene.cycles.use_denoising,
                             render.ffmpeg.ffmpeg_preset)

for output, path in ((None, "out"), ({}, "out"), (dict(media="jpeg"), "out"),
                     (dict(media="video"), ""), (dict(media="still"), None)):
    try:
        module._configure_render_state(scene, output, path)
    except SystemExit as error:
        assert "INVALID_SCENE" in str(error)
    else:
        raise AssertionError(f"Accepted invalid configuration: {output}, {path}")
print("RENDER_STATE_OK: 3 poisoned-state paths, 5 invalid configs; no render")
