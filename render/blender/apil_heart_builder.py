"""Unmodified local APIL FBX reference; exact Sketchfab identity unresolved."""
import hashlib
import json
import os
from pathlib import Path
import bpy

FBX_HASH = 'e5a2a81a38f456c54e8d556b1db1c9c2000fcbf342374aa42b5f7369484dbf27'
EXPECTED = {
    'APIL HEART 1 LV Edit': (90485, 183157),
    'APIL HEART 1 LA Edit': (46127, 92618),
    'APIL HEART 1 AORTA Edit': (38057, 76122),
    'APIL HEART 1 RARV Edit': (70770, 141628),
}
SOURCE_LIGHTS = {'Hemi', 'Hemi.001', 'Hemi.002', 'Hemi.003', 'Hemi.004', 'Hemi.005',
                 'Sun', 'Sun.001', 'Sun.002', 'Sun.003'}


def checked_source():
    directory = os.environ.get('ORGANHEAL_APIL_LOCAL_SOURCE_DIRECTORY')
    if not directory:
        raise RuntimeError('APIL_SOURCE_MISSING')
    root = Path(directory)
    evidence = json.loads((Path(__file__).resolve().parents[2] / 'medical-assets/apil-local-heart-inventory.json').read_text())
    for record in evidence['nestedFiles']:
        name = record['filename']
        if Path(name).name != name:
            raise RuntimeError('APIL_SOURCE_PATH_INVALID')
        file = root / name
        if not file.is_file() or file.is_symlink():
            raise RuntimeError('APIL_SOURCE_MISSING')
        expected_hash = FBX_HASH if name == 'APIL_HEART_ONE_FULL_COLOUR.fbx' else record['sha256']
        if hashlib.sha256(file.read_bytes()).hexdigest() != expected_hash:
            raise RuntimeError('APIL_SOURCE_HASH_INVALID')
    return root / 'APIL_HEART_ONE_FULL_COLOUR.fbx'


def build_apil_heart():
    source = checked_source()
    if any(name in bpy.data.objects for name in EXPECTED):
        raise RuntimeError('APIL_OBJECT_NAME_COLLISION')
    before = set(bpy.data.objects)
    try:
        bpy.ops.import_scene.fbx(filepath=str(source), use_custom_normals=True)
        imported = set(bpy.data.objects) - before
        if len(imported) != 14 or {o.name for o in imported} != set(EXPECTED) | SOURCE_LIGHTS:
            raise RuntimeError('APIL_OBJECT_INVENTORY_INVALID')
        for obj in imported:
            if obj.name in SOURCE_LIGHTS:
                if obj.type != 'LIGHT':
                    raise RuntimeError('APIL_OBJECT_INVENTORY_INVALID')
                continue
            if obj.type != 'MESH':
                raise RuntimeError('APIL_OBJECT_INVENTORY_INVALID')
            obj.data.calc_loop_triangles()
            if (len(obj.data.vertices), len(obj.data.loop_triangles)) != EXPECTED[obj.name]:
                raise RuntimeError('APIL_OBJECT_INVENTORY_INVALID')
        # Preserve source materials and native FBX transforms; never split RARV.
        return {key: bpy.data.objects[name] for key, name in {
            'heart.leftVentricle': 'APIL HEART 1 LV Edit',
            'heart.leftAtrium': 'APIL HEART 1 LA Edit',
            'heart.aorta': 'APIL HEART 1 AORTA Edit',
        }.items()}, {}
    except Exception:
        for obj in set(bpy.data.objects) - before:
            bpy.data.objects.remove(obj, do_unlink=True)
        raise
