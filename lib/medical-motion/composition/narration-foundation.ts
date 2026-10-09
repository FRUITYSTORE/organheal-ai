import "server-only";
import { createHash } from "node:crypto";
import { canonicalSceneJson } from "../scene-compiler";
import { jsonSnapshot } from "../validation/json-snapshot";
import type { NarrationAssetMetadata } from "../contracts/audio-composition";

export const audioHash = (v: Buffer | string) => createHash("sha256").update(v).digest("hex");
export function audioIdentity(v: unknown) { return audioHash(canonicalSceneJson(v)); }
export function deepAudioFreeze<T>(v: T): T { if(v && typeof v === "object") { Object.values(v).forEach(deepAudioFreeze);Object.freeze(v); }return v; }
export function audioInvalid(code = "AUDIO_COMPOSITION_INVALID"): never { throw Error(code); }
export function exactAudio(v: unknown, keys: readonly string[]): v is Record<string, unknown> {
  if(!v || typeof v!=="object" || Array.isArray(v) || Object.getPrototypeOf(v)!==Object.prototype)return false;
  const descriptors=Object.getOwnPropertyDescriptors(v);
  return Reflect.ownKeys(v).length===keys.length && keys.every(k=>descriptors[k]?.enumerable && "value" in descriptors[k]);
}
const scripts = new WeakSet<object>(), assets = new WeakMap<object, Buffer>();
const texts = {
  ar: ["هذا نموذج تعليمي للقلب.", "نبدأ بمنظر خارجي، ثم ننتقل إلى مقطع داخلي.",
    "يوضّح النموذج حركة المصدر الأصلية أثناء النبض.", "هذا عرض تعليمي، وليس تشخيصًا لحالة مرضية."],
  en: ["This is an educational heart model.", "We move from an exterior view to an internal view.",
    "The model shows its original source heartbeat motion.", "This educational view does not diagnose a medical condition."],
} as const;
/** Only this versioned neutral educational catalogue is executable in R2.5A.
 * Raw/AI/patient prose and claimed medical approval cannot issue a capability. */
export function resolveEducationalNarration(value: unknown) {
  if(!exactAudio(value,["scriptId","version"]) || value.version!=="1" ||
    !["HEART_EDUCATIONAL_DEMO_AR","HEART_EDUCATIONAL_DEMO_EN"].includes(String(value.scriptId)))audioInvalid("NARRATION_SCRIPT_UNAVAILABLE");
  const language:"ar"|"en"=value.scriptId==="HEART_EDUCATIONAL_DEMO_AR"?"ar":"en";
  const content={scriptId:String(value.scriptId),version:"1" as const,language,medicalContentVersion:"educational-neutral-1" as const,
    segments:texts[language].map((text,i)=>({segmentId:`segment-${i}`,text,kind:i===2?"explanation":"orientation-or-disclaimer"})),
    safety:{usage:"internal-review",patientFacing:false,clinicalApproval:"unreviewed",visualMeaning:"educational-only",
      diagnosisCertainty:"not-implied",pathologyNarration:false,rhythmClaim:false,personalization:false}};
  const script=deepAudioFreeze({...content,scriptHash:audioIdentity(content)});scripts.add(script);return script;
}
export type ApprovedNarrationScript = ReturnType<typeof resolveEducationalNarration>;
export const isApprovedNarrationScript=(s:unknown):s is ApprovedNarrationScript=>!!s&&typeof s==="object"&&scripts.has(s);
export type ApprovedNarrationAsset = Readonly<{ metadata: NarrationAssetMetadata; identity: string }>;
/** Trusted server adapter intake. Future provider types are modelled, not activated.
 * R2.5A admits only a deterministic non-speech TEST_FIXTURE, never unaudited TTS. */
