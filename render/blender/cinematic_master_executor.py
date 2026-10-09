"""Compiler-owned neutral camera execution over the exact locked master builders."""
import argparse
import ast
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import sys
import time


def load_module(filename, expected):
    if hashlib.sha256(filename.read_bytes().replace(b'\r\n', b'\n')).hexdigest() != expected:
        raise RuntimeError('CINEMATIC_BUILDER_INVALID')
    spec = importlib.util.spec_from_file_location(filename.stem, filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def prepare_native_scene(module, source, output):
    # Reuse the unmodified locked setup of the monolithic R2.2 builder. Extract
    # only its setup before its first render call; no shader/camera values are
    # copied or overridden here. Fail closed if that exact source changes.
    tree = ast.parse(Path(module.__file__).read_text())
    function = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'main')
    boundaries = [i for i, n in enumerate(function.body) if isinstance(n, ast.Expr)
                  and isinstance(n.value, ast.Call) and ast.unparse(n.value.func) == 'bpy.ops.render.render']
    if len(boundaries) != 2:
        raise RuntimeError('CINEMATIC_NATIVE_SETUP_INVALID')
    function.body = function.body[:boundaries[0]]
    exec(compile(ast.fix_missing_locations(ast.Module(body=[function], type_ignores=[])), module.__file__, 'exec'), module.__dict__)
    old = sys.argv
    try:
        sys.argv = ['blender', '--', '--source', str(source), '--output', str(output)]
        module.main()
    finally:
        sys.argv = old


def camera_evidence(scene, policy, points, previous=None):
    from bpy_extras.object_utils import world_to_camera_view
    camera = scene.camera
    if camera.data.type == 'PERSP':
        fov = math.degrees(2 * math.atan(camera.data.sensor_width / (2 * camera.data.lens)))
        if not policy['minimumFovDegrees'] <= fov <= policy['maximumFovDegrees']:
            raise RuntimeError('CINEMATIC_CAMERA_FOV_INVALID')
    projected = [world_to_camera_view(scene, camera, p) for p in points]
    bounds = [min(p.x for p in projected), min(p.y for p in projected), max(p.x for p in projected), max(p.y for p in projected)]
    left, bottom, right, top = policy['safeOrganRectangle']
    if any(p.z <= camera.data.clip_start for p in projected) or bounds[0] < left or bounds[1] < bottom or bounds[2] > right or bounds[3] > top:
        raise RuntimeError('CINEMATIC_CAMERA_FRAMING_INVALID')
    if previous and camera.rotation_euler != previous['rotation']:
        raise RuntimeError('CINEMATIC_CAMERA_ROTATION_INVALID')
    return bounds


