"""Procedural heart geometry + materials — OrganHeal's own, built from code,
not a purchased/downloaded 3D model. Deliberately a *script* (text, git-
friendly, versionable) rather than a stored .blend binary: running this
function always reconstructs the exact same anatomy deterministically, so
there is nothing large or opaque to commit.

A real cutaway, not a solid exterior with painted-on chamber colors. An
earlier version of this file simulated "chambers" by blending chamber
colors onto the outside of a solid mass -- visually smoother than the flat
SVG attempts, but anatomically dishonest at a conceptual level: a real
heart's intact exterior never shows its internal cavities at all. Every
real clinical heart illustration (the actual bar this is measured against)
solves this the same way: cut the model open. This does that literally --
the front quadrant is sliced away and the remaining shell is hollowed with
real wall thickness, so the four chambers, the septum, and the great
vessels' true connections are genuinely visible THROUGH the opening, the
same way a real anatomy plate or a real cardiac surgeon's view works.

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

def _deform_vertex(x, y, z):
    """The shared icosphere -> heart-silhouette deformation, factored out so
    both the mesh builder and the cutaway plane math use the exact same
    formula (previously duplicated by hand across three places, a real
    source of drift bugs earlier this session)."""
    stretch = 1.45
    below = max(0.0, -z)
    lean = 0.34 * below
    taper = 1.0 - 0.62 * (below ** 1.3)
    vx = x * 0.95 * taper + lean
    vy = y * 0.85 * taper
    vz = z * stretch
    if z > 0.45:
        side = 1 if x > 0 else -1
        bump = max(0.0, (z - 0.45) * 2.0) * 0.18
        vx += side * bump
    return vx, vy, vz


def build_myocardium(materials):
    """A real hollow, cut-open heart -- not a solid exterior blob with fake
    chamber colors painted on its outside.

    A real heart's intact exterior never shows its chambers at all; they're
    internal cavities. An earlier version of this file simulated "chambers"
    by blending chamber colors onto the OUTSIDE surface, which no amount of
    shader polish can make anatomically honest -- it's not how a heart
    looks, full stop. This builds an actual cutaway instead: the front
    quadrant is sliced away (bmesh bisect), the remaining shell gets real
    wall thickness (Solidify, hollowing inward), and the newly-exposed
    INTERIOR surface -- and only the interior -- carries the chamber-blend
    material. The exterior stays a plain, uniform muscle color, which is
    what a real myocardium's outside actually looks like."""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)

    for v in bm.verts:
        v.co = Vector(_deform_vertex(v.co.x, v.co.y, v.co.z))

    # Slice away the front-facing quadrant (the side toward the camera,
    # -Y) so the camera looks straight into a real hollow cavity instead
    # of an intact shell -- the same technique every clinical heart
    # illustration uses, not a stylistic choice unique to this build.
    # clear_outer removes geometry on the positive-normal side of the
    # plane; the exact side was confirmed empirically by rendering, not
    # guessed from the sign convention alone.
    bmesh.ops.bisect_plane(
        bm,
        geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
        plane_co=Vector((0.05, -0.05, 0.05)),
        plane_no=Vector((0.2, -0.85, 0.3)).normalized(),
        clear_outer=True,
        clear_inner=False,
    )

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

    _paint_chamber_vertex_colors(mesh)

    exterior_mat = _make_organic_material("mat_myocardium_exterior", _MYOCARDIUM_COLOR, subsurface=0.35)
    interior_mat = _make_blended_chamber_material(materials)
    obj.data.materials.append(exterior_mat)  # index 0 -- the real, plain, uniform outside
    obj.data.materials.append(interior_mat)  # index 1 -- chamber-blend, only reached through the cut

    subsurf = obj.modifiers.new("Smooth", "SUBSURF")
    subsurf.levels = 2
    subsurf.render_levels = 2

    # Hollow the shell inward (real wall thickness, not a zero-thickness
    # surface) and cap the cut opening with connecting rim geometry, so the
    # cutaway reads as a real wall's cross-section rather than an
    # infinitely-thin shell. material_offset/_rim route the NEW inward-
    # facing and rim faces to slot 1 (the chamber-blend material) while the
    # original outward faces stay on slot 0 (plain exterior).
    solidify = obj.modifiers.new("Wall", "SOLIDIFY")
    solidify.thickness = 0.22
    solidify.offset = -1  # keep the original surface as the outer bound
    solidify.use_rim = True
    solidify.material_offset = 1
    solidify.material_offset_rim = 1

    return obj