export function approveNarrationFixture(script:ApprovedNarrationScript,value:unknown,bytes:Buffer):ApprovedNarrationAsset {
  if(!isApprovedNarrationScript(script))audioInvalid("NARRATION_AUTHORITY_INVALID");
  const m=jsonSnapshot(value) as unknown as NarrationAssetMetadata;
  if(!exactAudio(m,["narrationAssetId","language","locale","voiceProfileId","providerType","providerAssetReference","fixtureReference","durationMs","sampleRate","channels","codec","container","sha256","scriptId","scriptVersion","scriptHash","medicalContentVersion"])||
    m.providerType!=="TEST_FIXTURE" || m.providerAssetReference!==null || m.fixtureReference!=="deterministic-tone-v1" ||
    !["fixture-tone-v1","fixture-tone-v2"].includes(m.voiceProfileId) || m.narrationAssetId!==`fixture:${m.sha256}` ||
    m.language!==script.language || !new RegExp(`^${script.language}-[A-Z]{2}$`).test(m.locale) ||
    m.scriptId!==script.scriptId || m.scriptVersion!==script.version || m.scriptHash!==script.scriptHash || m.medicalContentVersion!==script.medicalContentVersion ||
    !Number.isSafeInteger(m.durationMs)||m.durationMs<1000||m.durationMs>60000 || m.sampleRate!==48000 || ![1,2].includes(m.channels)||
    m.codec!=="pcm_s16le"||m.container!=="wav"||!Buffer.isBuffer(bytes)||bytes.length>12*1024*1024||audioHash(bytes)!==m.sha256)audioInvalid("NARRATION_ASSET_INVALID");
  const samples=m.durationMs*48*m.channels;
  if(bytes.length!==44+samples*2 || bytes.toString("ascii",0,4)!=="RIFF"||bytes.toString("ascii",8,16)!=="WAVEfmt "||
    bytes.readUInt32LE(4)!==bytes.length-8||bytes.readUInt32LE(16)!==16||bytes.readUInt16LE(20)!==1||bytes.readUInt16LE(22)!==m.channels||
    bytes.readUInt32LE(24)!==48000||bytes.readUInt32LE(28)!==48000*m.channels*2||bytes.readUInt16LE(32)!==m.channels*2||bytes.readUInt16LE(34)!==16||
    bytes.toString("ascii",36,40)!=="data"||bytes.readUInt32LE(40)!==samples*2)audioInvalid("NARRATION_ASSET_INVALID");
  const result=deepAudioFreeze({metadata:m,identity:audioIdentity(m)});assets.set(result,Buffer.from(bytes));return result;
}
export const isApprovedNarrationAsset=(v:unknown):v is ApprovedNarrationAsset=>!!v&&typeof v==="object"&&assets.has(v);
export function narrationFixtureBytes(asset:ApprovedNarrationAsset) { const bytes=assets.get(asset);if(!bytes)audioInvalid("NARRATION_AUTHORITY_INVALID");return Buffer.from(bytes); }
/** Pure reproducible fixture generation; the caller writes it only to TEMP. Not speech/TTS. */
export function generateNarrationFixture(script:ApprovedNarrationScript,durationMs:number,voiceProfileId="fixture-tone-v1") {
  if(!isApprovedNarrationScript(script)||!Number.isSafeInteger(durationMs)||durationMs<1000||durationMs>60000||
    !["fixture-tone-v1","fixture-tone-v2"].includes(voiceProfileId))audioInvalid();
  const count=durationMs*48,bytes=Buffer.alloc(44+count*2);
  bytes.write("RIFF",0);bytes.writeUInt32LE(bytes.length-8,4);bytes.write("WAVEfmt ",8);bytes.writeUInt32LE(16,16);
  bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(48000,24);bytes.writeUInt32LE(96000,28);
  bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write("data",36);bytes.writeUInt32LE(count*2,40);
  for(let i=0;i<count;i++){const t=i/48000,envelope=Math.min(1,t/.15,(durationMs/1000-t)/.25);
    bytes.writeInt16LE(Math.round(1000*envelope*Math.sin(2*Math.PI*(voiceProfileId==="fixture-tone-v1"?440:470)*t)),44+i*2);}
  const sha256=audioHash(bytes),metadata:NarrationAssetMetadata={narrationAssetId:`fixture:${sha256}`,language:script.language,
    locale:script.language==="ar"?"ar-SA":"en-US",voiceProfileId,providerType:"TEST_FIXTURE",providerAssetReference:null,
    fixtureReference:"deterministic-tone-v1",durationMs,sampleRate:48000,channels:1,codec:"pcm_s16le",container:"wav",sha256,
    scriptId:script.scriptId,scriptVersion:script.version,scriptHash:script.scriptHash,medicalContentVersion:script.medicalContentVersion};
  return {bytes,metadata};
}
