"""The camera and highlight systems -- both programmable, per the
architecture brief sections 11-12: no hard-coded camera coordinates, and
anatomical structures are selectable by name, not baked into one shot.
"""

import bpy
from mathutils import Vector


def _look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def camera_shot_objects(shot):
    """Every object a shot depends on, for the caller to validate."""
    return list(shot["lookAt"]) + list(shot["scaleReference"])


def camera_shot_placement(shot):
    """Where a shot defined by anatomy (see CameraTarget in
    lib/medical-motion/contracts/organ-module.ts, resolved by the render
    layer) puts the camera: aimed at the centroid of the `lookAt` landmark
    empties, from `viewDirection`, `distance` organ lengths away -- the
    organ length being the distance between the two `scaleReference`
    landmarks. There are no coordinates here, so a shot follows the asset:
    these replaced six hand-tuned coordinate presets that only fit one
    build. Returns (camera location, aim point)."""
    objects = bpy.data.objects
    target = Vector((0.0, 0.0, 0.0))
    for name in shot["lookAt"]:
        target += objects[name].location
    target /= len(shot["lookAt"])

    start, end = (objects[name].location for name in shot["scaleReference"])
    organ_length = (end - start).length
    direction = Vector(shot["viewDirection"]).normalized()
    return target + direction * shot["distance"] * organ_length, target


def apply_camera_shot(shot):
    """A still camera at one shot."""
    location, target = camera_shot_placement(shot)
    camera_data = bpy.data.cameras.new("SceneCamera")
    camera_obj = bpy.data.objects.new("SceneCamera", camera_data)
    bpy.context.collection.objects.link(camera_obj)
    camera_obj.location = location
    _look_at(camera_obj, target)
    bpy.context.scene.camera = camera_obj
    return camera_obj


def apply_camera_move(from_shot, to_shot, arrive_frame):
    """A camera that glides from one shot to another between frame 1 and
    `arrive_frame`, then holds. It tracks an aim empty that moves with it,
    rather than interpolating Euler rotations, which can swing the long way
    round between two orientations."""
    start_location, start_target = camera_shot_placement(from_shot)
    end_location, end_target = camera_shot_placement(to_shot)

    aim = bpy.data.objects.new("CameraAim", None)
    bpy.context.collection.objects.link(aim)
    camera_data = bpy.data.cameras.new("SceneCamera")
    camera_obj = bpy.data.objects.new("SceneCamera", camera_data)
    bpy.context.collection.objects.link(camera_obj)
    track = camera_obj.constraints.new("TRACK_TO")
    track.target = aim
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"

    for frame, location, target in ((1, start_location, start_target), (arrive_frame, end_location, end_target)):
        camera_obj.location = location
        camera_obj.keyframe_insert("location", frame=frame)
        aim.location = target
        aim.keyframe_insert("location", frame=frame)

    bpy.context.scene.camera = camera_obj
    return camera_obj


def apply_highlight(object_names, intensity, fade_frames=None):
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
    and stays red.

    `fade_frames` = (start, end) animates from unlit to lit over those
    frames instead of lighting from the first frame."""
    glow_by_material = {}
    for name in object_names:
        glow = "coronary" if name.startswith("CORONARY_") else "tissue"
        for slot in bpy.data.objects[name].material_slots:
            if slot.material is not None:
                glow_by_material[slot.material] = glow

    # (socket, lit value) for every input the highlight changes.
    changes = []
    for material in bpy.data.materials:
        bsdf = material.node_tree.nodes.get("Principled BSDF") if material.node_tree else None
        if bsdf is None:
            continue
        glow = glow_by_material.get(material)
        if glow is None:
            if intensity > 0 and glow_by_material:
                color = bsdf.inputs["Base Color"].default_value
                dim = 1.0 - _DIM_OTHERS * min(intensity, 1.0)
                changes.append((bsdf.inputs["Base Color"], (color[0] * dim, color[1] * dim, color[2] * dim, color[3])))
            continue
        # A real, easy-to-miss bug: boosting Emission Strength alone emits
        # nothing unless Emission Color is set too -- the aorta once
        # highlighted with strength alone and stayed invisible.
        if glow == "coronary":
            # Coronaries keep their established gold. Their old 2.6
            # strength of their own pale-gold base color rendered flat
            # white; a saturated gold at a moderate strength keeps both the
            # color and the tube's shading.
            changes.append((bsdf.inputs["Emission Color"], (*_CORONARY_GLOW, 1.0)))
            changes.append((bsdf.inputs["Emission Strength"], intensity * _CORONARY_GLOW_STRENGTH))
        else:
            changes.append((bsdf.inputs["Emission Color"], (*_TISSUE_GLOW, 1.0)))
            changes.append((bsdf.inputs["Emission Strength"], intensity * _TISSUE_GLOW_STRENGTH))

    if fade_frames is None:
        for socket, lit in changes:
            socket.default_value = lit
        return

    # Animated: unlit until the first frame, lit by the second, so the
    # highlight arrives with the camera instead of being there from frame 1.
    start, end = fade_frames
    for socket, lit in changes:
        socket.keyframe_insert("default_value", frame=start)
        socket.default_value = lit
        socket.keyframe_insert("default_value", frame=end)


_TISSUE_GLOW = (1.0, 0.08, 0.04)
_TISSUE_GLOW_STRENGTH = 0.6
_CORONARY_GLOW = (1.0, 0.6, 0.08)
_CORONARY_GLOW_STRENGTH = 0.9
_DIM_OTHERS = 0.55