# Chamber centers in the SAME final deformed space _surface_point() maps
# into -- an approximation of "the chamber is visible through the muscle
# roughly here" rather than a true separate hollow interior (a real next
# increment, not this pass's scope). Smoothly blended per-vertex (see
# below) instead of a hard per-face material split, which read as a torn-
# paper edge rather than living tissue.
# Shifted from the OLD anchors (which sat near y=-0.55/-0.45, tuned for
# the exterior FRONT surface a camera used to see directly) to the real
# interior back wall now exposed by the cutaway -- a real bug found by
# actually rendering the first cutaway pass: with the front quadrant
# sliced away, those old anchors were sitting in the REMOVED geometry, so
# their blend barely reached the wall that's actually still visible,
# and the interior rendered as a near-uniform wash instead of four
# distinct chamber regions.
# Pushed more saturated than the first cutaway pass -- rendering that
# first version next to the reference showed the four regions reading as
# one soft wash rather than four distinct chambers. Real venous/arterial
# blood-color convention (deoxygenated blue-toned right heart, oxygenated
# red right heart) pushed harder here for legibility, same convention,
# more contrast.
_CHAMBER_ANCHORS = {
    "HEART_RIGHT_ATRIUM": ((-0.55, 0.35, 0.55), (0.22, 0.4, 0.78)),
    "HEART_RIGHT_VENTRICLE": ((-0.45, 0.45, -0.45), (0.13, 0.26, 0.6)),
    "HEART_LEFT_ATRIUM": ((0.55, 0.35, 0.55), (0.75, 0.2, 0.4)),
    "HEART_LEFT_VENTRICLE": ((0.45, 0.45, -0.45), (0.6, 0.05, 0.14)),
}
_MYOCARDIUM_COLOR = (0.82, 0.45, 0.4)
_CHAMBER_BLEND_RADIUS = 0.85


def _chamber_blend_color(vx, vy, vz):
    """The exact same weighted chamber-color blend the vertex painter uses,
    factored out so anything else (like the LV highlight weight below) can
    ask "what color is the interior actually painted at this exact point"
    instead of guessing a fixed color that drifts out of sync whenever the
    blend weights change.

    No longer fades toward plain myocardium based on which way the vertex
    faces (an earlier version did, to hide the fact it was painting fake
    chamber colors onto a solid EXTERIOR the camera wasn't quite looking
    at). That fade is gone because the dishonesty it was covering for is
    gone: this color is now only ever used on the real interior cavity
    material (see build_myocardium's material_offset split), which the
    camera only sees through the actual cutaway."""
    weights = []
    colors = []
    for (center, color) in _CHAMBER_ANCHORS.values():
        dist = ((vx - center[0]) ** 2 + (vy - center[1]) ** 2 + (vz - center[2]) ** 2) ** 0.5
        weight = max(0.0, 1.0 - dist / _CHAMBER_BLEND_RADIUS) ** 1.5
        weights.append(weight)
        colors.append(color)

    total_chamber_weight = sum(weights)
    myo_weight = max(0.0, 1.0 - total_chamber_weight) if total_chamber_weight < 1.0 else 0.0
    norm = total_chamber_weight + myo_weight or 1.0

    r = (sum(w * c[0] for w, c in zip(weights, colors)) + myo_weight * _MYOCARDIUM_COLOR[0]) / norm
    g = (sum(w * c[1] for w, c in zip(weights, colors)) + myo_weight * _MYOCARDIUM_COLOR[1]) / norm
    b = (sum(w * c[2] for w, c in zip(weights, colors)) + myo_weight * _MYOCARDIUM_COLOR[2]) / norm
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
    center, _color = _CHAMBER_ANCHORS["HEART_LEFT_VENTRICLE"]
    dist = ((vx - center[0]) ** 2 + (vy - center[1]) ** 2 + (vz - center[2]) ** 2) ** 0.5
    return max(0.0, 1.0 - dist / _CHAMBER_BLEND_RADIUS) ** 1.5


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


