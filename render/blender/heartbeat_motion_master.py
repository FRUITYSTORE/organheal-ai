"""Native source cycle proof; shares presentation with the locked hero, never geometry."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import time


def checked_configuration(source):
    root = Path(__file__).parent
    preset = json.loads((root / 'heartbeat_motion_master.json').read_text())
    motion_lock = json.loads((root / 'heartbeat_motion_master_v1.lock.json').read_text())
    if (motion_lock['id'] != preset['id'] or
            hashlib.sha256(json.dumps(preset, separators=(',', ':')).encode()).hexdigest() != motion_lock['configurationSha256'] or
            hashlib.sha256(Path(__file__).read_bytes().replace(b'\r\n', b'\n')).hexdigest() != motion_lock['builderSha256']):
        raise RuntimeError('MOTION_LOCK_INVALID')
    master = json.loads((root / 'heart_hero_master.json').read_text())
    lock = json.loads((root / 'heart_master_visual_v1.lock.json').read_text())
    if (preset['visualMasterRef'] != lock['id'] or preset['visualConfigurationSha256'] != lock['configurationSha256'] or
            hashlib.sha256(json.dumps(master, separators=(',', ':')).encode()).hexdigest() != lock['configurationSha256']):
        raise RuntimeError('MOTION_VISUAL_MASTER_INVALID')
    if not source.is_file() or source.is_symlink():
        raise RuntimeError('MOTION_SOURCE_MISSING')
    if hashlib.sha256(source.read_bytes()).hexdigest() != preset['sourceSha256']:
        raise RuntimeError('MOTION_SOURCE_HASH_INVALID')
    return preset, master


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    preset, master = checked_configuration(Path(args.source))
    import bpy
    from mathutils import Vector
    from bpy_extras.object_utils import world_to_camera_view
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = preset['fps']
    bpy.ops.import_scene.gltf(filepath=args.source)
    heart = bpy.data.objects.get('heart.2')
    rigs = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    if not heart or len(rigs) != 1 or not rigs[0].animation_data or not rigs[0].animation_data.action:
        raise RuntimeError('MOTION_INVENTORY_INVALID')
    action = rigs[0].animation_data.action
    if action.name != preset['sourceAction'] or list(action.frame_range) != preset['sourceCycle']:
        raise RuntimeError('MOTION_ACTION_INVALID')
    if not any(m.type == 'ARMATURE' for m in heart.modifiers):
        raise RuntimeError('MOTION_SKIN_INVALID')
    images = [{'name': i.name, 'size': list(i.size), 'packed': bool(i.packed_file)} for i in bpy.data.images]
    # glTF Image_1 is instantiated twice for distinct shader/color-space uses.
    if len(images) != 6 or any(not i.has_data or not i.packed_file or min(i.size) <= 0 for i in bpy.data.images):
        raise RuntimeError('MOTION_TEXTURE_MISSING')
    def points(frame):
        scene.frame_set(frame)
        evaluated = heart.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = evaluated.to_mesh()
        result = [evaluated.matrix_world @ v.co for v in mesh.vertices]
        evaluated.to_mesh_clear()
        return result
    first, end, contracted = points(0), points(24), points(6)
    endpoint_delta = max((a-b).length for a,b in zip(first,end))
    contraction_delta = max((a-b).length for a,b in zip(first,contracted))
    if endpoint_delta > 1e-6 or contraction_delta <= 0:
        raise RuntimeError('MOTION_CYCLE_INVALID')
    all_points = [p for f in range(25) for p in points(f)]
    lo = Vector([min(p[k] for p in all_points) for k in range(3)])
    hi = Vector([max(p[k] for p in all_points) for k in range(3)])
    center, extent = (lo+hi)/2, (hi-lo).length
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = preset['samples']
    scene.cycles.seed = master['render']['seed']
    scene.cycles.use_animated_seed = False
    scene.cycles.use_denoising = True
    prefs = bpy.context.preferences.addons['cycles'].preferences
    try:
        prefs.compute_device_type = 'OPTIX'
        prefs.get_devices()
        for device in prefs.devices:
            device.use = device.type != 'CPU'
        if any(d.use for d in prefs.devices):
            scene.cycles.device = 'GPU'
    except Exception:
        pass
    scene.render.resolution_x, scene.render.resolution_y = master['width'], master['height']
    scene.render.resolution_percentage = 100
    for attribute,key in [('view_transform','viewTransform'),('look','look'),('exposure','exposure'),('gamma','gamma')]:
        setattr(scene.view_settings, attribute, master['render'][key])
    # Scene-wide saturation presentation preserves source color identities and texture maps.
    scene.use_nodes = True
    tree = bpy.data.node_groups.new('OrganHealMotionPresentation', 'CompositorNodeTree')
    scene.compositing_node_group = tree
    layers = tree.nodes.new('CompositorNodeRLayers')
    saturation = tree.nodes.new('CompositorNodeHueSat')
    saturation.inputs['Saturation'].default_value = preset['presentation']['saturation']
    output_node = tree.nodes.new('NodeGroupOutput')
    if not any(s.name == 'Image' for s in tree.interface.items_tree):
        tree.interface.new_socket(name='Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    tree.links.new(layers.outputs['Image'], saturation.inputs['Image'])
    tree.links.new(saturation.outputs['Image'], output_node.inputs['Image'])
    world = bpy.data.worlds.new('OrganHealMotionBackground')
    scene.world = world
    world.use_nodes = True
    nodes, links = world.node_tree.nodes, world.node_tree.links
    coord = nodes.new('ShaderNodeTexCoord'); separate = nodes.new('ShaderNodeSeparateXYZ')
    mapping = nodes.new('ShaderNodeMapRange'); ramp = nodes.new('ShaderNodeValToRGB')
    mapping.inputs['From Min'].default_value = -.6; mapping.inputs['From Max'].default_value = .1
    for element,key in zip(ramp.color_ramp.elements,('charcoal','navy')):
        rgb = [int(master['background'][key][i:i+2],16)/255 for i in (1,3,5)]
        element.color = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb]+[1]
    ramp.color_ramp.elements[1].position = .5
    links.new(coord.outputs['Normal'],separate.inputs[0]); links.new(separate.outputs['Z'],mapping.inputs['Value'])
    links.new(mapping.outputs['Result'],ramp.inputs[0]); links.new(ramp.outputs[0],nodes['Background'].inputs['Color'])
    nodes['Background'].inputs['Strength'].default_value = master['background']['strength']
    visible = nodes.new('ShaderNodeBackground'); links.new(ramp.outputs[0],visible.inputs['Color'])
    path = nodes.new('ShaderNodeLightPath'); mix = nodes.new('ShaderNodeMixShader')
    links.new(path.outputs['Is Camera Ray'],mix.inputs[0]); links.new(nodes['Background'].outputs[0],mix.inputs[1])
    links.new(visible.outputs[0],mix.inputs[2]); links.new(mix.outputs[0],nodes['World Output'].inputs[0])
    camera_data = bpy.data.cameras.new('MotionMasterSteady')
    camera = bpy.data.objects.new(camera_data.name,camera_data); scene.collection.objects.link(camera); scene.camera = camera
    direction = Vector(master['camera']['direction']).normalized()
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = extent
    camera_data.clip_end = extent*100; camera_data.clip_start = extent*.001
    camera.location = center+direction*extent*3
    camera.rotation_euler = (-direction).to_track_quat('-Z','Y').to_euler()
    bpy.context.view_layer.update()
    projected = [world_to_camera_view(scene,camera,p) for p in all_points]
    left,bottom,right,top = master['camera']['safeOrganRectangle']
    camera_data.ortho_scale *= max((max(p.x for p in projected)-min(p.x for p in projected))/(right-left),
                                    (max(p.y for p in projected)-min(p.y for p in projected))/(top-bottom))*1.01
    camera_data.ortho_scale *= preset['presentation']['cameraScale']
    projected = [world_to_camera_view(scene,camera,p) for p in all_points]
    camera_data.shift_y = (min(p.y for p in projected)+max(p.y for p in projected))/2-(bottom+top)/2
    for name, light in master['lighting'].items():
        data = bpy.data.lights.new('Motion_'+name,'AREA'); data.energy = light['energyPerSquaredExtent']*extent**2
        data.energy *= preset['presentation'][name+'EnergyScale']
        data.size = light['sizePerExtent']*extent; data.specular_factor = .15
        obj = bpy.data.objects.new(data.name,data); scene.collection.objects.link(obj)
        obj.location = center+Vector(light['offset'])*extent; obj.rotation_euler = (center-obj.location).to_track_quat('-Z','Y').to_euler()
    output = Path(args.output); output.parent.mkdir(parents=True,exist_ok=True)
    frames = output.parent / (output.stem+'-cycle'); frames.mkdir(exist_ok=True)
    scene.frame_start,scene.frame_end = preset['renderCycle']
    scene.render.image_settings.media_type = 'IMAGE'; scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = str(frames/'native-')
    start = time.perf_counter(); bpy.ops.render.render(animation=True)
    # Repetition is media scheduling only. No NLA edits, action edits or retargeting.
    bpy.ops.wm.read_factory_settings(use_empty=True); scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'; scene.render.resolution_x = master['width']; scene.render.resolution_y = master['height']
    scene.render.resolution_percentage = 100; scene.render.fps = preset['fps']
    scene.frame_start,scene.frame_end = preset['outputFrames']; editor = scene.sequence_editor_create()
    for cycle in range(preset['repeatCount']):
        strip = editor.strips.new_image('Native cycle',str(frames/'native-0000.png'),channel=1,frame_start=1+cycle*24)
        for frame in range(1,24): strip.elements.append('native-%04d.png'%frame)
        strip.frame_final_duration = 24
    scene.render.use_sequencer = True; scene.render.use_compositing = False
    scene.view_settings.view_transform = 'Standard'
    scene.render.image_settings.media_type = 'VIDEO'; scene.render.image_settings.file_format = 'FFMPEG'
    scene.render.use_file_extension = False; scene.render.ffmpeg.format = 'MPEG4'; scene.render.ffmpeg.codec = 'H264'
    scene.render.ffmpeg.constant_rate_factor = 'HIGH'; scene.render.ffmpeg.audio_codec = 'NONE'; scene.render.filepath = str(output)
    bpy.ops.render.render(animation=True)
    clip = bpy.data.movieclips.load(str(output))
    if list(clip.size) != [1080,1920] or clip.frame_duration != 144:
        raise RuntimeError('MOTION_OUTPUT_INVALID')
    evidence = {'preset':preset,'blenderVersion':bpy.app.version_string,'source':args.source,'action':preset['sourceAction'],
                'mechanism':'native armature/skinning; rendered cycle repetition','sourceCycleEndpointMaxVertexDelta':endpoint_delta,
                'contractionMaxVertexDelta':contraction_delta,'images':images,'missingTextures':False,'dimensions':list(clip.size),
                'fps':preset['fps'],'frameCount':clip.frame_duration,'duration':clip.frame_duration/preset['fps'],
                'seconds':time.perf_counter()-start,'bytes':output.stat().st_size,'path':str(output)}
    output.with_suffix('.evidence.json').write_text(json.dumps(evidence,indent=2)); print('HEARTBEAT_MASTER_PASS')


if __name__ == '__main__':
    main()
