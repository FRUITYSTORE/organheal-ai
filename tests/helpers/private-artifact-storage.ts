import { randomUUID } from "node:crypto";
import { readFile, writeFile, link, unlink } from "node:fs/promises";
import path from "node:path";
import { isUuid } from "@/lib/validation/uuid";
import type { PrivateArtifactStorage } from "@/lib/medical-motion/artifacts/storage";
/** Filesystem test adapter ONLY. Atomic link prevents overwrites; a new adapter
 * instance reads the same committed objects without any in-memory index. */
export class FileArtifactStorage implements PrivateArtifactStorage {
  lostResponse=false;failWrite=false;writes=0;
  constructor(readonly root:string) {if(!path.isAbsolute(root)) throw new Error("Invalid test storage root.");}
  private target(key:string) {if(!isUuid(key)) throw new Error("Invalid test object key.");return path.join(this.root,key);}
  async read(key:string) {
    let data:Buffer;
    try {data=await readFile(this.target(key));} catch(error) {if((error as NodeJS.ErrnoException).code==="ENOENT") return undefined;throw error;}
    if(data[0]!==1&&data[0]!==2) throw new Error("Invalid test object.");
    return {bytes:data.subarray(1),contentType:data[0]===1?"image/png":"video/mp4"};
  }
  async put(key:string,bytes:Buffer,contentType:string) {
    if(this.failWrite) throw new Error("Test storage unavailable.");
    if(!["image/png","video/mp4"].includes(contentType)) throw new Error("Invalid test media.");
    const target=this.target(key),temp=path.join(this.root,randomUUID()+".staging");
    try {await writeFile(temp,Buffer.concat([Buffer.from([contentType==="image/png"?1:2]),bytes]),{flag:"wx",mode:0o600});
      await link(temp,target);this.writes++;
    } finally {await unlink(temp).catch(()=>{});}
    if(this.lostResponse) throw new Error("Committed test upload response lost.");
  }
}
