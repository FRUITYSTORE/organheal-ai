import {createHmac} from 'node:crypto';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({admin:vi.fn(),process:vi.fn()}));
vi.mock('@/lib/supabase-admin',()=>({getSupabaseAdminClient:mocks.admin}));
vi.mock('@/lib/billing/payment-fulfillment',()=>({PaymentFulfillmentService:class {process=mocks.process}}));
import {POST} from '@/app/api/billing/webhook/route';
const secret='whsec_official_local_fixture';
describe('billing official signature TEST webhook route',()=>{
 beforeEach(()=>{vi.stubEnv('ORGANHEAL_BILLING_MODE','stripe-test');vi.stubEnv('STRIPE_SECRET_KEY','sk_test_fixture');vi.stubEnv('STRIPE_WEBHOOK_SECRET',secret);vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://pmjuyyqofkdbgqmrdbuh.supabase.co');});afterEach(()=>vi.unstubAllEnvs());
 function req(event:unknown,signature?:string){const raw=JSON.stringify(event),t=Math.floor(Date.now()/1000);return new Request('http://localhost/api/billing/webhook',{method:'POST',body:raw,headers:{'stripe-signature':signature??`t=${t},v1=${createHmac('sha256',secret).update(`${t}.${raw}`).digest('hex')}`}})}
 const event=()=>({id:'evt_fixture',type:'payment_method.attached',created:Math.floor(Date.now()/1000),livemode:false,data:{object:{id:'pm_fixture'}}});
 it('valid official signature invokes durable commercial boundary, no browser auth required',async()=>{mocks.process.mockResolvedValue({result:'unsupported'});expect((await POST(req(event()))).status).toBe(200);expect(mocks.process).toHaveBeenCalledOnce();});
 it.each(['t=1,v1=deadbeef',''])('invalid/missing signature stops before privileged client %s',async signature=>{expect((await POST(req(event(),signature))).status).toBe(400);expect(mocks.admin).not.toHaveBeenCalled();});
 it('signed live-mode event cannot fulfill',async()=>{expect((await POST(req({...event(),livemode:true}))).status).toBe(400);expect(mocks.admin).not.toHaveBeenCalled();});
 it('unconfigured mode fails closed',async()=>{vi.stubEnv('ORGANHEAL_BILLING_MODE','disabled');expect((await POST(req(event()))).status).toBe(503);expect(mocks.admin).not.toHaveBeenCalled();});
 it('oversized raw body is rejected before privileged work',async()=>{const r=await POST(new Request('http://localhost/api/billing/webhook',{method:'POST',body:'x'.repeat(262145)}));expect(r.status).toBe(413);expect(mocks.admin).not.toHaveBeenCalled();});
 it('retryable failure never acknowledges unfinished processing',async()=>{mocks.process.mockRejectedValue(Error('PRIVATE_DIAGNOSTIC'));const r=await POST(req(event()));expect(r.status).toBe(503);expect(await r.text()).not.toContain('PRIVATE');});
 it('valid retry with different JSON whitespace retains the same durable event fingerprint',async()=>{mocks.process.mockResolvedValue({result:'replayed'});const e=event();expect((await POST(req(e))).status).toBe(200);const raw=JSON.stringify(e,null,2),t=Math.floor(Date.now()/1000);const r=await POST(new Request('http://localhost/api/billing/webhook',{method:'POST',body:raw,headers:{'stripe-signature':`t=${t},v1=${createHmac('sha256',secret).update(`${t}.${raw}`).digest('hex')}`}}));expect(r.status).toBe(200);expect(mocks.process.mock.calls[0][1]).toBe(mocks.process.mock.calls[1][1]);});
});
