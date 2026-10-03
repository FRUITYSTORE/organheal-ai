import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deliveryInput, DeliveryError } from "../lib/medical-motion/delivery/contracts";
const m=vi.hoisted(()=>({auth:vi.fn(),create:vi.fn(),status:vi.fn(),cancel:vi.fn(),access:vi.fn(),history:vi.fn(),admin:vi.fn(()=>({}))}));
vi.mock("../lib/api/api-auth",()=>({authenticateApiRequest:m.auth}));
vi.mock("../lib/supabase-admin",()=>({getSupabaseAdminClient:m.admin}));
vi.mock("../lib/medical-motion/delivery/service",()=>({MedicalMotionDeliveryService:class{create=m.create;status=m.status;cancel=m.cancel;access=m.access;history=m.history;}}));
import { handleDeliveryApi } from "../lib/medical-motion/delivery/api";
const owner=randomUUID(), id=randomUUID();
const input={sourceRef:randomUUID(),sceneIndex:0,language:"ar",aspectRatio:"16:9"};
const request=(body:unknown=input)=>new Request("https://organheal.test/api/medical-motion/requests",{method:"POST",body:JSON.stringify(body)});
describe("authenticated product Medical Motion API",()=>{
 beforeEach(()=>{vi.clearAllMocks();m.auth.mockResolvedValue({success:true,user:{id:owner}});m.create.mockImplementation(async(_owner,v)=>({requestId:id,...deliveryInput(v)}));m.status.mockResolvedValue({requestId:id,status:"queued",pollAfterSeconds:5});});
 it.each(["create","history","status","cancel","access"] as const)("unauthenticated %s never constructs admin capability",async action=>{
  m.auth.mockResolvedValue({success:false,status:401,error:"private diagnostic"});const r=await handleDeliveryApi(request(),action,id);
  expect(r.status).toBe(401);expect(m.admin).not.toHaveBeenCalled();expect(JSON.stringify(await r.json())).not.toContain("diagnostic");
 });
 it.each(["create","history","status","cancel","access"] as const)("anonymous authenticated session cannot %s",async action=>{
  m.auth.mockResolvedValue({success:true,user:{id:owner,is_anonymous:true}});expect((await handleDeliveryApi(request(),action,id)).status).toBe(401);expect(m.admin).not.toHaveBeenCalled();
 });
 it("creation uses authenticated owner, returns stable product identity and no-store",async()=>{
  const r=await handleDeliveryApi(request(),"create");expect(r.status).toBe(202);expect(m.create).toHaveBeenCalledWith(owner,input);expect(r.headers.get("Cache-Control")).toContain("no-store");
 });
 it("userId and caller clinical/worker authority are rejected",async()=>{const r=await handleDeliveryApi(request({...input,userId:randomUUID()}),"create");expect(r.status).toBe(400);});
 it("oversized streamed body is bounded",async()=>{expect((await handleDeliveryApi(request({prose:"x".repeat(2000)}),"create")).status).toBe(400);expect(m.create).not.toHaveBeenCalled();});
 it("malformed JSON fails safely",async()=>{expect((await handleDeliveryApi(new Request("https://organheal.test",{method:"POST",body:"{"}),"create")).status).toBe(400);});
 it("status guidance is bounded and has no session caching",async()=>{const r=await handleDeliveryApi(request(),"status",id);expect(r.headers.get("Retry-After")).toBe("5");expect(m.status).toHaveBeenCalledWith(owner,id);});
 it.each(["status","cancel","access"] as const)("unknown or other-owner %s returns indistinguishable 404",async action=>{m[action].mockRejectedValue(new DeliveryError("not-found"));expect((await handleDeliveryApi(request(),action,id)).status).toBe(404);});
 it("private provider errors are never exposed",async()=>{m.access.mockRejectedValue(Error("PRIVATE_TOKEN_AND_PHI"));const r=await handleDeliveryApi(request(),"access",id);expect(r.status).toBe(503);expect(JSON.stringify(await r.json())).not.toContain("PRIVATE");});
 it("bounded owner history rejects invalid offsets",async()=>{const r=await handleDeliveryApi(new Request("https://organheal.test?offset=-1"),"history");expect(r.status).toBe(400);expect(m.history).not.toHaveBeenCalled();});
 it.each([{...input,sceneIndex:-1},{...input,language:"fr"},{...input,aspectRatio:"free"},{...input,sourceRef:"path"},{...input,language:["ar"]},{...input,aspectRatio:["16:9"]}])("rejects invalid contract",v=>expect(()=>deliveryInput(v)).toThrow());
});
