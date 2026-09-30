"""Camera presets and the highlight system — both programmable, per the
architecture brief sections 11-12: no single hard-coded camera animation,
and anatomical structures are selectable by name, not baked into one shot.
"""

import bpy
import math
from mathutils import Vector

# Each preset: (location, look_at_target). Rotation is computed from the
# look-at vector rather than hand-tuned Euler angles, so presets stay
# correct if the anatomy build script's proportions change slightly.
CAMERA_PRESETS = {
    "CAM_HEART_OVERVIEW": {"location": (0.0, -8.5, 0.0), "target": (0.0, 0.0, -0.1)},
    "CAM_HEART_HERO": {"location": (0.0, -7.5, -0.2), "target": (0.0, 0.0, -0.2)},
    "CAM_HEART_ORBIT": {"location": (4.0, -7.0, 0.2), "target": (0.0, 0.0, -0.1)},
    "CAM_CORONARY_APPROACH": {"location": (0.4, -4.6, -0.4), "target": (0.15, -0.7, -0.6)},
    "CAM_LV_APPROACH": {"location": (1.8, -4.8, -0.3), "target": (0.9, -0.5, -0.4)},
    "CAM_COMBINED": {"location": (1.2, -5.4, -0.3), "target": (0.5, -0.6, -0.5)},
}


def _look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def apply_camera_preset(preset_name):
    preset = CAMERA_PRESETS.get(preset_name, CAMERA_PRESETS["CAM_HEART_OVERVIEW"])
    camera_data = bpy.data.cameras.new("SceneCamera")
    camera_obj = bpy.data.objects.new("SceneCamera", camera_data)
    bpy.context.collection.objects.link(camera_obj)
    camera_obj.location = Vector(preset["location"])
    _look_at(camera_obj, preset["target"])
    bpy.context.scene.camera = camera_obj
    return camera_obj


def apply_highlight(materials, structures, intensity):
    """Brightens the emission of every requested anatomy group's material
    so it visually reads as "the thing this member's real numbers point
    to" -- never adds or removes geometry, never implies a pathology that
    wasn't clinically demonstrated (architecture brief section 6)."""
    for group_name in structures:
        material = materials.get(group_name)
        if material is None:
            continue
        bsdf = material.node_tree.nodes.get("Principled BSDF")
        if bsdf and "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = intensity * 2.6
