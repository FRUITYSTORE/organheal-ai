"""Standalone internal-review scene preset. No runtime dispatch or approval capability."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import time


def checked_files(config, source, textures):
    lock = json.loads(Path(__file__).with_name('heart_master_visual_v1.lock.json').read_text())
    digest = hashlib.sha256(json.dumps(config, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()
    if (lock['id'] != 'HEART_MASTER_VISUAL_V1' or digest != lock['configurationSha256'] or
            hashlib.sha256(Path(__file__).read_bytes().replace(b'\r\n', b'\n')).hexdigest() != lock['builderSha256']):
        raise RuntimeError('HERO_VISUAL_LOCK_INVALID')
    if config['preset'] != 'HEART_HERO_V1' or config['usage'] != 'internal-review' or config['patientFacing'] or config['geometryOperations']:
        raise RuntimeError('HERO_PRESET_INVALID')
    inventory_path = Path(__file__).resolve().parents[2] / 'medical-assets/heart-hero-selected-local-inventory.json'
    if config.get('inventoryRef') != 'medical-assets/heart-hero-selected-local-inventory.json':
        raise RuntimeError('HERO_IDENTITY_INVALID')
    inventory = json.loads(inventory_path.read_text())
    texture_hashes = {Path(f['filename']).name: f['sha256'] for f in inventory['files'] if f['filename'].startswith('textures/')}
    if (inventory['organHealRole'] != config['preset'] or inventory['patientFacing'] or
            inventory['sourceModelSha256'] != config['source']['sha256'] or
            inventory['sourceFile'] != 'source/' + config['source']['filename'] or
            texture_hashes != config['source']['textures']):
        raise RuntimeError('HERO_IDENTITY_INVALID')
    files = [(source, config['source']['sha256'])] + [(textures / name, sha) for name, sha in config['source']['textures'].items()]
    for path, sha in files:
        if not path.is_file() or path.is_symlink():
            raise RuntimeError('HERO_SOURCE_MISSING')
        if hashlib.sha256(path.read_bytes()).hexdigest() != sha:
            raise RuntimeError('HERO_SOURCE_HASH_INVALID')


def build_scene(config, source, textures):
    checked_files(config, source, textures)
    import bpy
    from mathutils import Vector
    from bpy_extras.object_utils import world_to_camera_view
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(source), use_custom_normals=True)
    objects = list(bpy.data.objects)
    if len(objects) != 1 or objects[0].name != config['source']['object'] or objects[0].type != 'MESH':
        raise RuntimeError('HERO_OBJECT_INVENTORY_INVALID')
    obj = objects[0]
    mesh = obj.data
    mesh.calc_loop_triangles()
    if (len(mesh.vertices), len(mesh.loop_triangles)) != (config['source']['vertices'], config['source']['triangles']) or obj.modifiers or mesh.shape_keys or bpy.data.actions:
        raise RuntimeError('HERO_GEOMETRY_INVALID')
    # Resolve only exact original texture basenames, preserving source shader assignments.
    for image in bpy.data.images:
        if image.source != 'FILE':
            continue
        name = Path(image.filepath.replace('\\', '/')).name
        if name not in config['source']['textures']:
            raise RuntimeError('HERO_TEXTURE_INVALID')
        image.filepath = str(textures / name)
        image.reload()
        if tuple(image.size) != (2048, 2048):
            raise RuntimeError('HERO_TEXTURE_INVALID')
    # Render-local presentation only; original maps and shader detail remain connected.
    presentation = config['materialPresentation']
    for material in mesh.materials:
        if not material or not material.use_nodes:
            raise RuntimeError('HERO_MATERIAL_INVALID')
        for shader in list(material.node_tree.nodes):
            if shader.type != 'BSDF_PRINCIPLED':
                continue
            for name, scale, offset in [('Roughness', presentation['roughnessScale'], presentation['roughnessOffset']),
                                        ('Specular IOR Level', presentation['specularScale'], 0)]:
                socket = shader.inputs[name]
                adjustment = material.node_tree.nodes.new('ShaderNodeMath')
                adjustment.name = 'OrganHealPresentation_' + name
                adjustment.operation = 'MULTIPLY_ADD'
                adjustment.use_clamp = True
                adjustment.inputs[1].default_value = scale
                adjustment.inputs[2].default_value = offset
                if socket.is_linked:
                    original = socket.links[0].from_socket
                    material.node_tree.links.new(original, adjustment.inputs[0])
                else:
                    adjustment.inputs[0].default_value = socket.default_value
                material.node_tree.links.new(adjustment.outputs[0], socket)
    points = [obj.matrix_world @ v.co for v in mesh.vertices]
    if not all(math.isfinite(x) for p in points for x in p):
        raise RuntimeError('HERO_GEOMETRY_INVALID')
    lo = Vector([min(p[k] for p in points) for k in range(3)])
    hi = Vector([max(p[k] for p in points) for k in range(3)])
    center = (lo + hi) / 2
    extent = (hi - lo).length
    scene = bpy.context.scene
    scene.render.engine = config['render']['engine']
    scene.cycles.samples = config['render']['samples']
    scene.cycles.seed = config['render']['seed']
    scene.cycles.use_animated_seed = False
    scene.render.resolution_x = config['width']
    scene.render.resolution_y = config['height']
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.view_settings.view_transform = config['render']['viewTransform']
    scene.view_settings.look = config['render']['look']
    scene.view_settings.exposure = config['render']['exposure']
    scene.view_settings.gamma = config['render']['gamma']
    world = bpy.data.worlds.new('OrganHealCharcoalNavy')
    scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    tex = nodes.new('ShaderNodeTexCoord')
    separate = nodes.new('ShaderNodeSeparateXYZ')
    ramp = nodes.new('ShaderNodeValToRGB')
    def linear_hex(value):
        rgb = [int(value[i:i+2], 16)/255 for i in (1,3,5)]
        return [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb] + [1]
    for element, key in zip(ramp.color_ramp.elements, ('charcoal','navy')):
        element.color = linear_hex(config['background'][key])
    ramp.color_ramp.elements[0].position = 0
    ramp.color_ramp.elements[1].position = .5
    links = world.node_tree.links
    links.new(tex.outputs['Normal'], separate.inputs[0])
    mapping = nodes.new('ShaderNodeMapRange')
    mapping.inputs['From Min'].default_value = -.6
    mapping.inputs['From Max'].default_value = .1
    links.new(separate.outputs['Z'], mapping.inputs['Value'])
    links.new(mapping.outputs['Result'], ramp.inputs[0])
    links.new(ramp.outputs[0], nodes['Background'].inputs['Color'])
    nodes['Background'].inputs['Strength'].default_value = config['background']['strength']
    camera_background = nodes.new('ShaderNodeBackground')
    camera_background.inputs['Strength'].default_value = 1
    links.new(ramp.outputs[0], camera_background.inputs['Color'])
    path = nodes.new('ShaderNodeLightPath')
    mix = nodes.new('ShaderNodeMixShader')
    links.new(path.outputs['Is Camera Ray'], mix.inputs[0])
    links.new(nodes['Background'].outputs[0], mix.inputs[1])
    links.new(camera_background.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], nodes['World Output'].inputs[0])
    camera_data = bpy.data.cameras.new('OrganHealHeroPortrait')
    camera = bpy.data.objects.new(camera_data.name, camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera_data.lens = config['camera']['lensMm']
    camera_data.clip_start = extent * .001
    camera_data.clip_end = extent * 100
    direction = Vector(config['camera']['direction']).normalized()
    distance = extent * 3
    left, bottom, right, top = config['camera']['safeOrganRectangle']
    # Deterministic perspective fitting from all source vertices, never organ transforms.
    for _ in range(12):
        camera.location = center + direction * distance
        camera.rotation_euler = (-direction).to_track_quat('-Z', 'Y').to_euler()
        bpy.context.view_layer.update()
        projected = [world_to_camera_view(scene, camera, p) for p in points]
        width = max(p.x for p in projected) - min(p.x for p in projected)
        height = max(p.y for p in projected) - min(p.y for p in projected)
        factor = max(width/(right-left), height/(top-bottom))
        distance *= factor * 1.01
    projected = [world_to_camera_view(scene, camera, p) for p in points]
    camera_data.shift_x += (min(p.x for p in projected)+max(p.x for p in projected))/2 - (left+right)/2
    camera_data.shift_y += (min(p.y for p in projected)+max(p.y for p in projected))/2 - (bottom+top)/2
    bpy.context.view_layer.update()
    projected = [world_to_camera_view(scene, camera, p) for p in points]
    bounds = [min(p.x for p in projected), min(p.y for p in projected), max(p.x for p in projected), max(p.y for p in projected)]
    if bounds[0] < 0 or bounds[1] < 0 or bounds[2] > 1 or bounds[3] > 1:
        raise RuntimeError('HERO_FRAMING_INVALID')
    for name, light in config['lighting'].items():
        data = bpy.data.lights.new('OrganHeal_' + name, 'AREA')
        data.energy = light['energyPerSquaredExtent'] * extent**2
        data.specular_factor = .15
        data.size = light['sizePerExtent'] * extent
        item = bpy.data.objects.new(data.name, data)
        scene.collection.objects.link(item)
        item.location = center + Vector(light['offset']) * extent
        item.rotation_euler = (center-item.location).to_track_quat('-Z','Y').to_euler()
    return {'sourceBounds': [list(lo),list(hi)], 'projectedBounds': bounds, 'cameraLocation': list(camera.location),
            'cameraRotation': list(camera.rotation_euler), 'cameraShift': [camera_data.shift_x,camera_data.shift_y],
            'vertices': len(mesh.vertices), 'triangles': len(mesh.loop_triangles), 'sourceTransform': [list(row) for row in obj.matrix_world]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True)
    parser.add_argument('--textures', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    config = json.loads(Path(__file__).with_suffix('.json').read_text())
    evidence = build_scene(config, Path(args.source), Path(args.textures))
    import bpy
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.context.scene.render.filepath = str(output)
    start = time.perf_counter()
    bpy.ops.render.render(write_still=True)
    evidence.update(blenderVersion=bpy.app.version_string, renderSeconds=time.perf_counter()-start,
                    output=str(output), bytes=output.stat().st_size, dimensions=[config['width'],config['height']],
                    source=str(Path(args.source)), sha256=config['source']['sha256'], usage=config['usage'], config=config)
    output.with_suffix('.evidence.json').write_text(json.dumps(evidence, indent=2))
    print('HEART_HERO_MASTER_PASS')


if __name__ == '__main__':
    main()
