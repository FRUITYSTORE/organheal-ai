"""Real Blender configuration checks only; no anatomy construction or render."""
import importlib.util
import pathlib
import sys
import bpy

sys.dont_write_bytecode = True
source = pathlib.Path(__file__).resolve().parents[1] / "render/blender/render_scene.py"
compile(source.read_text(encoding="utf-8"), str(source), "exec")
spec = importlib.util.spec_from_file_location("dimension_render_scene", source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
scene = bpy.context.scene
render = scene.render
for width, height in ((1280, 720), (720, 1280), (720, 720),
                      (1920, 1080), (1080, 1920), (1080, 1080)):
    render.resolution_x, render.resolution_y = 400, 300
    render.resolution_percentage = 50
    render.pixel_aspect_x, render.pixel_aspect_y = 2, 3
    render.use_border = True
    render.use_crop_to_border = True
    render.border_min_x, render.border_max_x = 0.2, 0.7
    module._configure_output_dimensions(scene, dict(width=width, height=height))
    assert (render.resolution_x, render.resolution_y) == (width, height)
    assert render.resolution_percentage == 100
    assert render.pixel_aspect_x == render.pixel_aspect_y == 1
    assert not render.use_border and not render.use_crop_to_border

invalid = [None, {}, dict(width=720), dict(width=0, height=720),
           dict(width=720, height=-1), dict(width=True, height=720),
           dict(width=720, height=720.5), dict(width="720", height=720),
           dict(width=720, height=float("nan")), dict(width=float("inf"), height=720),
           dict(width=render.bl_rna.properties["resolution_x"].hard_max + 1, height=720),
           dict(width=720, height=render.bl_rna.properties["resolution_y"].hard_max + 1)]
for dimensions in invalid:
    before = (render.resolution_x, render.resolution_y)
    try:
        module._configure_output_dimensions(scene, dimensions)
    except SystemExit as error:
        assert "INVALID_SCENE" in str(error)
        assert (render.resolution_x, render.resolution_y) == before
    else:
        raise AssertionError(f"Accepted invalid dimensions: {dimensions}")
print("DIMENSION_POLICY_OK: 6 dimension cases, 12 invalid transports; no render")
