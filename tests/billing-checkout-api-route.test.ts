import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({auth:vi.fn(),admin:vi.fn(),create:vi.fn()}));
vi.mock('@/lib/api/api-auth',()=>({authenticateApiRequest:mocks.auth}));
vi.mock('@/lib/supabase-admin',()=>({getSupabaseAdminClient:mocks.admin}));
vi.mock('@/lib/billing/payment-checkout',()=>({PaymentCheckoutService:class {create=mocks.create}}));
import {POST} from '@/app/api/billing/checkout/route';
describe('billing checkout authenticated TEST route',()=>{
 beforeEach(()=>{vi.stubEnv('ORGANHEAL_BILLING_MODE','stripe-test');vi.stubEnv('STRIPE_SECRET_KEY','sk_test_fixture');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://pmjuyyqofkdbgqmrdbuh.supabase.co');});
 afterEach(()=>vi.unstubAllEnvs());
 const req=(body:unknown)=>new Request('http://localhost/api/billing/checkout',{method:'POST',body:JSON.stringify(body)});
 it('disabled mode fails before auth or provider work',async()=>{vi.stubEnv('ORGANHEAL_BILLING_MODE','disabled');expect((await POST(req({offer:'plus-monthly'}))).status).toBe(503);expect(mocks.auth).not.toHaveBeenCalled();});
 it('requires verified authentication',async()=>{mocks.auth.mockResolvedValue({success:false});expect((await POST(req({offer:'plus-monthly'}))).status).toBe(401);expect(mocks.admin).not.toHaveBeenCalled();});
 it('passes only verified owner and requested body to server offer resolver',async()=>{mocks.auth.mockResolvedValue({success:true,user:{id:'verified-owner'}});mocks.create.mockResolvedValue({url:'https://checkout.stripe.com/test'});const r=await POST(req({offer:'plus-monthly'}));expect(r.status).toBe(200);expect(mocks.create).toHaveBeenCalledWith('verified-owner',{offer:'plus-monthly'});expect(r.headers.get('cache-control')).toBe('private, no-store');});
 it('returns bounded failure without secrets or diagnostics',async()=>{mocks.auth.mockResolvedValue({success:true,user:{id:'verified-owner'}});mocks.create.mockRejectedValue(Error('PRIVATE_PROVIDER_SECRET'));const r=await POST(req({offer:'plus-monthly'}));expect(r.status).toBe(503);expect(await r.text()).not.toContain('PRIVATE');});
 it('does not infer a default Plus offer from empty malformed input',async()=>{mocks.auth.mockResolvedValue({success:true,user:{id:'verified-owner'}});const r=await POST(new Request('http://localhost/api/billing/checkout',{method:'POST',body:'invalid'}));expect(r.status).toBe(400);expect(mocks.create).not.toHaveBeenCalled();});
});
