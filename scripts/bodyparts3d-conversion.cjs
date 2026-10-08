// Offline review conversion only; no Blender builder or runtime registration.
const { createHash } = require('node:crypto');
const { parseObj } = require('./bodyparts3d-inventory.cjs');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
function convertRepresentation(row, readSource) {
  if (row.conversionQualification !== 'QUALIFIED_INTERNAL_REVIEW') throw Error('BP3D_REPRESENTATION_NOT_QUALIFIED');
  const lines = [], sources = [];
  let offset = 0;
  for (const component of [...row.components].sort((a, b) => a.sourceFilename.localeCompare(b.sourceFilename))) {
    const bytes = readSource(component.sourceFilename);
    if (sha256(bytes) !== component.sha256) throw Error('BP3D_SOURCE_HASH_MISMATCH');
    const source = parseObj(bytes.toString('utf8'));
    if (!source.vertexCount || !source.faceCount) throw Error('BP3D_EMPTY_SOURCE');
    lines.push(`o ${row.conceptId}_${row.representationId}_${component.sourceFilename.replace(/\.obj$/, '')}`);
    let seen = 0;
    for (const line of bytes.toString('utf8').split(/\r?\n/)) {
      const tokens = line.trim().split(/\s+/);
      if (tokens[0] === 'v') { lines.push(`v ${tokens.slice(1, 4).map(Number).join(' ')}`); seen++; }
      if (tokens[0] === 'f') lines.push(`f ${tokens.slice(1).map(token => {
        const index = Number(token.split('/')[0]);
        return (index < 0 ? seen + index + 1 : index) + offset;
      }).join(' ')}`);
    }
    sources.push({ sourceFilename: component.sourceFilename, sourceHash: component.sha256, fileSize: bytes.length, ...source });
    offset += source.vertexCount;
  }
  const output = Buffer.from(lines.join('\n') + '\n');
  const derived = parseObj(output.toString('utf8'));
  if (derived.vertexCount !== sources.reduce((sum, s) => sum + s.vertexCount, 0) ||
      derived.faceCount !== sources.reduce((sum, s) => sum + s.faceCount, 0) ||
      derived.connectedComponents !== sources.reduce((sum, s) => sum + s.connectedComponents, 0)) throw Error('BP3D_CONVERSION_QA_FAILED');
  return { output, record: { conceptId: row.conceptId, representationId: row.representationId,
    proposedOrganHealStructureId: row.candidateStructureMapping, representation: row.candidateRepresentation,
    derivedFile: `${row.conceptId}_${row.representationId}.obj`, derivedHash: sha256(output), fileSize: output.length,
    sources, derived, transform: { matrix: [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]], units: 'millimeter' },
    deviation: { maximumVertexDistance: 0, topologyChanged: false, method: 'Numeric coordinates retained exactly; only object labels, OBJ formatting and index offsets change. Normals/UV/material references omitted; no welding, repair or surface reconstruction.' },
    qualification: 'INTERNAL-REVIEW', anatomicalVerification: false, clinicalApproval: false } };
}
module.exports = { convertRepresentation, sha256 };
