"""Inactive BP3D internal-review source-part builder. No clinical approval."""
import hashlib
import json
from pathlib import Path
import bpy
from mathutils import Matrix, Vector

ASSET_DIRECTORY = Path(__file__).resolve().parents[2] / "medical-assets/candidates/bodyparts3d-4.0"
SELECTED = (
    "BP8677", "BP8719", "BP9227", "BP8928", "BP10329", "BP10292",
    "BP10311", "BP8690", "BP8968", "BP8463", "BP8221", "BP8961", "BP8970", "BP8397",
)


def derive_review_landmarks(structures):
    """AABB centers/extrema only; not clinical apex/base or vessel origins."""
    groups = {
        "reviewWholeCenter": list(structures),
        "reviewChamberCenter": [key for key in structures if key.endswith(("Atrium", "Ventricle"))],
        "reviewCoronaryCenter": [key for key in structures if ".coronary." in key],
        "reviewVesselCenter": [key for key in structures if not key.endswith(("Atrium", "Ventricle"))],
    }
    bounds = {}
    for name, ids in groups.items():
        points = [obj.matrix_world @ vertex.co for key in sorted(ids) for obj in sorted(structures[key].children, key=lambda o: o.name) for vertex in obj.data.vertices]
        if not points:
            raise RuntimeError("BP3D_LANDMARK_SOURCE_MISSING")
        bounds[name] = (Vector([min(p[i] for p in points) for i in range(3)]), Vector([max(p[i] for p in points) for i in range(3)]))
    positions = {name: (lo + hi) / 2 for name, (lo, hi) in bounds.items()}
    lo, hi = bounds["reviewWholeCenter"]
    positions["reviewBoundsMin"] = lo
    positions["reviewBoundsMax"] = hi
    result = {}
    for name, point in positions.items():
        object_name = "LM_heart.bp3d." + name
        if object_name in bpy.data.objects:
            raise RuntimeError("BP3D_OBJECT_NAME_COLLISION")
        obj = bpy.data.objects.new(object_name, None)
        bpy.context.collection.objects.link(obj)
        obj.location = point
        result[name] = obj
    return result


def checked_assets():
    manifest = json.loads((ASSET_DIRECTORY / "selection-manifest.json").read_text())
    assets = []
    for representation in SELECTED:
        matches = [a for a in manifest["assets"] if a["representationId"] == representation]
        if len(matches) != 1:
            raise RuntimeError("BP3D_ASSET_IDENTITY_INVALID")
        asset = matches[0]
        name = asset["derivedFile"]
        if name != f'{asset["conceptId"]}_{representation}.obj':
            raise RuntimeError("BP3D_ASSET_IDENTITY_INVALID")
        if asset["transform"] != {"matrix": [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]], "units": "millimeter"}:
            raise RuntimeError("BP3D_TRANSFORM_INVALID")
        file = ASSET_DIRECTORY / name
        if not file.is_file():
            raise RuntimeError("BP3D_ASSET_MISSING")
        if hashlib.sha256(file.read_bytes()).hexdigest() != asset["derivedHash"]:
            raise RuntimeError("BP3D_ASSET_HASH_INVALID")
        assets.append((asset, file))
    return assets


def build_bp3d_heart():
    # Preflight every required file before any Blender scene mutation.
    assets = checked_assets()
    expected = [f'BP3D_{a["conceptId"]}_{a["representationId"]}' for a, _ in assets]
    children = [f'{a["conceptId"]}_{a["representationId"]}_{s["sourceFilename"][:-4]}' for a, _ in assets for s in a["sources"]]
    if any(name in bpy.data.objects for name in expected + children):
        raise RuntimeError("BP3D_OBJECT_NAME_COLLISION")
    created = []
    structures = {}
    try:
        for asset, file in assets:
            before = set(bpy.data.objects)
            bpy.ops.wm.obj_import(filepath=str(file), forward_axis="Y", up_axis="Z",
                                  use_split_objects=True, use_split_groups=False, validate_meshes=False)
            meshes = set(bpy.data.objects) - before
            created.extend(meshes)
            names = {f'{asset["conceptId"]}_{asset["representationId"]}_{s["sourceFilename"][:-4]}' for s in asset["sources"]}
            if {obj.name for obj in meshes} != names or any(obj.type != "MESH" or obj.matrix_world != Matrix.Identity(4) for obj in meshes):
                raise RuntimeError("BP3D_OBJECT_INVENTORY_INVALID")
            if sum(len(obj.data.vertices) for obj in meshes) != asset["derived"]["vertexCount"] or sum(len(obj.data.polygons) for obj in meshes) != asset["derived"]["faceCount"]:
                raise RuntimeError("BP3D_GEOMETRY_COUNTS_INVALID")
            name = f'BP3D_{asset["conceptId"]}_{asset["representationId"]}'
            parent = bpy.data.objects.new(name, None)
            bpy.context.collection.objects.link(parent)
            created.append(parent)
            for obj in meshes:
                obj.parent = parent
            structures[asset["proposedOrganHealStructureId"]] = parent
        landmarks = derive_review_landmarks(structures)
        created.extend(landmarks.values())
        return structures, {}
    except Exception:
        for obj in created:
            bpy.data.objects.remove(obj, do_unlink=True)
        raise