def build_septum(materials):
    """The real dividing wall between the right (blue) and left (red) heart
    -- without this, the interior the cutaway now exposes is one continuous
    bowl with a color gradient across it, not two genuinely separate
    chambers the way an actual heart (and every real clinical illustration
    of one) has. A gradient implies "no wall here"; a real heart very much
    has one. Built as its own thin curved surface running through the
    cavity's real centerline (following the same lean-with-height the
    myocardium mesh itself uses, not a flat x=0 guess), colored plain
    muscle tone -- the septum is myocardium too, not chamber-colored."""
    bm = bmesh.new()
    rows = 14
    cols = 6
    verts_grid = []
    for i in range(rows):
        t = i / (rows - 1)  # 0 = base (top), 1 = apex (bottom)
        z = 1.05 - t * 2.15
        below = max(0.0, -z)
        lean = 0.34 * below
        taper = 1.0 - 0.62 * (below ** 1.3)
        # Depth span of the cavity at this height: from just inside the cut
        # opening (front) back to the far interior wall, both scaled by the
        # same taper the myocardium shell uses so the septum's edge tracks
        # the real cavity boundary instead of poking through it.
        y_front = -0.08 * taper
        y_back = 0.78 * taper
        row = []
        for j in range(cols):
            s = j / (cols - 1)
            y = y_front + s * (y_back - y_front)
            row.append(bm.verts.new((lean, y, z)))
        verts_grid.append(row)

    for i in range(rows - 1):
        for j in range(cols - 1):
            bm.faces.new((
                verts_grid[i][j], verts_grid[i][j + 1],
                verts_grid[i + 1][j + 1], verts_grid[i + 1][j],
            ))

    mesh = bpy.data.meshes.new("Septum")
    bm.to_mesh(mesh)
    bm.free()
    for poly in mesh.polygons:
        poly.use_smooth = True

    obj = bpy.data.objects.new("Septum", mesh)
    bpy.context.collection.objects.link(obj)
    septum_mat = _make_organic_material("mat_septum", _MYOCARDIUM_COLOR, subsurface=0.3)
    obj.data.materials.append(septum_mat)
    return obj


def _make_torus_bmesh(major_radius, minor_radius, major_segments=24, minor_segments=8):
    """A real ring of geometry (not an emissive decal or a flat circle) --
    Blender's bmesh has no built-in torus primitive, so this parametrizes
    one directly. Lies flat in its own local XY plane with the tube's bump
    along local Z; callers orient it to the real surface normal at its
    valve position."""
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


