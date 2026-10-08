"""One headless build; dispatch and preflight checks, no render."""
import sys, json, tempfile
from pathlib import Path
from unittest.mock import patch
import bpy
from mathutils import Matrix
sys.dont_write_bytecode = True
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'render/blender'))
import ssm_heart_builder as builder
import render_scene as dispatch
assert dispatch.resolve_asset_builder('heart','heart-ssm-4506463-v2-internal-review-v1') is builder.build_ssm_heart
assert dispatch.resolve_asset_builder('heart','heart-v2-development') is dispatch.build_heart
assert dispatch.resolve_asset_builder('heart','heart-bp3d-4.0-internal-review-v1') is dispatch.build_bp3d_heart
for organ,version in [('heart','unknown'),('lungs','heart-ssm-4506463-v2-internal-review-v1')]:
    try: dispatch.resolve_asset_builder(organ,version); raise AssertionError('FALLBACK')
    except SystemExit as error: assert str(error).startswith('ASSET_NOT_FOUND' if organ=='heart' else 'INVALID_ORGAN')
original = builder.ASSET_DIRECTORY
with tempfile.TemporaryDirectory(prefix='organheal-ssm-preflight-') as directory:
    root=Path(directory)
    (root/'selection-manifest.json').write_bytes((original/'selection-manifest.json').read_bytes())
    with patch.object(builder,'ASSET_DIRECTORY',root):
        try: builder.build_ssm_heart(); raise AssertionError('MISSING_ACCEPTED')
        except RuntimeError as error: assert str(error)=='SSM_ASSET_MISSING'
        (root/'basal-patch.obj').write_text('invalid')
        try: builder.build_ssm_heart(); raise AssertionError('HASH_ACCEPTED')
        except RuntimeError as error: assert str(error)=='SSM_ASSET_HASH_INVALID'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
structures,materials=builder.build_ssm_heart()
assert len(structures)==5 and not materials
manifest=json.loads((original/'selection-manifest.json').read_text())
for asset in manifest['assets']:
    name=asset['derivedFilename']
    if name=='apex-reference.obj': continue
    obj=structures[builder.SELECTED[name]]
    assert obj.matrix_world==Matrix.Identity(4)
    assert len(obj.data.vertices)==asset['vertices'] and len(obj.data.polygons)==asset['faces']
    assert not any(p.use_smooth for p in obj.data.polygons)
    for side,fn in enumerate([min,max]):
        for axis in range(3):
            assert abs(fn(v.co[axis] for v in obj.data.vertices)-asset['bounds'][side][axis])<0.00001
apex=bpy.data.objects['LM_heart.ssm.apexReference']
assert apex.type=='EMPTY'
expected=builder.checked_assets()['apex-reference.obj'][0][0]
assert max(abs(apex.location[i]-expected[i]) for i in range(3))<0.00001
assert bpy.data.objects['LM_heart.ssm.basalPatchCenter'].type=='EMPTY'
assert len(bpy.data.objects)==7
assert not any('myocardium' in name or 'septum' in name or 'BP3D' in name for name in bpy.data.objects.keys())
print('SSM_BUILDER_ACCEPTANCE_PASS: 5 meshes + 2 references; Blender '+bpy.app.version_string)
