"""Pinned SSM source-part review only. No transforms, reconstruction or approval."""
import hashlib
import json
from pathlib import Path
import bpy

ASSET_DIRECTORY = Path(__file__).resolve().parents[2] / 'medical-assets/candidates/zenodo-4506463-v2'
SELECTED = {
    'basal-patch.obj': 'heart.ssm.basalPatch',
    'ventricular-epicardial-patch.obj': 'heart.ssm.ventricularEpicardialPatch',
    'lv-endocardial-surface.obj': 'heart.leftVentricle',
    'rv-endocardial-surface.obj': 'heart.rightVentricle',
    'composite-ventricular-tissue-boundary.obj': 'heart.ssm.compositeVentricularTissueBoundary',
    'apex-reference.obj': None,
}

def checked_assets():
    manifest = json.loads((ASSET_DIRECTORY/'selection-manifest.json').read_text())
    if manifest['sourceId'] != 'zenodo-4506463' or manifest['sourceVersion'] != 'v2' or len(manifest['assets']) != 6:
        raise RuntimeError('SSM_ASSET_IDENTITY_INVALID')
    result = {}
    for asset in manifest['assets']:
        name = asset['derivedFilename']
        if name not in SELECTED or name in result or asset['qualification'] != 'QUALIFIED_INTERNAL_REVIEW':
            raise RuntimeError('SSM_ASSET_IDENTITY_INVALID')
        if asset['transform'] != dict(matrix=[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]],units='millimeter',anatomicalAxes='UNRESOLVED'):
            raise RuntimeError('SSM_TRANSFORM_INVALID')
        file = ASSET_DIRECTORY/name
        if not file.is_file(): raise RuntimeError('SSM_ASSET_MISSING')
        data = file.read_bytes()
        if hashlib.sha256(data).hexdigest() != asset['derivedHash']:
            raise RuntimeError('SSM_ASSET_HASH_INVALID')
        lines = data.decode('ascii').splitlines()
        points = [tuple(float(v) for v in line.split()[1:]) for line in lines if line.startswith('v ')]
        faces = [tuple(int(v)-1 for v in line.split()[1:]) for line in lines if line.startswith('f ')]
        if len(points) != asset['vertices'] or len(faces) != asset['faces'] or any(len(p)!=3 for p in points) or any(len(f)!=3 or min(f)<0 or max(f)>=len(points) for f in faces):
            raise RuntimeError('SSM_OBJECT_INVENTORY_INVALID')
        if name == 'apex-reference.obj' and (len(points)!=1 or faces): raise RuntimeError('SSM_APEX_INVALID')
        result[name] = (points,faces)
    return result

def build_ssm_heart():
    assets = checked_assets()  # All files checked before any scene mutation.
    names = ['SSM_'+name[:-4].replace('-','_') for name in SELECTED if SELECTED[name]] + ['LM_heart.ssm.apexReference','LM_heart.ssm.basalPatchCenter']
    if any(name in bpy.data.objects for name in names): raise RuntimeError('SSM_OBJECT_NAME_COLLISION')
    created, meshes, structures = [], [], {}
    try:
        for name, structure_id in SELECTED.items():
            if structure_id is None: continue
            points, faces = assets[name]
            object_name = 'SSM_'+name[:-4].replace('-','_')
            mesh = bpy.data.meshes.new(object_name); meshes.append(mesh)
            mesh.from_pydata(points,[],faces); mesh.update()
            obj = bpy.data.objects.new(object_name,mesh); created.append(obj)
            bpy.context.collection.objects.link(obj)
            structures[structure_id] = obj
        references = {
            'apexReference': assets['apex-reference.obj'][0][0],
            'basalPatchCenter': tuple(sum(p[i] for p in assets['basal-patch.obj'][0])/len(assets['basal-patch.obj'][0]) for i in range(3)),
        }
        for name, coordinate in references.items():
            obj = bpy.data.objects.new('LM_heart.ssm.'+name,None); created.append(obj)
            bpy.context.collection.objects.link(obj); obj.location = coordinate
        return structures, {}
    except Exception:
        for obj in created: bpy.data.objects.remove(obj,do_unlink=True)
        for mesh in meshes:
            if mesh.users == 0: bpy.data.meshes.remove(mesh)
        raise
