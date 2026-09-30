"""Real heart geometry — built from an actual anatomical reference, not a
mathematically-deformed sphere.

This is a structural rewrite, not another polish pass. Every earlier
version of this file (through commit 663b202) built the heart by deforming
a subdivided icosphere with a hand-written formula, then either painting
fake chamber colors onto its exterior, or (after that was recognized as
anatomically dishonest) cutting it open and painting the colors on the
newly-exposed interior instead. Both versions had the same root problem
the owner and an outside production spec both converged on independently:
a mathematical deformation has no concept of "chamber" at all, so no
amount of retuning its constants can ever produce a real chamber's real
shape -- only something shaped roughly like the SILHOUETTE of a heart.

This version instead loads real chamber geometry from
render/blender/assets/heart/chambers.obj -- four separate meshes (right
atrium, right ventricle, left atrium, left ventricle), each with its own
real anatomical form. That asset is NOT a copy of any third-party file:
it was built by retopology (a fresh mesh, our own vertex/face data,
conformed via Blender's Shrinkwrap modifier to the real surface of an
open anatomical reference, then detached from that reference entirely).
Full provenance is in medical-assets/LICENSE_MANIFEST.json.

Great vessels and coronary arteries are built from real sampled centerline
points (render/blender/assets/heart/vessels.json), extracted the same
session from the same reference, instead of hand-picked coordinates
eyeballed against a render.

Anatomy group names match lib/medical-motion/organs/heart/heart-organ-module.ts
exactly, so the render script can look up "what did buildHeartScene ask us
to highlight" against "what did we actually build" directly by name.
"""

import bmesh
import bpy
import json
import math
import os
from mathutils import Vector

_ASSET_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "heart")
_CHAMBERS_OBJ = os.path.join(_ASSET_DIR, "chambers.obj")
_VESSELS_JSON = os.path.join(_ASSET_DIR, "vessels.json")

# The real chamber asset is at real-world scale (meters) and positioned at
# its original location within the source full-body reference. This is the
# one place that gets converted to our own working scale/origin -- computed
# from the real combined bounding box of the four chambers (see
# medical-assets/LICENSE_MANIFEST.json), not guessed.
_REAL_CENTER = Vector((0.0172, -0.0292, 1.2908))
_REAL_SCALE = 20.0


def _real_to_local(point):
    """Converts a real-world (meters, source-file position) point into our
    working scene's local units -- the SAME transform every real geometry
    in this file (chambers and vessels alike) goes through, so nothing can
    drift out of alignment the way independently-duplicated formulas did
    earlier this session."""
    return tuple((Vector(point) - _REAL_CENTER) * _REAL_SCALE)


# ---------------------------------------------------------------------------
# Materials
# ---------------------------------------------------------------------------

def _make_organic_material(name, base_color, subsurface=0.25, roughness=0.35):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    if "Subsurface Weight" in bsdf.inputs:
        bsdf.inputs["Subsurface Weight"].default_value = subsurface
        bsdf.inputs["Subsurface Radius"].default_value = (0.3, 0.15, 0.1)
    return mat


