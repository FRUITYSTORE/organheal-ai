"""Offline deterministic internal-review conversion for the pinned VTK XML encoding.
No topology repair, coordinate warping, semantic relabeling, or new dependency.
"""
import sys, os, json, base64, zlib, math, hashlib, time
import xml.etree.ElementTree as ET
import numpy as np

def read_vtk(path):
    root=ET.parse(path).getroot()
    assert root.attrib['byte_order']=='LittleEndian'
    assert root.attrib.get('header_type','UInt32')=='UInt32'
    assert root.attrib.get('compressor')=='vtkZLibDataCompressor'
    appended=root.find('AppendedData'); assert appended.attrib['encoding']=='base64'
    encoded=''.join(appended.text.split()); assert encoded.startswith('_'); encoded=encoded[1:]
    types={'UInt8':'u1','Int32':'<i4','UInt32':'<u4','Int64':'<i8','UInt64':'<u8','Float32':'<f4','Float64':'<f8'}
    arrays={}; records=[]
    piece=root.find('.//Piece')
    for group in piece:
        for item in group.findall('DataArray'):
            assert item.attrib['format']=='appended'
            segment=encoded[int(item.attrib['offset']):]
            first=np.frombuffer(base64.b64decode(segment[:16]),dtype='<u4')
            n,block,last=map(int,first[:3]); headerbytes=4*(3+n); headerchars=4*((headerbytes+2)//3)
            header=base64.b64decode(segment[:headerchars],validate=True)
            assert len(header)==headerbytes
            sizes=np.frombuffer(header,dtype='<u4')[3:]
            total=int(sizes.sum()); payloadchars=4*((total+2)//3)
            payload=base64.b64decode(segment[headerchars:headerchars+payloadchars],validate=True)
            assert len(payload)==total
            buffers=[]; offset=0
            for i,size in enumerate(sizes):
                size=int(size); data=zlib.decompress(payload[offset:offset+size]); offset+=size
                assert len(data)==(last if i==n-1 else block)
                buffers.append(data)
            raw=b''.join(buffers)
            a=np.frombuffer(raw,dtype=types[item.attrib['type']]).copy()
            components=int(item.attrib.get('NumberOfComponents',1))
            assert len(a)%components==0
            if components>1:a=a.reshape(-1,components)
            key=group.tag+'/'+item.attrib.get('Name','unnamed')
            arrays[key]=a
            records.append(dict(key=key,type=item.attrib['type'],components=components,tuples=len(a),uncompressedBytes=len(raw)))
    return piece.attrib,arrays,records

PINS = {
    'heart_sur.vtp': 'a94041d700b6a373deb1a59d9f8c0d75fe4692c2a9ca7c2bab4c0ed8e9a478b1',
    'heart_vol.vtu': 'c1f426654ed94609a54c2fac4ca70a511a5747cc0edc467d7977fa160f553e0b',
}

def verify_source(data, filename):
    if filename not in PINS or hashlib.sha256(data).hexdigest() != PINS[filename]:
        raise ValueError('SSM_SOURCE_HASH_MISMATCH')

def components(n, cells):
    parent = list(range(n))
    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    for cell in cells:
        root = find(int(cell[0]))
        for value in cell[1:]:
            parent[find(int(value))] = root
    return len({find(i) for i in range(n)})

def encode_obj(name, points, faces):
    # 17 significant digits round-trip source Float32/Float64 values exactly.
    lines = ['o ' + name]
    lines += ['v ' + ' '.join(format(float(v), '.17g') for v in p) for p in points]
    lines += ['f ' + ' '.join(str(int(v)+1) for v in f) for f in faces]
    if not len(faces):
        lines += ['p ' + str(i+1) for i in range(len(points))]
    return ('\n'.join(lines)+'\n').encode('ascii')

def emit(directory, name, source, points, faces, meaning):
    if not np.isfinite(points).all():
        raise ValueError('SSM_NONFINITE_GEOMETRY')
    output = encode_obj(name, points, faces)
    decoded = np.array([[float(v) for v in line.split()[1:]] for line in output.decode().splitlines() if line.startswith('v ')])
    if not np.array_equal(decoded, points):
        raise ValueError('SSM_CONVERSION_DEVIATION')
    filename = name + '.obj'
    with open(os.path.join(directory, filename), 'wb') as file:
        file.write(output)
    return dict(sourceFilename=source, sourceHash=PINS[source], derivedFilename=filename,
        derivedHash=hashlib.sha256(output).hexdigest(), points=len(points), vertices=len(points),
        cells=len(faces), faces=len(faces), referencePoints=len(points) if not len(faces) else 0,
        bounds=[points.min(axis=0).tolist(),points.max(axis=0).tolist()],
        connectedComponents=components(len(points),faces), fileSize=len(output),
        transform=dict(matrix=[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]],units='millimeter',anatomicalAxes='UNRESOLVED'),
        maxCoordinateDeviation=0, topologyChanged=False, meaning=meaning,
        qualification='QUALIFIED_INTERNAL_REVIEW', proposedStructureId=None)

def convert(source_root, inventory_path, output_root):
    with open(inventory_path, encoding='utf-8-sig') as file:
        inventory = json.load(file)
    expected = ['class:1','class:2','class:3','class:4','class:5','heart_vol.vtu']
    selected = [m for m in inventory['mappings'] if m['classification']=='QUALIFIED_INTERNAL_REVIEW']
    if [m['sourceRegion'] for m in selected] != expected:
        raise ValueError('SSM_SELECTION_NOT_QUALIFIED')
    for filename in PINS:
        with open(os.path.join(source_root,filename),'rb') as file:
            verify_source(file.read(),filename)
    _, surface, _ = read_vtk(os.path.join(source_root,'heart_sur.vtp'))
    points, labels = surface['Points/Points'], surface['PointData/class']
    faces = surface['Polys/connectivity'].reshape(-1,3)
    if len(points)!=99953 or len(faces)!=199902 or not np.array_equal(surface['Polys/offsets'],np.arange(1,len(faces)+1)*3):
        raise ValueError('SSM_SURFACE_SCHEMA_MISMATCH')
    os.makedirs(output_root,exist_ok=True)
    assets=[]
    for label,name in enumerate(['basal-patch','ventricular-epicardial-patch','lv-endocardial-surface','rv-endocardial-surface','apex-reference'],1):
        chosen=faces[np.all(labels[faces]==label,axis=1)]
        ids=np.unique(chosen) if len(chosen) else np.flatnonzero(labels==label)
        lookup=np.full(len(points),-1,dtype=np.int64); lookup[ids]=np.arange(len(ids))
        assets.append(emit(output_root,name,'heart_sur.vtp',points[ids],lookup[chosen],selected[label-1]['limitations']))
        assets[-1]['sourceRegion']='class:'+str(label)
        assets[-1]['sourceLabeledPointCount']=int((labels==label).sum())
        assets[-1]['proposedStructureId']=selected[label-1]['proposedStructureId']
    _, volume, _ = read_vtk(os.path.join(source_root,'heart_vol.vtu'))
    vp=volume['Points/Points']; tets=volume['Cells/connectivity'].reshape(-1,4)
    if len(vp)!=478820 or len(tets)!=2555157 or not np.all(volume['Cells/types']==10) or not np.array_equal(volume['Cells/offsets'],np.arange(1,len(tets)+1)*4):
        raise ValueError('SSM_VOLUME_SCHEMA_MISMATCH')
    # Exact tetrahedral exterior boundary: omit internal shared faces. No caps,
    # invented tissue-region labels, or surface-to-volume anatomical promotion.
    all_faces=np.concatenate([tets[:,[0,2,1]],tets[:,[0,1,3]],tets[:,[1,2,3]],tets[:,[2,0,3]]])
    keys=np.sort(all_faces,axis=1)
    _, first, counts=np.unique(keys,axis=0,return_index=True,return_counts=True)
    if np.any(counts>2):
        raise ValueError('SSM_NONMANIFOLD_VOLUME')
    boundary=all_faces[first[counts==1]]
    ids=np.unique(boundary); lookup=np.full(len(vp),-1,dtype=np.int64);lookup[ids]=np.arange(len(ids))
    if len(boundary)!=199902: raise ValueError('SSM_BOUNDARY_COUNT_MISMATCH')
    assets.append(emit(output_root,'composite-ventricular-tissue-boundary','heart_vol.vtu',vp[ids],lookup[boundary],
        ['Exterior boundary of original composite ventricular tetrahedral tissue, including endocardial/basal surfaces.',
         'Boundary-only review representation; no tetrahedral interior in OBJ, no separate septum, no complete heart.myocardium.']))
    assets[-1].update(sourceRegion='heart_vol.vtu',sourcePoints=len(vp),sourceCells=len(tets),
        representation='surface-boundary-of-tissue',interiorVolumePreserved=False)
    manifest=dict(schemaVersion='1',sourceId=inventory['sourceId'],sourceVersion=inventory['sourceVersion'],
        usage=['internal-review'],runtimeActivated=False,assets=assets,
        mixedClassTrianglesOmitted=int((~np.all(labels[faces]==labels[faces[:,0],None],axis=1)).sum()),
        limitations=['Class patches contain pure-class triangles only; unused labeled vertices omitted.',
                    'No coordinate registration, mesh repair, smoothing, anatomy synthesis or cross-source merging.',
                    'Apex OBJ contains a point primitive, not a surface. Blender mesh import may require an empty/reference adapter later.'])
    with open(os.path.join(output_root,'selection-manifest.json'),'w',encoding='utf-8',newline='\n') as file:
        file.write(json.dumps(manifest,indent=2)+'\n')
    return manifest

if __name__ == '__main__':
    convert(*sys.argv[1:])
