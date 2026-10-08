import { it, expect, vi } from "vitest";
import { mkdtemp, readFile, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { contextContent } from "../helpers/medical-motion-context";
import { prepareExplanationAuthorization, readExplanationAuthorization } from "../../lib/symptom-explanation/explanation-authorization";
import { renderHeartScene } from "../../lib/medical-motion/render/blender-renderer";
import * as boundary from "../../lib/medical-motion/render/blender-process";
import { getOrganModuleForAsset } from "../../lib/medical-motion/organ-modules";
it("real exact authorized development builder and independent unknown dispatch",async()=>{
 const root=await mkdtemp(path.join(tmpdir(),"organheal-asset-routing-")),c=contextContent();
 const executable=process.env.BLENDER_EXECUTABLE_PATH||"C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe";
 const version=spawnSync(executable,["--version"],{encoding:"utf8"}).stdout.split("\n")[0].trim();
 const original=boundary.runBlenderProcess;
 vi.spyOn(boundary,"runBlenderProcess").mockImplementation(async(exe,args,timeout,signal)=>{
  const config=JSON.parse(await readFile(args[args.length-2],"utf8"));expect(config.assetVersion).toBe("heart-v2-development");
  await writeFile(path.join(root,"authorized-config.json"),JSON.stringify(config,null,2));
  return original(exe,args,timeout,signal);
 });
 vi.stubEnv("MEDICAL_MOTION_OUTPUT_ROOT",path.join(root,"output"));
 const p=prepareExplanationAuthorization({clinical:c.clinical,plan:c.candidatePlan,sceneIndex:0},
  {clinicalContextId:"SYNTHETIC-ROUTING-ACCEPTANCE",assetVersion:c.assetVersion,mode:"development",outputPath:"review.mp4"});
 if(!("ok" in p))throw Error(p.message);const a=readExplanationAuthorization(p.authorization)!;
 expect(getOrganModuleForAsset("heart",a.request.assetVersion)?.assetVersion).toBe(c.assetVersion);
 const result=await renderHeartScene(a.request.scene,"review.mp4",{mode:"development",assetVersion:c.assetVersion,explanationPlan:a.request.explanationPlan,clinicalAuthorization:p.authorization});
 expect(result.status).toBe("completed");
 if(result.status==="failed")throw Error(result.errorCode);
 if(result.status!=="completed")throw Error(`Unexpected render status: ${result.status}`);
 const bytes=(await stat(result.outputPath)).size;
 expect(await renderHeartScene(a.request.scene,"unknown.mp4",{mode:"development",assetVersion:"heart-unknown-test-version"}))
  .toMatchObject({status:"failed",errorCode:"INVALID_SCENE"});
 const config=path.join(root,"unknown.json"),output=path.join(root,"unknown.mp4");
 await writeFile(config,JSON.stringify({organ:"heart",assetVersion:"heart-unknown-test-version"}));
 const negative=spawnSync(executable,["--background","--python",path.resolve("render/blender/render_scene.py"),"--",config,output],{encoding:"utf8",timeout:60000});
 expect(negative.stdout+negative.stderr).toContain("ASSET_NOT_FOUND");
 await expect(stat(output)).rejects.toThrow();
 await writeFile(path.join(root,"evidence.json"),JSON.stringify({version,assetVersion:c.assetVersion,media:a.request.scene.output.media,output:result.outputPath,bytes,executionSeconds:result.durationSeconds,outputProfile:a.request.scene.output,negativeCode:"ASSET_NOT_FOUND",acceptedNegativeArtifacts:0},null,2));
 console.info("ROUTING_REVIEW",root);
 vi.restoreAllMocks();vi.unstubAllEnvs();
},1200000);
