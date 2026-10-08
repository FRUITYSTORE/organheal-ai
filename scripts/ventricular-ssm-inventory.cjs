// Offline audit only: reuse preserved full VTK decoding/topology evidence,
// bound to exact source bytes. Never emits geometry or runtime bindings.
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const pins = {
  'heart_sur.vtp': 'a94041d700b6a373deb1a59d9f8c0d75fe4692c2a9ca7c2bab4c0ed8e9a478b1',
  'heart_vol.vtu': 'c1f426654ed94609a54c2fac4ca70a511a5747cc0edc467d7977fa160f553e0b',
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function verifySource(bytes, filename) {
  if (!pins[filename] || hash(bytes) !== pins[filename]) throw Error('SSM_SOURCE_HASH_MISMATCH');
  return pins[filename];
}
function buildInventory(evidence, correspondence, evidenceFiles) {
  const names = ['base', 'epicardium', 'LV endocardium', 'RV endocardium', 'apex'];
  if (evidence.surface.points !== 99953 || evidence.surface.triangles !== 199902 ||
      evidence.volume.points !== 478820 || evidence.volume.tetrahedra !== 2555157 ||
      evidence.regions.length !== 5 || evidence.regions.some((r,i) => r.label !== i+1 || r.name !== names[i]) ||
      evidence.artifacts.some(a => pins[a.filename] !== a.sha256) || evidence.artifacts.length !== 2 ||
      evidence.volume.arrays.some(a => /PointData|CellData/.test(a.key))) throw Error('SSM_INVENTORY_EVIDENCE_MISMATCH');
  const { arrays, exactSurfaceBoundaryCoordinateMatches, surfaceBoundaryCoordinateSetEqual, ...volume } = evidence.volume;
  return {
    schemaVersion: '1', sourceId: 'zenodo-4506463', sourceVersion: 'v2', recordId: 4506463,
    doi: '10.5281/zenodo.4506463', usage: ['internal-review'], runtimeActivated: false,
    evidenceMethod: 'Preserved full appended-compressed VTK decode/topology audit reused after verifying both source SHA-256 pins; no geometry conversion.',
    evidenceFiles, artifacts: evidence.artifacts,
    surface: { datasetType: 'PolyData', ...evidence.surface, arrays: evidence.surfaceArrays },
    volume: { datasetType: 'UnstructuredGrid', ...volume, arrays, tissueRegionLabels: [] },
    surfaceVolumeCorrespondence: correspondence,
    regions: evidence.regions, mixedClassTriangles: evidence.mixedClassTriangles,
    faceClassPolicy: 'Only triangles whose three point classes agree belong to a class patch; mixed triangles remain unclassified. Apex is one point, not tissue.',
    coordinates: { units: 'millimeter', unitsEvidence: 'Official record mean edge length 0.83 mm agrees with measured surface edge length 0.8301631808280945.',
      orientation: 'UNRESOLVED', axisConvention: null, transform: 'unchanged source coordinates',
      orientationLimitation: 'No authoritative patient-left/anterior/superior axis convention established; base/apex labels do not establish all anatomical axes.' },
    mappings: [
      { sourceRegion: 'class:1', proposedStructureId: null, representation: 'surface', classification: 'QUALIFIED_INTERNAL_REVIEW', limitations: ['Basal closure patch, not valve annuli or a complete named organ structure.'] },
      { sourceRegion: 'class:2', proposedStructureId: null, representation: 'surface', classification: 'QUALIFIED_INTERNAL_REVIEW', limitations: ['Composite ventricular epicardial patch; no independent LV/RV epicardial territory labels; not tissue.'] },
      { sourceRegion: 'class:3', proposedStructureId: 'heart.leftVentricle', representation: 'surface', classification: 'QUALIFIED_INTERNAL_REVIEW', limitations: ['LV endocardial boundary only; not complete LV wall/tissue or cavity volume.'] },
      { sourceRegion: 'class:4', proposedStructureId: 'heart.rightVentricle', representation: 'surface', classification: 'QUALIFIED_INTERNAL_REVIEW', limitations: ['RV endocardial boundary only; not complete RV wall/tissue or cavity volume.'] },
      { sourceRegion: 'class:5', proposedStructureId: null, representation: 'landmark', classification: 'QUALIFIED_INTERNAL_REVIEW', limitations: ['Single source apex point; no independent apical tissue segmentation.'] },
      { sourceRegion: 'heart_vol.vtu', proposedStructureId: null, representation: 'tissue', classification: 'QUALIFIED_INTERNAL_REVIEW', limitations: ['Composite modeled ventricular tissue only; no region labels; RV epicardium constructed with fixed 3 mm displacement, not measured patient thickness.'] },
      { sourceRegion: 'heart_vol.vtu', proposedStructureId: 'heart.myocardium', representation: 'tissue', classification: 'UNRESOLVED', limitations: ['Does not establish all canonical myocardial regions, including LA/RA; no complete-heart binding.'] },
      { sourceRegion: null, proposedStructureId: 'heart.septum.interventricular', representation: 'tissue', classification: 'UNRESOLVED', limitations: ['No independent septum label; do not infer from tissue between chambers.'] },
      { sourceRegion: null, proposedStructureId: 'heart.septum.interatrial', representation: 'tissue', classification: 'UNRESOLVED', limitations: ['Atria absent.'] },
      { sourceRegion: 'class:3/4', proposedStructureId: null, representation: 'wall', classification: 'REJECTED', limitations: ['Endocardial surface cannot substitute for complete muscular chamber walls.'] },
      { sourceRegion: 'class:5', proposedStructureId: 'heart.myocardium', representation: 'tissue', classification: 'REJECTED', limitations: ['Apex point cannot substitute for myocardial tissue or coverage.'] },
    ],
    safety: { verification: 'unverified', clinicalApproval: 'unreviewed', completeMyocardiumAvailable: false, independentSeptumAvailable: false,
      limitations: ['Static statistical mean; no cardiac motion or pathology.', 'No exhaustive self-intersection or clinical accuracy certification.', 'No cross-source registration or merging.'] },
  };
}
function audit(root) {
  for (const [filename] of Object.entries(pins)) verifySource(fs.readFileSync(path.join(root,filename)),filename);
  const read = filename => JSON.parse(fs.readFileSync(path.join(root,filename),'utf8').replace(/^\uFEFF/,''));
  const files = ['geometry-evidence.json', 'blender-review-evidence.json', 'zenodo-record.json'];
  const record = read('zenodo-record.json');
  if (record.id !== 4506463 || record.doi !== '10.5281/zenodo.4506463') throw Error('SSM_SOURCE_IDENTITY_MISMATCH');
  return buildInventory(read(files[0]),read(files[1]).surfaceVolumeCorrespondence,
    files.map(filename => ({ filename, sha256: hash(fs.readFileSync(path.join(root,filename))) })));
}
module.exports = { verifySource, buildInventory, audit };
if (require.main === module) fs.writeFileSync(process.argv[3], JSON.stringify(audit(process.argv[2]),null,2)+'\n');
