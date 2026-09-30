"""Procedural heart geometry + materials — OrganHeal's own, built from code,
not a purchased/downloaded 3D model. Deliberately a *script* (text, git-
friendly, versionable) rather than a stored .blend binary: running this
function always reconstructs the exact same anatomy deterministically, so
there is nothing large or opaque to commit.

Visual language carried over (and improved on) from the earlier 2D SVG
iterations validated this session: one real muscle-color exterior (not a
flat two-tone split), four chambers visible as distinct material zones,
real great-vessel tubes, coronary arteries running over the real surface.
In 3D this reads far better than the SVG/Three.js attempts because Cycles
computes real subsurface scattering and soft shadows instead of a flat
gradient standing in for them.

Anatomy group names match lib/medical-motion/organs/heart/heart-organ-module.ts
exactly, so the render script can look up "what did buildHeartScene ask us
to highlight" against "what did we actually build" directly by name.
"""

import bmesh
import bpy
import math
from mathutils import Vector

# ---------------------------------------------------------------------------
# Materials
# ---------------------------------------------------------------------------

def _make_organic_material(name, base_color, subsurface=0.25, roughness=0.35):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    # Subsurface scattering is what makes organic tissue look like tissue
    # instead of painted plastic -- this is the single biggest quality
    # difference versus the flat-shaded Three.js/SVG attempts.
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
        "HEART_RIGHT_ATRIUM": _make_organic_material("mat_ra", (0.45, 0.58, 0.82)),
        "HEART_RIGHT_VENTRICLE": _make_organic_material("mat_rv", (0.35, 0.48, 0.75)),
        "HEART_LEFT_ATRIUM": _make_organic_material("mat_la", (0.68, 0.32, 0.55)),
        "HEART_LEFT_VENTRICLE": _make_organic_material("mat_lv", (0.58, 0.15, 0.28)),
        "MYOCARDIUM": _make_organic_material("mat_myocardium", (0.82, 0.45, 0.4), subsurface=0.35),
        "CORONARY_LAD": _make_emissive_material("mat_lad", (0.88, 0.72, 0.32)),
        "CORONARY_RCA": _make_emissive_material("mat_rca", (0.88, 0.72, 0.32)),
        "CORONARY_LCX": _make_emissive_material("mat_lcx", (0.88, 0.72, 0.32)),
        "AORTA": _make_organic_material("mat_aorta", (0.75, 0.55, 0.78), subsurface=0.15),
        "PULMONARY_ARTERY": _make_organic_material("mat_pa", (0.55, 0.62, 0.82), subsurface=0.15),
        "PULMONARY_VEINS": _make_organic_material("mat_pv", (0.78, 0.5, 0.55), subsurface=0.15),
        "SVC": _make_organic_material("mat_svc", (0.42, 0.5, 0.65), subsurface=0.1),
        "IVC": _make_organic_material("mat_ivc", (0.42, 0.5, 0.65), subsurface=0.1),
    }


# ---------------------------------------------------------------------------
# Myocardium (the exterior muscle mass) + chamber material zones
# ---------------------------------------------------------------------------

def build_myocardium(materials):
    """A single organic, asymmetric mass — real heart apex is formed mostly
    by the left ventricle, so it's blunt and leans right, not a symmetric
    valentine shape. Built by deforming a subdivided icosphere with bmesh,
    then a Subdivision Surface modifier smooths it into an organic form
    (this smoothing step is what separates this from the flat-looking
    Three.js primitive spheres attempted earlier)."""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)

    for v in bm.verts:
        x, y, z = v.co.x, v.co.y, v.co.z
        # Stretch taller (apex to base), lean the lower half toward +x (the
        # left-ventricle/apex side), and taper it narrower toward the apex
        # -- a real heart comes to a distinct point, not an egg's gentle
        # round-off.
        stretch = 1.45
        below = max(0.0, -z)
        lean = 0.34 * below
        taper = 1.0 - 0.62 * (below ** 1.3)
        v.co = Vector((x * 0.95 * taper + lean, y * 0.85 * taper, z * stretch))
        # Flare two small auricle-like bumps near the top (z > 0.5), one
        # per side, for a less perfectly-round silhouette.
        if z > 0.45:
            side = 1 if x > 0 else -1
            bump = max(0.0, (z - 0.45) * 2.0) * 0.18
            v.co.x += side * bump

    mesh = bpy.data.meshes.new("Myocardium")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Myocardium", mesh)
    bpy.context.collection.objects.link(obj)

    # Set smooth shading directly on the mesh data rather than via the
    # bpy.ops shade-smooth operator -- operators need a real 3D-viewport
    # context to run reliably, which doesn't exist in --background mode
    # and silently no-ops there. This direct approach always works.
    for poly in mesh.polygons:
        poly.use_smooth = True

    subsurf = obj.modifiers.new("Smooth", "SUBSURF")
    subsurf.levels = 2
    subsurf.render_levels = 2

    _paint_chamber_vertex_colors(mesh)
    obj.data.materials.append(_make_blended_chamber_material(materials))

    return obj


