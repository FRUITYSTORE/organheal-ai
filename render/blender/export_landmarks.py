"""Writes render/blender/assets/heart/landmarks.json from the real build:

    blender --background --python export_landmarks.py

The positions are whatever heart_builder.compute_landmarks() measures on
the real asset (see its docstring for each method), so re-run this whenever
the chamber or vessel asset changes. The file exists so the TypeScript
organ module's landmark list can be checked against what the build really
produces (tests/medical-motion-heart-organ-module.test.ts), and so the
measured positions are reviewable without opening Blender.
"""

import json
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from heart_builder import build_heart, landmark_object_name  # noqa: E402

_OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "heart", "landmarks.json")


def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    objects, _materials = build_heart()

    landmarks = {}
    for key in sorted(k for k in objects if k.startswith("heart.")):
        obj = objects[key]
        landmarks[key] = {
            "blenderObject": landmark_object_name(key),
            "position": [round(c, 4) for c in obj.location],
        }

    with open(_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(
            {
                "generatedBy": "render/blender/export_landmarks.py",
                "units": "scene units (real-world meters x 20, centered on the chambers)",
                "landmarks": landmarks,
            },
            f,
            indent=2,
        )
        f.write("\n")

    print(f"LANDMARKS_OK count={len(landmarks)} output={_OUTPUT}")


if __name__ == "__main__":
    main()