def mesh_points(scene, source_object):
    import bpy
    result = []
    for obj in scene.objects:
        if obj.type != 'MESH' or obj.hide_render or obj.name != source_object:
            continue
        evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = evaluated.to_mesh()
        result.extend(evaluated.matrix_world @ v.co for v in mesh.vertices)
        evaluated.to_mesh_clear()
    if not result or any(not math.isfinite(x) for p in result for x in p):
        raise RuntimeError('CINEMATIC_GEOMETRY_INVALID')
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', required=True)
    parser.add_argument('--preflight', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    config = json.loads(Path(args.config).read_text())
    if set(config) != {'version', 'masterId', 'source', 'textures', 'repositoryRoot', 'outputDirectory', 'scenes', 'builderSha256', 'sourceSha256'} or config['version'] != 'cinematic-reference-1':
        raise RuntimeError('CINEMATIC_CONFIG_INVALID')
    root, out = Path(config['repositoryRoot']), Path(config['outputDirectory'])
    if not out.is_dir() or out.is_symlink() or hashlib.sha256(Path(config['source']).read_bytes()).hexdigest() != config['sourceSha256']:
        raise RuntimeError('CINEMATIC_SOURCE_INVALID')
    import bpy
    from mathutils import Vector
    hero = config['masterId'] == 'HEART_MASTER_VISUAL_V1'
    if not hero and config['masterId'] != 'HEARTBEAT_MOTION_MASTER_V1':
        raise RuntimeError('CINEMATIC_MASTER_INVALID')
    filename = root / 'render/blender' / ('heart_hero_master.py' if hero else 'heartbeat_motion_master.py')
    module = load_module(filename, config['builderSha256'])
    if hero:
        master = json.loads(filename.with_suffix('.json').read_text())
        module.build_scene(master, Path(config['source']), Path(config['textures']))
        prefs = bpy.context.preferences.addons['cycles'].preferences
        try:
            prefs.compute_device_type = 'OPTIX'; prefs.get_devices()
            for device in prefs.devices:
                device.use = device.type != 'CPU'
            if any(d.use for d in prefs.devices):
                bpy.context.scene.cycles.device = 'GPU'
        except Exception:
            pass
    else:
        prepare_native_scene(module, Path(config['source']), out / 'setup-only.mp4')
    scene = bpy.context.scene
    # Cinematic presentation only; the locked source masters remain unchanged.
    presentation = {'heroApproachRatio': 1.095, 'cutawayScale': .90,
                    'cutawayExposureDelta': -.10, 'lightSizeScale': 1.20,
                    'lightEnergyScales': {'key': .95, 'fill': 1.02, 'rim': .90}}
    if not hero:
        scene.camera.data.ortho_scale *= presentation['cutawayScale']
        scene.view_settings.exposure += presentation['cutawayExposureDelta']
        for name, energy_scale in presentation['lightEnergyScales'].items():
            light = bpy.data.objects.get('Motion_' + name)
            if light is None or light.type != 'LIGHT' or light.data.type != 'AREA':
                raise RuntimeError('CINEMATIC_PRESENTATION_LIGHT_INVALID')
            light.data.energy *= energy_scale
            light.data.size *= presentation['lightSizeScale']
    scene.render.fps = 24
    scene.render.image_settings.media_type = 'IMAGE'
    scene.render.image_settings.file_format = 'PNG'
    camera = scene.camera
    baseline = camera.location.copy()
    rotation = camera.rotation_euler.copy()
    scale = camera.data.ortho_scale
    source_object = master['source']['object'] if hero else 'heart.2'
    points = mesh_points(scene, source_object)
    lo = Vector([min(p[k] for p in points) for k in range(3)])
    hi = Vector([max(p[k] for p in points) for k in range(3)])
    extent = (hi-lo).length
    center = (lo+hi)/2
    distance = (baseline-center).length
    start = time.perf_counter()
    evidence = []
    for segment in config['scenes']:
        if set(segment) != {'sceneIndex', 'frameCount', 'sourceFrameOffset', 'camera'} or not 1 <= segment['frameCount'] <= 1440:
            raise RuntimeError('CINEMATIC_SEGMENT_INVALID')
        policy = segment['camera']
        if policy['version'] != '1' or policy['rotation'] != 'locked-source-camera' or policy['rollDegrees'] != 0 or policy['shake'] or policy['target'] != 'source-bounds-center-only':
            raise RuntimeError('CINEMATIC_CAMERA_POLICY_INVALID')
        if not 1 <= policy['requestedMaximumRatio'] <= 1.15 or not 1.2 <= distance/extent <= 10:
            raise RuntimeError('CINEMATIC_CAMERA_DISTANCE_INVALID master=%s distance=%s extent=%s ratio=%s' % (config['masterId'], distance, extent, distance/extent))
        movement = policy['movement']
        count = (1 if hero else 24) if movement == 'hold' else segment['frameCount']
        for frame in range(count):
            scene.frame_set(0 if hero else (segment['sourceFrameOffset'] + frame) % 24)
            t = min(1, frame / max(1, round(policy['movementDuration']*24)-1)) if movement != 'hold' else 0
            eased = t*t*(3-2*t)
            camera.location = baseline.copy(); camera.rotation_euler = rotation.copy(); camera.data.ortho_scale = scale
            if hero and movement == 'approach':
                delta = min(distance*(1-1/min(presentation['heroApproachRatio'], policy['requestedMaximumRatio'])), .25*extent*policy['movementDuration'])
                camera.location -= (baseline-center).normalized()*delta*eased
                if 1.5*delta/(extent*policy['movementDuration']) > policy['maximumTranslationExtentsPerSecond']:
                    raise RuntimeError('CINEMATIC_CAMERA_SPEED_INVALID')
            elif not hero and movement == 'pull-back':
                camera.data.ortho_scale = scale*(1+.04*eased)
            elif movement != 'hold':
                raise RuntimeError('CINEMATIC_CAMERA_OPERATION_UNSUPPORTED')
            bpy.context.view_layer.update()
            points = mesh_points(scene, source_object)
            bounds = camera_evidence(scene, policy, points, {'rotation':rotation})
            # External camera stays outside the source AABB's enclosing sphere.
            if hero and (camera.location-center).length - extent/2 < .3*extent:
                raise RuntimeError('CINEMATIC_CAMERA_PENETRATION')
            scene.render.filepath = str(out / ('scene-%d-%04d.png' % (segment['sceneIndex'],frame)))
            if not args.preflight:
                bpy.ops.render.render(write_still=True)
            evidence.append({'sceneIndex':segment['sceneIndex'],'frame':frame,'sourceFrame':scene.frame_current,
                             'projectedBounds':bounds,'cameraLocation':list(camera.location),'orthoScale':camera.data.ortho_scale})
    (out / 'camera-evidence.json').write_text(json.dumps({'version':'1','blenderVersion':bpy.app.version_string,
        'masterId':config['masterId'],'sourceSha256':config['sourceSha256'],'frames':evidence,'seconds':time.perf_counter()-start,
        'missingTextures':False,'patientFacing':False,'preflight':args.preflight,'presentation':presentation},indent=2))
    print('RENDER_OK')


if __name__ == '__main__':
    main()
