import "server-only";
import { createHash } from "node:crypto";
import { lstat, open, realpath } from "node:fs/promises";
import type { LocalArtifactCandidate } from "@/lib/jobs/handlers/medical-motion-render.handler";
import type { DurableBackgroundJob } from "@/lib/jobs/background-job-worker.repository";
import { readCandidateOwnership } from "../render/execution-resources";
import { validateArtifact } from "../render/artifact-output";
import { ArtifactError, ARTIFACT_MAX_BYTES, MedicalMotionArtifactRepository, type ArtifactRecord } from "./repository";
import { contentTypeFor, type PrivateArtifactStorage, type StoredBytes } from "./storage";

const digest=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
const active=(signal:AbortSignal)=>{if(signal.aborted) throw new ArtifactError("ARTIFACT_OWNERSHIP_LOST");};
function verify(record:ArtifactRecord,stored:StoredBytes) {
  if(stored.contentType!==contentTypeFor(record.media)||stored.bytes.length!==record.byteSize||digest(stored.bytes)!==record.sha256) throw new ArtifactError("ARTIFACT_CONFLICT");
}
/** The registry reserves identity before any storage write. Upload/readback and
 * registration run inside the existing ownership operation. This service never
 * completes/publishes jobs or logs provider errors. */
export class MedicalMotionArtifactService {
  constructor(readonly repository:MedicalMotionArtifactRepository,private readonly storage:PrivateArtifactStorage) {}
  private async read(key:string,signal?:AbortSignal) {
    try {return await this.storage.read(key,signal);} catch(error) {
      // A provider download abort is a trusted ownership cancellation, not a
      // transient storage fault. Late upload success cannot regain eligibility.
      if(signal?.aborted) throw new ArtifactError("ARTIFACT_OWNERSHIP_LOST");
      throw error instanceof ArtifactError?error:new ArtifactError("ARTIFACT_STORAGE_UNAVAILABLE");
    }
  }
  async reconcile(job:DurableBackgroundJob,signal:AbortSignal):Promise<ArtifactRecord|undefined> {
    active(signal);const records=await this.repository.list(job);
    for(const record of records) {
      if(record.jobId!==job.id||record.userId!==job.userId) throw new ArtifactError("ARTIFACT_INVALID");
      active(signal);const stored=await this.read(record.id,signal);active(signal);
      if(!stored) {if(record.persisted) throw new ArtifactError("ARTIFACT_CONFLICT");continue;}
      verify(record,stored);
      return this.repository.persist(job,record.id);
    }
    return undefined;
  }
  async handoff(job:DurableBackgroundJob,candidate:LocalArtifactCandidate,signal:AbortSignal):Promise<ArtifactRecord> {
    active(signal);const proof=readCandidateOwnership(candidate);
    if(!proof || proof.owner.outputPath!==candidate.localPath || proof.owner.media!==candidate.media ||
      proof.identity?.jobId!==job.id || proof.identity?.userId!==job.userId || proof.identity?.attemptToken!==job.attemptToken) throw new ArtifactError("ARTIFACT_INVALID");
    let bytes:Buffer;
    try {
      if(!(await validateArtifact(proof.owner,proof.dimensions)).ok) throw new Error();
      const before=await lstat(candidate.localPath);
      if(before.isSymbolicLink()||before.size>ARTIFACT_MAX_BYTES||await realpath(candidate.localPath)!==candidate.localPath) throw new Error();
      const file=await open(candidate.localPath,"r");
      try {const stat=await file.stat();if(stat.ino!==before.ino||stat.dev!==before.dev||stat.nlink!==1||!stat.isFile()||
          stat.size!==before.size||stat.mtimeMs!==before.mtimeMs||stat.size<1||stat.size>ARTIFACT_MAX_BYTES) throw new Error();
        // Fixed allocation prevents a changed/growing file from defeating the
        // memory bound between lstat and read. No unbounded readFile operation.
        bytes=Buffer.alloc(stat.size);let offset=0;
        while(offset<bytes.length) {
          active(signal);const read=await file.read(bytes,offset,bytes.length-offset,offset);
          if(!read.bytesRead) throw new Error();offset+=read.bytesRead;
        }
        if((await file.read(Buffer.alloc(1),0,1,bytes.length)).bytesRead) throw new Error();
        if(!(await validateArtifact(proof.owner,proof.dimensions)).ok) throw new Error();
        const after=await file.stat(),location=await lstat(candidate.localPath);
        if(after.size!==stat.size||after.mtimeMs!==stat.mtimeMs||location.ino!==stat.ino||location.dev!==stat.dev||location.isSymbolicLink()) throw new Error();
      } finally {await file.close();}
    } catch(error) {throw error instanceof ArtifactError?error:new ArtifactError("ARTIFACT_INVALID");}
    active(signal);
    const record=await this.repository.reserve(job,{media:candidate.media,byteSize:bytes.length,sha256:digest(bytes)});
    active(signal);
    let stored=await this.read(record.id,signal);active(signal);
    if(!stored) {
      // A failed response may mean upload committed. Read back before deciding;
      // the same DB-reserved UUID is used for every replay, never upserted.
      try {await this.storage.put(record.id,bytes,contentTypeFor(record.media));} catch { /* reconcile below */ }
      stored=await this.read(record.id,signal);active(signal);
      if(!stored) throw new ArtifactError("ARTIFACT_STORAGE_UNAVAILABLE");
    }
    verify(record,stored);active(signal);
    return this.repository.persist(job,record.id);
  }
  async retrieval(jobId:string,userId:string):Promise<ArtifactRecord|undefined> {
    const record=await this.repository.published(jobId,userId);
    if(!record) return undefined;
    const stored=await this.read(record.id);
    if(!stored) throw new ArtifactError("ARTIFACT_CONFLICT");verify(record,stored);return record;
  }
}