# Chamber centers in the SAME final deformed space _surface_point() maps
# into -- an approximation of "the chamber is visible through the muscle
# roughly here" rather than a true separate hollow interior (a real next
# increment, not this pass's scope). Smoothly blended per-vertex (see
# below) instead of a hard per-face material split, which read as a torn-
# paper edge rather than living tissue.
_CHAMBER_ANCHORS = {
    "HEART_RIGHT_ATRIUM": ((-0.55, -0.55, 0.55), (0.45, 0.58, 0.82)),
    "HEART_RIGHT_VENTRICLE": ((-0.45, -0.45, -0.45), (0.35, 0.48, 0.75)),
    "HEART_LEFT_ATRIUM": ((0.55, -0.55, 0.55), (0.68, 0.32, 0.55)),
    "HEART_LEFT_VENTRICLE": ((0.45, -0.45, -0.45), (0.58, 0.15, 0.28)),
}
_MYOCARDIUM_COLOR = (0.82, 0.45, 0.4)
_CHAMBER_BLEND_RADIUS = 1.35


def _chamber_blend_color(vx, vy, vz):
    """The exact same weighted chamber-color blend the vertex painter uses,
    factored out so anything else placed on the surface (like the LV
    highlight marker below) can ask "what color is the muscle actually
    painted at this exact point" instead of guessing a fixed color that
    drifts out of sync whenever the blend weights change."""
    front_visibility = max(0.0, min(1.0, (-vy - 0.15) / 0.5))

    weights = []
    colors = []
    for (center, color) in _CHAMBER_ANCHORS.values():
        dist = ((vx - center[0]) ** 2 + (vy - center[1]) ** 2 + (vz - center[2]) ** 2) ** 0.5
        weight = max(0.0, 1.0 - dist / _CHAMBER_BLEND_RADIUS) ** 1.1
        weights.append(weight)
        colors.append(color)

    total_chamber_weight = sum(weights)
    myo_weight = max(0.0, 1.0 - total_chamber_weight) if total_chamber_weight < 1.0 else 0.0
    norm = total_chamber_weight + myo_weight or 1.0

    r = (sum(w * c[0] for w, c in zip(weights, colors)) + myo_weight * _MYOCARDIUM_COLOR[0]) / norm
    g = (sum(w * c[1] for w, c in zip(weights, colors)) + myo_weight * _MYOCARDIUM_COLOR[1]) / norm
    b = (sum(w * c[2] for w, c in zip(weights, colors)) + myo_weight * _MYOCARDIUM_COLOR[2]) / norm

    # Blend back toward pure myocardium on the rear surface.
    r = r * front_visibility + _MYOCARDIUM_COLOR[0] * (1 - front_visibility)
    g = g * front_visibility + _MYOCARDIUM_COLOR[1] * (1 - front_visibility)
    b = b * front_visibility + _MYOCARDIUM_COLOR[2] * (1 - front_visibility)
    return (r, g, b)


def _lv_highlight_weight(vx, vy, vz):
    """How strongly this vertex belongs to the left ventricle, 0..1 -- the
    same distance-based weight _chamber_blend_color uses for HEART_LEFT_
    VENTRICLE specifically, also faded out on the rear surface. Stored per-
    vertex (see below) so the LV highlight can be a soft, seamless glow
    baked into the real chamber-blend shader instead of a separate floating
    decal object sitting proud of the curved surface -- a disc can never
    truly sit flush on a curved mesh (it always shows a seam/shadow no
    matter how well its color is matched), so this replaces that approach
    entirely rather than continuing to tune it."""
    front_visibility = max(0.0, min(1.0, (-vy - 0.15) / 0.5))
    center, _color = _CHAMBER_ANCHORS["HEART_LEFT_VENTRICLE"]
    dist = ((vx - center[0]) ** 2 + (vy - center[1]) ** 2 + (vz - center[2]) ** 2) ** 0.5
    weight = max(0.0, 1.0 - dist / _CHAMBER_BLEND_RADIUS) ** 1.1
    return weight * front_visibility


