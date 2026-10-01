"""Lightweight real-Blender timing check; creates no anatomy or rendered media."""
import importlib.util
import pathlib
import sys
import bpy

sys.dont_write_bytecode = True
source = pathlib.Path(__file__).resolve().parents[1] / "render/blender/render_scene.py"
compile(source.read_text(encoding="utf-8"), str(source), "exec")
spec = importlib.util.spec_from_file_location("duration_render_scene", source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
scene = bpy.context.scene
for count in (1, 2, 4, 120, 156, 1048574):
    scene.render.fps = 30
    scene.render.fps_base = 1.001
    scene.frame_step = 3
    timing = dict(fps=24, fpsBase=1, frameStep=1, frameStart=1, frameEnd=count, frameCount=count)
    assert module._configure_video_timing(scene, timing) == count
    assert scene.render.fps == 24 and scene.render.fps_base == 1
    assert scene.frame_step == 1 and scene.frame_start == 1 and scene.frame_end == count
    assert len(range(scene.frame_start, scene.frame_end + 1, scene.frame_step)) == count
    assert count / (scene.render.fps / scene.render.fps_base) == count / 24
for patch in (dict(frameCount=0), dict(frameEnd=121), dict(fpsBase=2), dict(frameStep=2),
              dict(fps=30), dict(frameStart=0), dict(frameCount=True),
              dict(frameEnd=1048575, frameCount=1048575)):
    timing = dict(fps=24, fpsBase=1, frameStep=1, frameStart=1, frameEnd=120, frameCount=120)
    timing.update(patch)
    try:
        module._configure_video_timing(scene, timing)
    except SystemExit as error:
        assert "INVALID_SCENE" in str(error)
    else:
        raise AssertionError(f"Accepted invalid timing: {patch}")
print("DURATION_POLICY_OK: 6 timing cases, 8 invalid transports; no render")