def build_valves(materials):
    """Real ring geometry at the four valve junctions -- without these, the
    boundary between an atrium and its ventricle (or a ventricle and its
    great vessel) is only ever a soft color gradient, which reads as "no
    real structure here" the way the septum's absence used to. A real
    heart has an actual fibrous ring at each of these four junctions; this
    draws one, not just a color change.

    Positions are the real anchor points already used for the chamber
    color blend (build_septum's docstring / _CHAMBER_ANCHORS above) for
    the two AV valves, and the great-vessel root directions already used
    by build_vessels for the two semilunar valves -- reusing the SAME
    coordinates the rest of the anatomy already commits to, not a new
    hand-picked guess."""
    valve_mat = _make_organic_material("mat_valve", (0.92, 0.86, 0.78), subsurface=0.1, roughness=0.25)

    ra_center, _ = _CHAMBER_ANCHORS["HEART_RIGHT_ATRIUM"]
    rv_center, _ = _CHAMBER_ANCHORS["HEART_RIGHT_VENTRICLE"]
    la_center, _ = _CHAMBER_ANCHORS["HEART_LEFT_ATRIUM"]
    lv_center, _ = _CHAMBER_ANCHORS["HEART_LEFT_VENTRICLE"]

    specs = {
        # Tricuspid: between right atrium and right ventricle.
        "tricuspid": (tuple((a + b) / 2 for a, b in zip(ra_center, rv_center)), 0.16),
        # Mitral: between left atrium and left ventricle.
        "mitral": (tuple((a + b) / 2 for a, b in zip(la_center, lv_center)), 0.16),
        # Pulmonic: right ventricle into the pulmonary artery root.
        "pulmonic": (_surface_point(-0.3, -0.5, 0.75, standoff=-0.02), 0.12),
        # Aortic: left ventricle into the aorta root.
        "aortic": (_surface_point(0.25, -0.55, 0.75, standoff=-0.02), 0.12),
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
        # Lay the ring flush-ish against the local surface: its face normal
        # (local Z) points along the approximate outward direction from
        # the heart's own center, same approximation _surface_point's
        # deformation already implies for nearby geometry. Found by
        # actually rendering this: sitting exactly at the anchor point let
        # part of each ring intersect the solid interior wall (rendering
        # as a broken arc instead of a closed ring), so it's nudged out
        # along that same outward direction to clear the surface.
        outward = Vector(center).normalized() if Vector(center).length > 0 else Vector((0, -1, 0))
        obj.location = Vector(center) + outward * (radius * 0.35)
        obj.rotation_euler = outward.to_track_quat("Z", "Y").to_euler()
        obj.data.materials.append(valve_mat)
        bpy.context.collection.objects.link(obj)
        valves[name] = obj

    return valves


def _make_flow_arrow(name, start, end, shaft_radius, head_radius, material):
    """A real arrow -- a shaft tube plus a cone head oriented along the
    real direction between two anatomy points -- not a label or an icon
    pasted on top. Matches the reference image's black flow-direction
    arrows at each valve: this is the one piece of this rebuild that's
    purely informational rather than a physical structure, so it uses a
    flat, unlit material (not organic/subsurface) to read as a diagram
    annotation, distinct from the tissue it's drawn on."""
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


def build_flow_arrows(materials):
    """Blood-flow direction through the two AV valves -- the reference
    image's clearest legibility win beyond real chamber colors. Only the
    two valves actually visible through the cutaway get one each (the
    semilunar valves near the vessel roots are mostly hidden behind the
    rim from the current camera angles); adding arrows nobody can see
    would be worse than not drawing them."""
    flow_mat = _make_organic_material("mat_flow_arrow", (0.08, 0.08, 0.1), subsurface=0.0, roughness=0.5)

    ra_center, _ = _CHAMBER_ANCHORS["HEART_RIGHT_ATRIUM"]
    rv_center, _ = _CHAMBER_ANCHORS["HEART_RIGHT_VENTRICLE"]
    la_center, _ = _CHAMBER_ANCHORS["HEART_LEFT_ATRIUM"]
    lv_center, _ = _CHAMBER_ANCHORS["HEART_LEFT_VENTRICLE"]

    def _short_segment(a, b, span=0.42):
        # A short arrow centered on the real valve junction, not spanning
        # the full atrium-to-ventricle distance -- an arrow that long
        # reads as a spear through the whole chamber, not a valve marker.
        mid = tuple((x + y) / 2 for x, y in zip(a, b))
        direction = Vector(b) - Vector(a)
        direction = direction.normalized() if direction.length > 1e-6 else Vector((0, 0, -1))
        half = direction * (span / 2)
        return tuple(Vector(mid) - half), tuple(Vector(mid) + half)

    objects = {}
    tri_start, tri_end = _short_segment(ra_center, rv_center)
    objects["FLOW_ARROW_TRICUSPID"], objects["FLOW_ARROW_TRICUSPID_HEAD"] = _make_flow_arrow(
        "FlowTricuspid", tri_start, tri_end, 0.02, 0.045, flow_mat,
    )
    mit_start, mit_end = _short_segment(la_center, lv_center)
    objects["FLOW_ARROW_MITRAL"], objects["FLOW_ARROW_MITRAL_HEAD"] = _make_flow_arrow(
        "FlowMitral", mit_start, mit_end, 0.02, 0.045, flow_mat,
    )
    return objects


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
    objects["SEPTUM"] = build_septum(materials)
    objects.update(build_valves(materials))
    objects.update(build_flow_arrows(materials))
    objects.update(build_vessels(materials))
    objects.update(build_coronary_arteries(materials))
    _register_lv_highlight_target(materials)
    return objects, materials
