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
    # Retargeted to the real HEART_LEFT_VENTRICLE anchor in heart_builder.py
    # (0.45, -0.45, -0.45) -- a real bug found by actually rendering this:
    # the previous target (0.55, -0.35, 0.15) was a hand-guessed point that
    # sat well above where the LV highlight actually lives, so the one
    # thing this camera exists to show was consistently out of frame.
    "CAM_LV_APPROACH": {"location": (2.6, -8.0, -0.1), "target": (0.4, -0.3, -0.3)},
    # Pulled back further than the single-structure approaches so both the
    # LV highlight (low, around z=-0.45) and the aorta (high, around
    # z=1.13) fit in frame together -- they sit almost 1.6 units apart on
    # a ~2.9-unit-tall heart, too far apart for a close "approach" crop.
    "CAM_COMBINED": {"location": (2.8, -8.5, 0.0), "target": (0.35, -0.3, -0.05)},
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
        nodes = material.node_tree.nodes

        # HEART_LEFT_VENTRICLE has no material of its own -- it's a masked
        # region of the shared MYOCARDIUM material (see heart_builder.py's
        # _make_blended_chamber_material), whose Emission Strength socket is
        # already driven by a node link (mask * this value node), not a free
        # input. Setting .default_value on a linked socket is silently
        # ignored, so this case is handled by driving that named node instead.
        lv_intensity_node = nodes.get("LVHighlightIntensity")
        if group_name == "HEART_LEFT_VENTRICLE" and lv_intensity_node is not None:
            lv_intensity_node.outputs[0].default_value = intensity * 2.6
            continue

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
