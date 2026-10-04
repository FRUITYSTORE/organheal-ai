import { describe,it,expect,vi,beforeEach } from "vitest";
const m=vi.hoisted(()=>({auth:vi.fn(),admin:vi.fn(),current:vi.fn()}));
vi.mock("../lib/api/api-auth",()=>({authenticateApiRequest:m.auth}));
vi.mock("../lib/supabase-admin",()=>({getSupabaseAdminClient:m.admin}));
vi.mock("../lib/billing/product-authorization",()=>({ProductAuthorizationService:class{current=m.current;}}));
import { GET } from "../app/api/billing/entitlements/route";
describe("authenticated entitlement reads only",()=>{
 beforeEach(()=>vi.clearAllMocks());
 it("denies unauthenticated and never creates admin authority",async()=>{m.auth.mockResolvedValue({success:false});expect((await GET(new Request("https://organheal.test"))).status).toBe(401);expect(m.admin).not.toHaveBeenCalled();});
 it("denies anonymous sessions",async()=>{m.auth.mockResolvedValue({success:true,user:{id:"a",is_anonymous:true}});expect((await GET(new Request("https://organheal.test"))).status).toBe(401);expect(m.admin).not.toHaveBeenCalled();});
 it("uses authenticated owner irrespective of query owner and disables caching",async()=>{m.auth.mockResolvedValue({success:true,user:{id:"A"}});m.current.mockResolvedValue([]);const r=await GET(new Request("https://organheal.test?userId=B"));expect(m.current).toHaveBeenCalledWith("A");expect(r.headers.get("Cache-Control")).toContain("no-store");});
 it("does not expose commercial/provider diagnostics",async()=>{m.auth.mockResolvedValue({success:true,user:{id:"A"}});m.current.mockRejectedValue(Error("PRIVATE_PLAN_AND_PASSWORD"));const r=await GET(new Request("https://organheal.test"));expect(r.status).toBe(503);expect(JSON.stringify(await r.json())).not.toContain("PRIVATE");});
});
