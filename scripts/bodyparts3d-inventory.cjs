// Offline source inspection only. No runtime registration or geometry conversion.
const { createHash } = require('node:crypto');
function verifyArchive(bytes, pin) {
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== pin) throw Error('BP3D_ARCHIVE_HASH_MISMATCH');
  return hash;
}
function parseObj(text) {
  const vertices = [], faces = [], objects = new Set();
  for (const line of text.split(/\r?\n/)) {
    const tokens = line.trim().split(/\s+/);
    if (tokens[0] === 'o') objects.add(tokens.slice(1).join(' '));
    if (tokens[0] === 'v') {
      const point = tokens.slice(1, 4).map(Number);
      if (point.length !== 3 || !point.every(Number.isFinite)) throw Error('BP3D_INVALID_OBJ');
      vertices.push(point);
    }
    if (tokens[0] === 'f') {
      const face = tokens.slice(1).map(token => {
        const index = Number(token.split('/')[0]);
        return index < 0 ? vertices.length + index : index - 1;
      });
      if (face.length < 3 || face.some(index => !Number.isInteger(index) || index < 0 || index >= vertices.length)) throw Error('BP3D_INVALID_OBJ');
      faces.push(face);
    }
  }
  const parent = vertices.map((_, index) => index);
  const find = index => { while (parent[index] !== index) { parent[index] = parent[parent[index]]; index = parent[index]; } return index; };
  for (const face of faces) for (const index of face.slice(1)) parent[find(index)] = find(face[0]);
  const bounds = vertices.length ? [0, 1].map(side => [0, 1, 2].map(axis => vertices.reduce((value, point) => side ? Math.max(value, point[axis]) : Math.min(value, point[axis]), side ? -Infinity : Infinity))) : null;
  return { objectCount: objects.size || (vertices.length ? 1 : 0), vertexCount: vertices.length, faceCount: faces.length, connectedComponents: new Set(parent.map((_, index) => find(index))).size, boundingBox: bounds };
}
function candidateRepresentation(binding) {
  return { candidateStructureMapping: binding.proposedAnatomyStructureId ?? null, candidateRepresentation: binding.representation,
    verification: 'unverified', completeCoverage: false, usableForInternalReview: ['cavity', 'surface', 'wall', 'tissue', 'vessel'].includes(binding.representation),
    usableAsVerifiedAnatomy: false, limitations: [binding.unresolved, 'Source labels do not establish complete anatomy, medical suitability or physical units.'] };
}
module.exports = { verifyArchive, parseObj, candidateRepresentation };