def _paint_chamber_vertex_colors(mesh):
    attr = mesh.color_attributes.new(name="ChamberBlend", type="FLOAT_COLOR", domain="POINT")
    for i, vert in enumerate(mesh.vertices):
        r, g, b = _chamber_blend_color(*vert.co)
        lv_weight = _lv_highlight_weight(*vert.co)
        attr.data[i].color = (r, g, b, lv_weight)  # alpha channel = LV highlight mask, not real opacity


def _make_blended_chamber_material(materials):
    mat = bpy.data.materials.new("mat_heart_blended")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes["Principled BSDF"]
    color_attr = nodes.new("ShaderNodeVertexColor")
    color_attr.layer_name = "ChamberBlend"
    links.new(color_attr.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.35
    if "Subsurface Weight" in bsdf.inputs:
        bsdf.inputs["Subsurface Weight"].default_value = 0.3
        bsdf.inputs["Subsurface Radius"].default_value = (0.3, 0.15, 0.1)

    # LV highlight: glow only where the vertex-painted LV mask (the alpha
    # channel above) is nonzero -- fades in smoothly at the chamber's real
    # edges with no seam, instead of a separate object that can only ever
    # approximate one.
    #
    # A real thing found by actually rendering this (not just reading the
    # code): using the tissue's OWN blended color as the emission color, as
    # a first pass did, was nearly invisible even at a strength that badly
    # overexposed the surface -- adding brightness in the SAME hue as an
    # already brightly-lit surface reads as almost nothing. The coronary/
    # aorta highlights work because gold/white emission stands out in HUE
    # against the pink/blue tissue, not just in brightness. So this uses a
    # fixed warm highlight tone instead of the vertex-blended color -- it
    # costs nothing at rest (Emission Strength is 0 there regardless of
    # what color it's paired with) and reads as a clear, deliberate
    # highlight once active, consistent with the other two structures.
    bsdf.inputs["Emission Color"].default_value = (1.0, 0.38, 0.18, 1.0)
    lv_intensity = nodes.new("ShaderNodeValue")
    lv_intensity.name = lv_intensity.label = "LVHighlightIntensity"
    lv_intensity.outputs[0].default_value = 0.0
    lv_strength = nodes.new("ShaderNodeMath")
    lv_strength.operation = "MULTIPLY"
    links.new(color_attr.outputs["Alpha"], lv_strength.inputs[0])
    links.new(lv_intensity.outputs[0], lv_strength.inputs[1])
    links.new(lv_strength.outputs[0], bsdf.inputs["Emission Strength"])

    materials["MYOCARDIUM"] = mat  # replace the flat placeholder with the real blended one
    return mat


# ---------------------------------------------------------------------------
# Great vessels + coronary arteries — bevelled curves, real tube geometry
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


def _surface_point(x, y, z, standoff=0.0):
    """Maps a DIRECTION through the exact same deformation build_myocardium()
    applies to the unit icosphere, so vessels/arteries authored here actually
    sit on the real deformed surface instead of floating in space.

    A real bug found by inspecting an actual render (not just reading the
    code): every caller below was passing hand-picked (x, y, z) triples that
    were never checked to actually lie ON the unit sphere the deformation
    assumes -- e.g. the LAD's (0.1, -1.0, -0.95) has magnitude ~1.38, so it
    got deformed as if it were 38% further from the heart's center than any
    real point on the mesh, and rendered as a tube floating past the actual
    silhouette (worst near the tapered apex). Normalizing to the unit sphere
    FIRST, before deforming, guarantees the result lands on the real surface
    regardless of how far off-sphere the authored coordinate was."""
    magnitude = math.sqrt(x * x + y * y + z * z) or 1.0
    x, y, z = x / magnitude, y / magnitude, z / magnitude

    stretch = 1.45
    below = max(0.0, -z)
    lean = 0.34 * below
    taper = 1.0 - 0.62 * (below ** 1.3)
    return (
        x * 0.95 * taper + lean,
        y * 0.85 * taper - standoff,  # small negative-y nudge = toward camera, off the surface
        z * stretch,
    )


def build_vessels(materials):
    vessels = {}
    vessels["AORTA"] = _make_tube(
        "Aorta",
        [
            _surface_point(0.25, -0.55, 0.75, 0.03),
            (0.5, -0.35, 1.55),
            (0.85, -0.2, 1.65),
            (1.05, -0.15, 1.25),
            (1.05, -0.1, 0.75),
        ],
        0.09, materials["AORTA"],
    )
    vessels["PULMONARY_ARTERY"] = _make_tube(
        "PulmonaryArtery",
        [_surface_point(-0.3, -0.5, 0.75, 0.03), (-0.5, -0.25, 1.3), (-0.7, -0.1, 1.4)],
        0.08, materials["PULMONARY_ARTERY"],
    )
    vessels["PULMONARY_VEINS"] = _make_tube(
        "PulmonaryVeins",
        [_surface_point(0.55, -0.6, 0.55, 0.03), (0.75, -0.55, 0.85)],
        0.045, materials["PULMONARY_VEINS"],
    )
    vessels["SVC"] = _make_tube(
        "SVC",
        [_surface_point(-0.55, -0.4, 0.6, 0.03), (-0.6, -0.25, 1.15)],
        0.08, materials["SVC"],
    )
    # The IVC's exit point previously jumped sideways to a hand-picked
    # second coordinate that didn't continue the vessel's own direction --
    # it read as a stray disconnected blob near the apex rather than a
    # vessel trailing off, once actually rendered. Extending further along
    # the SAME direction the first point already sits in reads as what it
    # is: one continuous tube leaving the heart, not two unrelated pieces.
    ivc_start = _surface_point(-0.4, -0.5, -0.85, 0.03)
    ivc_exit = tuple(c * 1.5 for c in ivc_start)
    vessels["IVC"] = _make_tube(
        "IVC",
        [ivc_start, ivc_exit],
        0.06, materials["IVC"],
    )
    return vessels


def build_coronary_arteries(materials):
    arteries = {}
    arteries["CORONARY_LAD"] = _make_tube(
        "CoronaryLAD",
        [
            _surface_point(0.1, -1.0, 0.3, 0.04),
            _surface_point(0.1, -1.0, -0.3, 0.04),
            _surface_point(0.1, -1.0, -0.7, 0.04),
            _surface_point(0.1, -1.0, -0.95, 0.04),
        ],
        0.03, materials["CORONARY_LAD"],
    )
    arteries["CORONARY_RCA"] = _make_tube(
        "CoronaryRCA",
        [
            _surface_point(-0.6, -0.75, 0.3, 0.04),
            _surface_point(-0.6, -0.75, -0.3, 0.04),
            _surface_point(-0.6, -0.75, -0.7, 0.04),
            _surface_point(-0.55, -0.7, -0.9, 0.04),
        ],
        0.03, materials["CORONARY_RCA"],
    )
    arteries["CORONARY_LCX"] = _make_tube(
        "CoronaryLCX",
        [
            _surface_point(0.75, -0.65, 0.3, 0.04),
            _surface_point(0.75, -0.65, -0.3, 0.04),
            _surface_point(0.75, -0.65, -0.7, 0.04),
            _surface_point(0.72, -0.6, -0.9, 0.04),
        ],
        0.03, materials["CORONARY_LCX"],
    )
    return arteries


def _register_lv_highlight_target(materials):
    """The LV chamber has no separate object (it's a vertex-color region of
    the shared myocardium material, see _lv_highlight_weight/_make_blended_
    chamber_material above), so give apply_highlight() something to find by
    the anatomy-group name it already looks up: the SAME MYOCARDIUM material.
    apply_highlight() special-cases this key to drive the material's
    "LVHighlightIntensity" shader node instead of the material's own (shared,
    whole-heart) Emission Strength socket.

    This replaces an earlier real attempt at this (a separate floating glow
    disc, color-matched to its surroundings) that kept showing a visible
    seam against the curved surface no matter how precisely its color or
    orientation were tuned -- a flat decal proud of a curved mesh always
    will. Baking the highlight into the per-vertex shader itself has no
    seam to fix because there's no separate geometry at all."""
    materials["HEART_LEFT_VENTRICLE"] = materials["MYOCARDIUM"]


def build_heart():
    """Entry point: builds every heart object + material and returns a
    dict keyed by anatomy-group name -> Blender object, matching
    HEART_ORGAN_MODULE.anatomyGroups in the TypeScript contract exactly."""
    materials = build_materials()
    objects = {}
    objects["MYOCARDIUM"] = build_myocardium(materials)
    objects.update(build_vessels(materials))
    objects.update(build_coronary_arteries(materials))
    _register_lv_highlight_target(materials)
    return objects, materials
