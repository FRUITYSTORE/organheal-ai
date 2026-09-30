"""Motion controllers for the heart -- the names in HEART_ORGAN_MODULE's
motionControllers (lib/medical-motion/organs/heart/heart-organ-module.ts).

"clinical-heartbeat" is an ILLUSTRATIVE rhythm, not simulated mechanics:
the whole heart contracts uniformly about its center, at a normal resting
rate. Real systole is not a uniform scale (the ventricles shorten and
thicken, the base descends toward the apex), and nothing here claims it
is -- it only lets a viewer see that the heart is beating, at a normal
rate, with a quick contraction and a longer relaxation.
"""

import bpy
from mathutils import Vector

HEART_RATE_BPM = 72
# Fraction of each beat spent contracting, then relaxing back; the rest of
# the beat holds at rest (diastolic filling). Roughly the systole/diastole
# split of a resting heart (about a third of the cycle in systole).
_CONTRACT_FRACTION = 0.35
_RELAX_FRACTION = 0.25
_CONTRACTED_SCALE = 0.94

_CHAMBER_CENTER_LANDMARKS = ("LM_heart.raCenter", "LM_heart.rvCenter", "LM_heart.laCenter", "LM_heart.lvCenter")


def apply_clinical_heartbeat(frame_count, fps):
    """Parents every piece of heart geometry to one pivot at the centroid of
    the four chamber-center landmarks and keyframes its scale for each beat
    in frames 1..frame_count. Landmarks are left unparented, so camera aim
    points stay fixed while the heart beats."""
    center = Vector((0.0, 0.0, 0.0))
    for name in _CHAMBER_CENTER_LANDMARKS:
        center += bpy.data.objects[name].location
    center /= len(_CHAMBER_CENTER_LANDMARKS)

    pivot = bpy.data.objects.new("HeartbeatPivot", None)
    pivot.location = center
    bpy.context.collection.objects.link(pivot)
    bpy.context.view_layer.update()

    for obj in list(bpy.data.objects):
        if obj.type in ("MESH", "CURVE") and obj.parent is None:
            world = obj.matrix_world.copy()
            obj.parent = pivot
            obj.matrix_world = world

    beat_frames = fps * 60.0 / HEART_RATE_BPM
    beat_start = 1.0
    while beat_start <= frame_count:
        for offset, scale in (
            (0.0, 1.0),
            (beat_frames * _CONTRACT_FRACTION, _CONTRACTED_SCALE),
            (beat_frames * (_CONTRACT_FRACTION + _RELAX_FRACTION), 1.0),
        ):
            pivot.scale = (scale, scale, scale)
            pivot.keyframe_insert("scale", frame=beat_start + offset)
        beat_start += beat_frames


MOTION_CONTROLLERS = {
    "clinical-heartbeat": apply_clinical_heartbeat,
}
