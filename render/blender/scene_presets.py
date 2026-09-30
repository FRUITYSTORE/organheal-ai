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

# Retuned entirely after the real-anatomy rewrite (heart_builder.py no
# longer deforms a sphere; it loads real chamber geometry at a different
# scale/position). All previous coordinates here were tuned against the
# OLD procedural shape and no longer mean anything -- these were computed
# from the real combined chamber bounding box (center roughly (0.1, 0.43,
# -0.03), size roughly (2.4, 1.45, 2.0)), then confirmed by rendering.
CAMERA_PRESETS = {
    "CAM_HEART_OVERVIEW": {"location": (0.1, -6.3, -0.1), "target": (0.1, 0.4, -0.1)},
    "CAM_HEART_HERO": {"location": (0.3, -5.8, -0.2), "target": (0.15, 0.35, -0.2)},
    "CAM_HEART_ORBIT": {"location": (3.2, -5.2, 0.1), "target": (0.1, 0.4, -0.1)},
    "CAM_CORONARY_APPROACH": {"location": (0.6, -3.4, -0.4), "target": (0.2, 0.2, -0.3)},
    "CAM_LV_APPROACH": {"location": (1.8, -3.6, -0.3), "target": (0.45, 0.32, -0.3)},
    "CAM_COMBINED": {"location": (1.6, -5.3, -0.1), "target": (0.25, 0.35, -0.2)},
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
    wasn't clinically demonstrated (architecture brief section 6).

    Every anatomy group (including HEART_LEFT_VENTRICLE) now has a real,
    ordinary material of its own -- the vertex-color-masked special case
    this function used to need for the left ventricle only existed because
    an earlier version of the heart had no separate LV geometry at all.
    Now that it's a real chamber object with a real material, it needs no
    special handling."""
    for group_name in structures:
        material = materials.get(group_name)
        if material is None:
            continue
        nodes = material.node_tree.nodes
        bsdf = nodes.get("Principled BSDF")
        if bsdf and "Emission Strength" in bsdf.inputs:
            # A real, easy-to-miss bug: boosting Emission Strength alone
            # emits nothing if Emission Color was never set (it defaults to
            # pure black) -- this silently "worked" for the coronary
            # arteries only because _make_emissive_material happened to set
            # a color already. Any other material (the aorta, for example)
            # highlighted with strength alone and stayed invisible.
            if "Emission Color" in bsdf.inputs:
                bsdf.inputs["Emission Color"].default_value = bsdf.inputs["Base Color"].default_value
            bsdf.inputs["Emission Strength"].default_value = intensity * 2.6
