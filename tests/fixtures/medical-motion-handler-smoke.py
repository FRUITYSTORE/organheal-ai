"""Internal two-frame smoke only; original builders/gates remain untouched.

This intentionally reduces temporal workload and samples; it does not prove
full video timing, clinical suitability or medically verified anatomy.
"""
import os
import sys
import time
import bpy

sys.path.insert(0, os.path.join(os.getcwd(), "render", "blender"))
import render_scene

configure_timing = render_scene._configure_video_timing
configure_gpu = render_scene._configure_gpu_cycles

def small_timing(scene, timing):
    configure_timing(scene, timing)
    scene.frame_end = 2
    return 2

def small_gpu():
    backend = configure_gpu()
    bpy.context.scene.cycles.samples = 1
    bpy.context.scene.cycles.use_denoising = False
    return backend

render_scene._configure_video_timing = small_timing
render_scene._configure_gpu_cycles = small_gpu
if os.environ.get("ORGANHEAL_HANDLER_SMOKE_CANCEL") == "1":
    print("HANDLER_SMOKE_STARTED", flush=True)
    time.sleep(30)
render_scene.main()
