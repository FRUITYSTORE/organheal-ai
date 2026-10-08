"""Focused offline conversion checks; no Blender invocation or runtime activation."""
import hashlib
import importlib.util
import json
import pathlib
import unittest
import numpy as np

ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('ssm_conversion', ROOT/'scripts/ventricular-ssm-conversion.py')
conversion=importlib.util.module_from_spec(spec)
spec.loader.exec_module(conversion)

class ConversionTests(unittest.TestCase):
    def test_hash_mismatch_fails_closed(self):
        for filename in ['heart_sur.vtp','heart_vol.vtu','unknown.vtu']:
            with self.assertRaisesRegex(ValueError,'SSM_SOURCE_HASH_MISMATCH'):
                conversion.verify_source(b'wrong',filename)

    def test_deterministic_exact_encoding_and_point_reference(self):
        points=np.array([[0.123456789012345,2,3],[4,5,6],[7,8,9]],dtype=np.float64)
        faces=np.array([[0,1,2]])
        first=conversion.encode_obj('review',points,faces)
        self.assertEqual(first,conversion.encode_obj('review',points.copy(),faces.copy()))
        self.assertIn(b'f 1 2 3\n',first)
        self.assertIn(b'p 1\n',conversion.encode_obj('apex',points[:1],np.empty((0,3),dtype=int)))
        self.assertEqual(conversion.components(3,faces),1)

    def test_all_derived_files_hash_counts_bounds_and_roundtrip(self):
        directory=ROOT/'medical-assets/candidates/zenodo-4506463-v2'
        manifest=json.loads((directory/'selection-manifest.json').read_text())
        self.assertEqual(len(manifest['assets']),6)
        self.assertEqual(manifest['mixedClassTrianglesOmitted'],1636)
        for asset in manifest['assets']:
            data=(directory/asset['derivedFilename']).read_bytes()
            self.assertEqual(hashlib.sha256(data).hexdigest(),asset['derivedHash'])
            self.assertEqual(len(data),asset['fileSize'])
            lines=data.decode().splitlines()
            points=np.array([[float(v) for v in line.split()[1:]] for line in lines if line.startswith('v ')])
            faces=np.array([[int(v)-1 for v in line.split()[1:]] for line in lines if line.startswith('f ')],dtype=int).reshape(-1,3)
            self.assertEqual(len(points),asset['vertices'])
            self.assertEqual(len(faces),asset['faces'])
            self.assertEqual([points.min(axis=0).tolist(),points.max(axis=0).tolist()],asset['bounds'])
            self.assertEqual(conversion.components(len(points),faces),asset['connectedComponents'])
            self.assertEqual(conversion.encode_obj(lines[0][2:],points,faces),data)
            self.assertEqual(asset['sourceHash'],conversion.PINS[asset['sourceFilename']])
            self.assertEqual(asset['maxCoordinateDeviation'],0)
            self.assertEqual(asset['transform']['units'],'millimeter')
            self.assertEqual(asset['transform']['anatomicalAxes'],'UNRESOLVED')
        tissue=manifest['assets'][-1]
        self.assertEqual(tissue['representation'],'surface-boundary-of-tissue')
        self.assertFalse(tissue['interiorVolumePreserved'])
        self.assertIsNone(tissue['proposedStructureId'])
        self.assertFalse(manifest['runtimeActivated'])

if __name__=='__main__':
    unittest.main()
