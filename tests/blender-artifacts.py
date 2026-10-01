"""Real artifact integration fixture, not medical anatomy or a production render.

Uses production configuration helpers; standard-library inspection is deliberately
limited to the PNG and non-fragmented AVC MP4 emitted by this Blender pipeline.
Unknown layouts fail instead of being guessed. No external dependencies.
"""
import binascii
from fractions import Fraction
import importlib.util
import json
import pathlib
import struct
import sys
import zlib
import bpy

sys.dont_write_bytecode = True
source = pathlib.Path(__file__).resolve().parents[1] / "render/blender/render_scene.py"
spec = importlib.util.spec_from_file_location("artifact_render_scene", source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def inspect_png(filename, expected):
    data = filename.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    position, chunks, compressed = 8, [], bytearray()
    while position < len(data):
        assert position + 12 <= len(data), "Truncated PNG chunk"
        size = int.from_bytes(data[position:position + 4], "big")
        kind = data[position + 4:position + 8]
        end = position + 8 + size
        assert end + 4 <= len(data)
        payload = data[position + 8:end]
        assert binascii.crc32(kind + payload) & 0xffffffff == int.from_bytes(data[end:end + 4], "big")
        chunks.append(kind)
        if kind == b"IHDR":
            assert len(chunks) == 1 and size == 13
            width, height, depth, color, compression, filtering, interlace = struct.unpack(">IIBBBBB", payload)
            assert (width, height) == (expected["width"], expected["height"])
            assert (depth, color, compression, filtering, interlace) == (8, 6, 0, 0, 0)
        elif kind == b"IDAT":
            compressed.extend(payload)
        elif kind == b"IEND":
            assert size == 0 and end + 4 == len(data)
        position = end + 4
    assert chunks[0] == b"IHDR" and chunks[-1] == b"IEND" and b"IDAT" in chunks
    decoder = zlib.decompressobj()
    pixels = decoder.decompress(compressed) + decoder.flush()
    assert decoder.eof and not decoder.unused_data
    stride = width * 4 + 1
    assert len(pixels) == stride * height
    assert all(pixels[row * stride] in range(5) for row in range(height))
    # Also ask Blender's image decoder to read complete pixel data from disk.
    image = bpy.data.images.load(str(filename), check_existing=False)
    assert tuple(image.size) == (width, height) and len(image.pixels[:]) == width * height * 4
    bpy.data.images.remove(image)
    return dict(type="PNG", bytes=len(data), width=width, height=height, complete_decode=True)


def boxes(data):
    position = 0
    while position < len(data):
        assert position + 8 <= len(data), "Truncated MP4 box"
        size, kind = struct.unpack_from(">I4s", data, position)
        header = 8
        if size == 1:
            assert position + 16 <= len(data)
            size = struct.unpack_from(">Q", data, position + 8)[0]
            header = 16
        elif size == 0:
            size = len(data) - position
        assert header <= size <= len(data) - position
        yield kind, data[position + header:position + size]
        position += size


def one(data, kind):
    matches = [payload for name, payload in boxes(data) if name == kind]
    assert len(matches) == 1, f"Expected exactly one {kind!r}"
    return matches[0]


def media_time(header):
    assert header[0] == 0, "Unsupported versioned time header"
    scale, duration = struct.unpack_from(">II", header, 12)
    assert scale > 0
    return scale, duration


def inspect_mp4(filename, case):
    data = filename.read_bytes()
    assert data
    ftyp = one(data, b"ftyp")
    brands = [ftyp[:4]] + [ftyp[i:i + 4] for i in range(8, len(ftyp), 4)]
    assert any(brand in (b"isom", b"iso2", b"mp41", b"mp42") for brand in brands)
    assert one(data, b"mdat"), "Empty encoded media"
    movie = one(data, b"moov")
    movie_scale, movie_duration = media_time(one(movie, b"mvhd"))
    tracks = [payload for kind, payload in boxes(movie) if kind == b"trak"]
    handlers = []
    result = None
    for track in tracks:
        media = one(track, b"mdia")
        handler = one(media, b"hdlr")[8:12]
        handlers.append(handler)
        assert handler == b"vide", "Unexpected non-video/audio track"
        scale, duration = media_time(one(media, b"mdhd"))
        samples = one(one(media, b"minf"), b"stbl")
        descriptions = one(samples, b"stsd")
        assert struct.unpack_from(">I", descriptions, 4)[0] == 1
        avc = one(descriptions[8:], b"avc1")
        width, height = struct.unpack_from(">HH", avc, 24)
        codec_config = one(avc[78:], b"avcC")
        assert codec_config[0] == 1 and codec_config[5] & 31 > 0, "Missing AVC sequence parameter set"
        assert (width, height) == (case["outputDimensions"]["width"], case["outputDimensions"]["height"])
        timing = one(samples, b"stts")
        entries = struct.unpack_from(">I", timing, 4)[0]
        assert len(timing) == 8 + entries * 8
        runs = [struct.unpack_from(">II", timing, 8 + i * 8) for i in range(entries)]
        frames = sum(count for count, delta in runs)
        assert frames == case["videoTiming"]["frameCount"]
        assert all(Fraction(scale, delta) == 24 for count, delta in runs)
        assert sum(count * delta for count, delta in runs) == duration
        sizes = one(samples, b"stsz")
        assert struct.unpack_from(">I", sizes, 8)[0] == frames
        expected_duration = Fraction(frames, 24)
        assert abs(Fraction(duration, scale) - expected_duration) <= Fraction(1, scale)
        # Movie header uses its own clock, so allow one movie-clock tick.
        assert abs(Fraction(movie_duration, movie_scale) - expected_duration) <= Fraction(1, movie_scale)
        result = dict(bytes=len(data), container="MP4", brands=[b.decode("ascii") for b in brands],
                      codec="H.264 (avc1/avcC)", width=width, height=height, fps="24/1",
                      frames=frames, duration=float(Fraction(duration, scale)), time_base=f"1/{scale}",
                      container_duration=float(Fraction(movie_duration, movie_scale)),
                      container_tolerance_seconds=1 / movie_scale, requested_duration=case["durationSeconds"],
                      nominal_duration=float(expected_duration), audio_streams=0)
    assert handlers == [b"vide"] and result is not None
    return result


args = sys.argv[sys.argv.index("--") + 1:]
cases = json.loads(pathlib.Path(args[0]).read_text(encoding="utf-8"))
directory = pathlib.Path(args[1])
module._clear_scene()
bpy.ops.mesh.primitive_cube_add()
bpy.ops.object.camera_add(location=(0, -6, 3))
camera = bpy.context.object
camera.rotation_euler = (-camera.location).to_track_quat("-Z", "Y").to_euler()
scene = bpy.context.scene
scene.camera = camera
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1
findings = dict(blender=bpy.app.version_string, python=sys.version.split()[0], inspector="Python stdlib PNG/ISO-BMFF + Blender PNG decoder")
for case in cases:
    video = case["output"]["media"] == "video"
    filename = pathlib.Path(case["artifactPath"])
    module._configure_output_dimensions(scene, case["outputDimensions"])
    module._configure_render_state(scene, case["output"], str(filename))
    if video:
        module._configure_video_timing(scene, case["videoTiming"])
    # Fixture-only cost controls; production settings and anatomy are untouched.
    scene.cycles.device = "CPU"
    scene.cycles.samples = 1
    scene.cycles.use_denoising = False
    bpy.ops.render.render(animation=True) if video else bpy.ops.render.render(write_still=True)
    assert filename.is_file() and filename.stat().st_size > 0
    findings["video" if video else "png"] = inspect_mp4(filename, case) if video else inspect_png(filename, case["outputDimensions"])
(directory / "findings.json").write_text(json.dumps(findings), encoding="utf-8")
print("REAL_ARTIFACTS_OK")
