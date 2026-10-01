// Operational integration test: node tests/run-blender-artifacts.mjs
// Requires real Blender; never participates in Vitest or npm run build.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRenderDuration } from '../lib/medical-motion/render/duration-policy.ts';
import { resolveOutputDimensions } from '../lib/medical-motion/render/dimension-policy.ts';
import { createArtifactOwnership, validateArtifact } from '../lib/medical-motion/render/artifact-output.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const blender = process.env.BLENDER_EXECUTABLE_PATH || 'C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe';
const directory = mkdtempSync(path.join(tmpdir(), 'organheal-artifact-test-'));
let findings;
const previousOutputRoot = process.env.MEDICAL_MOTION_OUTPUT_ROOT;
try {
  process.env.MEDICAL_MOTION_OUTPUT_ROOT = path.join(directory, 'owned');
  const cases = [
    { media: 'still', aspectRatio: '1:1', resolution: '720p', durationSeconds: 5 },
    { media: 'video', aspectRatio: '9:16', resolution: '720p', durationSeconds: 0.1 },
  ].map(({ durationSeconds, ...output }) => {
    const dimensions = resolveOutputDimensions(output.aspectRatio, output.resolution);
    const duration = validateRenderDuration(durationSeconds, output.media);
    assert(dimensions.ok && duration.ok);
    return { output, durationSeconds, outputDimensions: dimensions.dimensions, videoTiming: duration.videoTiming };
  });
  const config = path.join(directory, 'cases.json');
  const owners = [];
  for (const entry of cases) {
    const owner = await createArtifactOwnership(entry.output.media === 'video' ? 'fixture.mp4' : 'fixture.png', entry.output.media);
    owners.push(owner);
    entry.artifactPath = owner.outputPath;
  }
  writeFileSync(config, JSON.stringify(cases));
  const result = spawnSync(blender, ['--background', '--factory-startup', '--python-exit-code', '1',
    '--python', path.join(root, 'tests/blender-artifacts.py'), '--', config, directory],
  { encoding: 'utf8', timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`Real Blender integration failed: ${result.error || result.stderr || result.stdout}`);
  findings = JSON.parse(readFileSync(path.join(directory, 'findings.json'), 'utf8'));
  assert(findings.png && findings.video);
  for (let i = 0; i < cases.length; i++) {
    const validation = await validateArtifact(owners[i], cases[i].outputDimensions);
    assert(validation.ok, validation.message);
    assert.equal(validation.byteSize, findings[cases[i].output.media === 'video' ? 'video' : 'png'].bytes);
  }
  findings.productionOwnershipAndValidation = 'passed';
} finally {
  if (previousOutputRoot === undefined) delete process.env.MEDICAL_MOTION_OUTPUT_ROOT;
  else process.env.MEDICAL_MOTION_OUTPUT_ROOT = previousOutputRoot;
  // Only the OS temporary directory created by this invocation is removed.
  rmSync(directory, { recursive: true, force: true });
  assert(!existsSync(directory), 'Temporary artifacts were not cleaned up');
}
console.log(JSON.stringify({ ...findings, cleanup: 'passed', integration: 'real Blender artifacts' }, null, 2));