def _make_emissive_material(name, color, strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.3
    bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
    bsdf.inputs["Emission Strength"].default_value = strength
    return mat


def build_materials():
    return {
        # Real, saturated chamber colors -- pushed against the owner's
        # reference image, same convention as before (deoxygenated blue
        # right heart, oxygenated red left heart), but now applied to real
        # chamber geometry instead of a vertex-color blend.
        # Low subsurface weight on chambers specifically -- found by
        # actually rendering this: the real atrium walls are thin (real
        # anatomy, not a modeling error), and the default 0.25 subsurface
        # weight that looks like organic tissue on THICKER geometry (the
        # ventricles, the vessels) reads as visibly glassy/see-through on
        # genuinely thin real wall geometry.
        "HEART_RIGHT_ATRIUM": _make_organic_material("mat_ra", (0.2, 0.32, 0.72), subsurface=0.05),
        "HEART_RIGHT_VENTRICLE": _make_organic_material("mat_rv", (0.06, 0.12, 0.45), subsurface=0.05),
        "HEART_LEFT_ATRIUM": _make_organic_material("mat_la", (0.58, 0.18, 0.56), subsurface=0.05),
        "HEART_LEFT_VENTRICLE": _make_organic_material("mat_lv", (0.62, 0.04, 0.16), subsurface=0.05),
        "CORONARY_LAD": _make_emissive_material("mat_lad", (0.88, 0.72, 0.32)),
        "CORONARY_RCA": _make_emissive_material("mat_rca", (0.88, 0.72, 0.32)),
        "CORONARY_LCX": _make_emissive_material("mat_lcx", (0.88, 0.72, 0.32)),
        "AORTA": _make_organic_material("mat_aorta", (0.75, 0.55, 0.78), subsurface=0.15),
        "PULMONARY_ARTERY": _make_organic_material("mat_pa", (0.55, 0.62, 0.82), subsurface=0.15),
        "SVC": _make_organic_material("mat_svc", (0.42, 0.5, 0.65), subsurface=0.1),
        "IVC": _make_organic_material("mat_ivc", (0.42, 0.5, 0.65), subsurface=0.1),
    }


# ---------------------------------------------------------------------------
# Real chamber geometry
# ---------------------------------------------------------------------------

# The cutaway plane, in our LOCAL (post-transform) coordinate space. The
# four chambers are centered on local origin by construction (see
# _REAL_CENTER above), so a plane near the origin, tilted slightly and
# facing -Y (the camera side, same convention every earlier version of
# this file used), slices the same "front quadrant open" look.
_CUTAWAY_PLANE_CO = Vector((0.0, 0.0, 0.0))
_CUTAWAY_PLANE_NO = Vector((0.15, -0.9, 0.25)).normalized()


def _import_and_transform_chambers():
    """Imports the real chamber asset and converts it from real-world
    scale/position into our local scene units. Returns {anatomy_key: bpy
    object}."""
    before = set(bpy.data.objects.keys())
    bpy.ops.wm.obj_import(filepath=_CHAMBERS_OBJ)
    imported = [o for o in bpy.data.objects if o.name not in before]

    key_by_prefix = {
        "NEW_Right_atrium": "HEART_RIGHT_ATRIUM",
        "NEW_Right_ventricle": "HEART_RIGHT_VENTRICLE",
        "NEW_Left_atrium": "HEART_LEFT_ATRIUM",
        "NEW_Left_ventricle": "HEART_LEFT_VENTRICLE",
    }
    chambers = {}
    for obj in imported:
        base_name = obj.name.split(".")[0]
        key = key_by_prefix.get(base_name)
        if key is None:
            continue
        # Bake the real-world -> local transform directly into the mesh
        # data (not just the object's transform) so every later piece of
        # code that reads vertex coordinates -- bisecting, bounding boxes
        # for valve/vessel placement -- sees real local-space numbers.
        for v in obj.data.vertices:
            v.co = Vector(_real_to_local(obj.matrix_world @ v.co))
        obj.matrix_world.identity()
        obj.name = key
        chambers[key] = obj
    missing = set(key_by_prefix.values()) - set(chambers.keys())
    if missing:
        raise RuntimeError(f"Real chamber asset is missing expected structures: {missing}")
    return chambers


def _cutaway_chamber(obj):
    """Slices the front quadrant off a single chamber mesh with the shared
    cutaway plane and caps the cut with a real filled face -- a real,
    solid chamber cross-section, not a hollow shell standing in for one."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.bisect_plane(
        bm,
        geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
        plane_co=_CUTAWAY_PLANE_CO,
        plane_no=_CUTAWAY_PLANE_NO,
        clear_outer=True,
        clear_inner=False,
    )
    # Cap the resulting open boundary with real geometry -- a hollow,
    # uncapped cross-section would show the background through the chamber,
    # which no real cut tissue ever does.
    open_edges = [e for e in bm.edges if e.is_boundary]
    cap_faces = []
    if open_edges:
        cap_faces = bmesh.ops.holes_fill(bm, edges=open_edges)["faces"]
    # bisect + hole-fill doesn't guarantee every face ends up with a
    # consistent outward-facing normal -- found by actually rendering
    # this: a chamber with a stray inward-facing normal read as glassy/
    # see-through (light passing through backfacing geometry combined
    # with subsurface scattering), not solid. Recalculating from the
    # mesh's own enclosed-volume topology fixes it structurally rather
    # than papering over it with a material tweak.
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    # The wall is smooth tissue; the cap is a flat cut. Smooth-shading the
    # cap too averaged its normals with the wall's around its rim, so a
    # geometrically flat cross-section rendered as if creased into
    # folds -- found by rendering the right ventricle cut with and without
    # its cap side by side.
    cap_set = set(cap_faces)
    for face in bm.faces:
        face.smooth = face not in cap_set
        # Slot 1 is the chamber's cut-surface material (build_chambers).
        face.material_index = 1 if face in cap_set else 0
    bm.to_mesh(obj.data)
    bm.free()


def build_chambers(materials):
    """Loads the real chamber asset, converts it to our scene's scale, cuts
    it open, and assigns each chamber its own real material. Returns
    {anatomy_key: object}."""
    chambers = _import_and_transform_chambers()
    for key, obj in chambers.items():
        # Both slots must exist before the cutaway assigns the cap to slot
        # 1: writing the bmesh back clamps material indices to the slots
        # the mesh already has.
        obj.data.materials.clear()
        obj.data.materials.append(materials[key])
        obj.data.materials.append(_cut_surface_material(materials[key]))
        _cutaway_chamber(obj)
    return chambers


def _cut_surface_material(wall_material):
    """The flat cut face of a chamber: same hue as its wall, darker and
    matte. Found by rendering: with the wall's own material, a flat cap
    faces the key light head-on and washes out to pastel, losing the
    saturated chamber color; cutaway illustrations conventionally show the
    cut surface a shade darker than the outer wall anyway."""
    wall = wall_material.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value
    return _make_organic_material(
        f"{wall_material.name}_cut",
        tuple(channel * 0.55 for channel in wall[:3]),
        subsurface=0.0,
        roughness=0.75,
    )


def _chamber_center(obj):
    """Real center of a chamber's actual geometry (post-cutaway), used to
    place valves and flow arrows at real anatomical junctions instead of a
    hand-picked guess."""
    verts = obj.data.vertices
    if not verts:
        return Vector((0, 0, 0))
    total = Vector((0, 0, 0))
    for v in verts:
        total += v.co
    return total / len(verts)


# ---------------------------------------------------------------------------
# Great vessels + coronary arteries — real sampled centerlines
# ---------------------------------------------------------------------------

def _make_tube(name, points, bevel_radius, material):
    curve_data = bpy.data.curves.new(name, type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.bevel_depth = bevel_radius
    curve_data.bevel_resolution = 4
    curve_data.fill_mode = "FULL"

    spline = curve_data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for i, p in enumerate(points):
        bp = spline.bezier_points[i]
        bp.co = Vector(p)
        bp.handle_left_type = "AUTO"
        bp.handle_right_type = "AUTO"

    obj = bpy.data.objects.new(name, curve_data)
    obj.data.materials.append(material)
    bpy.context.collection.objects.link(obj)
    return obj


_VESSEL_BEVEL_RADIUS = {
    "AORTA": 0.12,
    "PULMONARY_ARTERY": 0.1,
    "SVC": 0.09,
    "IVC": 0.08,
    "CORONARY_LAD": 0.035,
    "CORONARY_RCA": 0.035,
    "CORONARY_LCX": 0.035,
}


def _load_vessel_points():
    with open(_VESSELS_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def build_vessels_and_coronaries(materials):
    """Builds every great vessel and coronary artery from REAL sampled
    centerline points (extracted from the same anatomical reference the
    chambers come from), not hand-picked control points eyeballed against
    a render -- a real, repeated source of bugs and rough-looking curves
    earlier this session."""
    raw = _load_vessel_points()
    objects = {}
    for key, segments in raw.items():
        material = materials.get(key)
        if material is None or not segments:
            continue
        # Concatenate every real segment for this vessel (e.g. the aorta's
        # "Ascending aorta" then "Aortic arch") into one continuous curve.
        all_points = []
        for segment in segments:
            all_points.extend(_real_to_local(p) for p in segment["points"])
        if len(all_points) < 2:
            continue
        bevel = _VESSEL_BEVEL_RADIUS.get(key, 0.05)
        objects[key] = _make_tube(key, all_points, bevel, material)
    return objects


# ---------------------------------------------------------------------------
# Valves — real ring geometry at real chamber junctions
# ---------------------------------------------------------------------------

def _make_torus_bmesh(major_radius, minor_radius, major_segments=24, minor_segments=8):
    bm = bmesh.new()
    rings = []
    for i in range(major_segments):
        theta = 2 * math.pi * i / major_segments
        ring = []
        for j in range(minor_segments):
            phi = 2 * math.pi * j / minor_segments
            r = major_radius + minor_radius * math.cos(phi)
            ring.append(bm.verts.new((r * math.cos(theta), r * math.sin(theta), minor_radius * math.sin(phi))))
        rings.append(ring)
    for i in range(major_segments):
        i2 = (i + 1) % major_segments
        for j in range(minor_segments):
            j2 = (j + 1) % minor_segments
            bm.faces.new((rings[i][j], rings[i2][j], rings[i2][j2], rings[i][j2]))
    return bm


def build_valves(materials, chamber_centers):
    """Ring geometry at the two AV valve junctions -- positioned at the
    real midpoint between each pair of real chamber centers, not a
    hand-picked guess. (The two semilunar valves, at the ventricle/great-
    vessel roots, are deferred: placing them correctly needs the real
    vessel-root points threaded through too, a real next increment rather
    than a re-guessed position this pass.)"""
    ra = chamber_centers["HEART_RIGHT_ATRIUM"]
    rv = chamber_centers["HEART_RIGHT_VENTRICLE"]
    la = chamber_centers["HEART_LEFT_ATRIUM"]
    lv = chamber_centers["HEART_LEFT_VENTRICLE"]

    specs = {
        "tricuspid": (tuple((a + b) / 2 for a, b in zip(ra, rv)), 0.16),
        "mitral": (tuple((a + b) / 2 for a, b in zip(la, lv)), 0.16),
    }

    valves = {}
    for name, (center, radius) in specs.items():
        bm = _make_torus_bmesh(major_radius=radius, minor_radius=radius * 0.16)
        mesh = bpy.data.meshes.new(f"Valve_{name}")
        bm.to_mesh(mesh)
        bm.free()
        for poly in mesh.polygons:
            poly.use_smooth = True
        obj = bpy.data.objects.new(f"Valve_{name}", mesh)
        outward = Vector(center).normalized() if Vector(center).length > 0 else Vector((0, -1, 0))
        obj.location = Vector(center) + outward * (radius * 0.35)
        obj.rotation_euler = outward.to_track_quat("Z", "Y").to_euler()
        # One material per valve, so highlighting one never lights the other.
        obj.data.materials.append(
            _make_organic_material(f"mat_valve_{name}", (0.92, 0.86, 0.78), subsurface=0.1, roughness=0.25)
        )
        bpy.context.collection.objects.link(obj)
        valves[name] = obj
    return valves


def _make_flow_arrow(name, start, end, shaft_radius, head_radius, material):
    start_v, end_v = Vector(start), Vector(end)
    direction = end_v - start_v
    length = direction.length
    if length < 1e-6:
        direction = Vector((0, 0, -1))
        length = 1e-6
    direction = direction.normalized()
    head_length = min(0.09, length * 0.4)
    shaft_end = end_v - direction * head_length

    shaft = _make_tube(f"{name}Shaft", [tuple(start_v), tuple(shaft_end)], shaft_radius, material)

    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=head_radius, radius2=0.0, depth=head_length)
    mesh = bpy.data.meshes.new(f"{name}Head")
    bm.to_mesh(mesh)
    bm.free()
    for poly in mesh.polygons:
        poly.use_smooth = True
    head = bpy.data.objects.new(f"{name}Head", mesh)
    head.location = shaft_end + direction * (head_length / 2)
    head.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    head.data.materials.append(material)
    bpy.context.collection.objects.link(head)
    return shaft, head


def build_flow_arrows(materials, chamber_centers):
    """Blood-flow direction through the two AV valves, at the real chamber
    junctions."""
    flow_mat = _make_organic_material("mat_flow_arrow", (0.08, 0.08, 0.1), subsurface=0.0, roughness=0.5)
    ra = chamber_centers["HEART_RIGHT_ATRIUM"]
    rv = chamber_centers["HEART_RIGHT_VENTRICLE"]
    la = chamber_centers["HEART_LEFT_ATRIUM"]
    lv = chamber_centers["HEART_LEFT_VENTRICLE"]

    def _short_segment(a, b, span=0.42):
        mid = tuple((x + y) / 2 for x, y in zip(a, b))
        direction = Vector(b) - Vector(a)
        direction = direction.normalized() if direction.length > 1e-6 else Vector((0, 0, -1))
        half = direction * (span / 2)
        return tuple(Vector(mid) - half), tuple(Vector(mid) + half)

    objects = {}
    tri_start, tri_end = _short_segment(ra, rv)
    objects["FLOW_ARROW_TRICUSPID"], objects["FLOW_ARROW_TRICUSPID_HEAD"] = _make_flow_arrow(
        "FlowTricuspid", tri_start, tri_end, 0.02, 0.045, flow_mat,
    )
    mit_start, mit_end = _short_segment(la, lv)
    objects["FLOW_ARROW_MITRAL"], objects["FLOW_ARROW_MITRAL_HEAD"] = _make_flow_arrow(
        "FlowMitral", mit_start, mit_end, 0.02, 0.045, flow_mat,
    )
    return objects


def build_heart():
    """Entry point: builds every heart object + material and returns a
    dict keyed by anatomy-group name -> Blender object. The object names
    created here are the `blenderObject` values in HEART_ORGAN_MODULE's
    anatomyRegistry (lib/medical-motion/organs/heart/heart-organ-module.ts);
    keep the two in step."""
    materials = build_materials()
    objects = {}

    chambers = build_chambers(materials)
    objects.update(chambers)

    chamber_centers = {key: _chamber_center(obj) for key, obj in chambers.items()}

    objects.update(build_valves(materials, chamber_centers))
    objects.update(build_flow_arrows(materials, chamber_centers))
    objects.update(build_vessels_and_coronaries(materials))

    # Every mesh above was edited in place (real-world -> local transform,
    # cutaway), and an object's bound_box only reflects that once the scene
    # is re-evaluated -- until then it still describes the ORIGINAL
    # real-world position. Found by actually rendering a camera framed from
    # bound_box, which pointed at empty space.
    bpy.context.view_layer.update()

    return objects, materials
