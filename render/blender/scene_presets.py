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


def apply_highlight(object_names, intensity):
    """Makes the requested objects visually read as "the thing this
    member's real numbers point to" -- never adds or removes geometry,
    never implies a pathology that wasn't clinically demonstrated
    (architecture brief section 6).

    Works on OBJECTS (the names the render layer resolved from anatomy ids
    through the organ registry), lighting every material each one uses --
    so a chamber's cut face lights with its wall, and nothing depends on
    how a material happens to be keyed.

    Tissue glows a warm red rather than its own base color, and everything
    not highlighted is dimmed -- both found by rendering the left ventricle
    highlight: its own crimson base color, emitted at any strength that
    read as a glow, came out pastel pink under the AgX view transform,
    while a moderate pure-red glow against dimmed surroundings reads as lit
    and stays red."""
    glow_by_material = {}
    for name in object_names:
        glow = "coronary" if name.startswith("CORONARY_") else "tissue"
        for slot in bpy.data.objects[name].material_slots:
            if slot.material is not None:
                glow_by_material[slot.material] = glow

    for material in bpy.data.materials:
        bsdf = material.node_tree.nodes.get("Principled BSDF") if material.node_tree else None
        if bsdf is None:
            continue
        glow = glow_by_material.get(material)
        if glow is None:
            if intensity > 0 and glow_by_material:
                color = bsdf.inputs["Base Color"].default_value
                dim = 1.0 - _DIM_OTHERS * min(intensity, 1.0)
                bsdf.inputs["Base Color"].default_value = (color[0] * dim, color[1] * dim, color[2] * dim, color[3])
            continue
        # A real, easy-to-miss bug: boosting Emission Strength alone emits
        # nothing unless Emission Color is set too -- the aorta once
        # highlighted with strength alone and stayed invisible.
        if glow == "coronary":
            # Coronaries keep their established gold. Their old 2.6
            # strength of their own pale-gold base color rendered flat
            # white; a saturated gold at a moderate strength keeps both the
            # color and the tube's shading.
            bsdf.inputs["Emission Color"].default_value = (*_CORONARY_GLOW, 1.0)
            bsdf.inputs["Emission Strength"].default_value = intensity * _CORONARY_GLOW_STRENGTH
        else:
            bsdf.inputs["Emission Color"].default_value = (*_TISSUE_GLOW, 1.0)
            bsdf.inputs["Emission Strength"].default_value = intensity * _TISSUE_GLOW_STRENGTH


_TISSUE_GLOW = (1.0, 0.08, 0.04)
_TISSUE_GLOW_STRENGTH = 0.6
_CORONARY_GLOW = (1.0, 0.6, 0.08)
_CORONARY_GLOW_STRENGTH = 0.9
_DIM_OTHERS = 0.55
