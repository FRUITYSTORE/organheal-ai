import { expect,it,vi,beforeEach } from "vitest";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { existingSpeechNarrationProvider } from "../lib/voice/medical-narration-provider";
import { resolveEducationalNarration,audioHash } from "../lib/medical-motion/composition/narration-foundation";
import { renderMedicalNarration,resolveMedicalVoiceProfile,narrationSpokenForm,normalizedSpokenText } from "../lib/medical-motion/composition/voice-runtime";
import { audioIdentity } from "../lib/medical-motion/composition/narration-foundation";
import type { VoiceRequest } from "../lib/medical-motion/contracts/voice-runtime";
const mocks=vi.hoisted(()=>({speech:vi.fn(),process:vi.fn(),transcribe:vi.fn()}));
vi.mock("../lib/voice/voice-synthesis.service",()=>({synthesizeVoice:mocks.speech}));
vi.mock("../lib/voice/voice-transcription.service",()=>({transcribeVoice:mocks.transcribe}));
vi.mock("../lib/medical-motion/composition/ffmpeg-runtime",()=>({executeMediaProcess:mocks.process}));
beforeEach(()=>{
  mocks.speech.mockReset().mockResolvedValue({audio:Buffer.from("mock MP3"),model:"configured-model",voice:"configured-voice"});
  mocks.transcribe.mockReset();
  const script=resolveEducationalNarration({scriptId:"HEART_EDUCATION_AR_V1",version:"1"});
  script.segments.forEach(s=>mocks.transcribe.mockResolvedValueOnce({transcript:s.text,model:"configured-transcriber"}));
  mocks.process.mockReset().mockImplementation(async(_runtime,_exe,args:string[],cwd:string)=>{
    await writeFile(path.join(cwd,args.at(-1)!),Buffer.alloc(4000*96));return "";
  });
});
const runtime={ffmpeg:"test",ffprobe:"test",timeoutMs:1000};
it("keeps exact LDL semantic text separate from bounded spoken form and cache identity",()=>{
  const semantic="يحمل الكوليسترول في الدم بواسطة جسيمات، ومنها إل دي إل.";
  const spoken=narrationSpokenForm(semantic,"ar");
  expect(spoken).not.toBe(semantic);
  expect(normalizedSpokenText(spoken)).toBe(normalizedSpokenText(semantic));
  expect(audioIdentity({text:semantic,spokenText:spoken})).not.toBe(audioIdentity({text:semantic}));
  expect(narrationSpokenForm("لا يثبت وجود انسداد.","ar")).toBe("لا يثبت وجود انسداد.");
  expect(narrationSpokenForm(semantic,"en")).toBe(semantic);
  expect(normalizedSpokenText("LDL")).not.toBe(normalizedSpokenText("إل دي إل"));
  expect(normalizedSpokenText("الكولستيرول")).not.toBe(normalizedSpokenText("الكوليسترول"));
});
it("reuses the existing speech service and decodes independent segments without tempo filters",async()=>{
  const voice=await renderMedicalNarration(resolveEducationalNarration({scriptId:"HEART_EDUCATION_AR_V1",version:"1"}),
    resolveMedicalVoiceProfile("AR_CLINICAL_CALM_V1"),existingSpeechNarrationProvider(runtime),"CLINICAL_STANDARD",new AbortController().signal);
  expect(mocks.speech).toHaveBeenCalledTimes(5);expect(voice.benchmark.providerType).toBe("EXTERNAL_TTS");
  expect(voice.benchmark).toMatchObject({modelRevision:"configured-model",voiceRevision:"configured-voice",cost:null});
  expect(mocks.process.mock.calls.every(c=>!c[2].join(" ").match(/atempo|rubberband|asetrate/))).toBe(true);
  expect(voice.narration.metadata.sha256).toMatch(/^[a-f0-9]{64}$/);
});
it("provider revision drift fails rather than silently mixing voices",async()=>{
  mocks.transcribe.mockReset().mockResolvedValueOnce({transcript:"This is an educational model of the heart, the muscle that pumps blood through the body.",model:"transcriber"});
  mocks.speech.mockResolvedValueOnce({audio:Buffer.from("one"),model:"m",voice:"one"}).mockResolvedValueOnce({audio:Buffer.from("two"),model:"m",voice:"two"});
  await expect(renderMedicalNarration(resolveEducationalNarration({scriptId:"HEART_EDUCATION_EN_V1",version:"1"}),
    resolveMedicalVoiceProfile("EN_CLINICAL_CALM_V1"),existingSpeechNarrationProvider(runtime),"CLINICAL_STANDARD",new AbortController().signal)).rejects.toThrow("VOICE_PROVIDER_DRIFT");
  expect(mocks.speech).toHaveBeenCalledTimes(2);
});
it("verified speech meaning mismatch fails even when declared script/hash match",async()=>{
  mocks.transcribe.mockReset().mockResolvedValue({transcript:"your heart is damaged",model:"transcriber"});
  await expect(renderMedicalNarration(resolveEducationalNarration({scriptId:"HEART_EDUCATION_AR_V1",version:"1"}),
    resolveMedicalVoiceProfile("AR_CLINICAL_CALM_V1"),existingSpeechNarrationProvider(runtime),"CLINICAL_STANDARD",new AbortController().signal)).rejects.toThrow("VOICE_SPOKEN_CONTENT_MISMATCH");
});
it("unsupported pronunciation/rate controls fail before provider submission",async()=>{
  const script=resolveEducationalNarration({scriptId:"HEART_EDUCATION_AR_V1",version:"1"});
  const request:VoiceRequest={script,segments:script.segments,language:"ar",locale:"ar-SA",voiceProfileId:"AR_CLINICAL_CALM_V1",
    voiceStylePreset:"ORGANHEAL_VOICE_SIGNATURE_V1",speechRatePreset:"CLINICAL_SLOW",pronunciationHints:[],requestIdentity:audioHash("unit")};
  await expect(existingSpeechNarrationProvider(runtime).render(request,new AbortController().signal)).rejects.toThrow("VOICE_CONTROLS_UNSUPPORTED");
  expect(mocks.speech).not.toHaveBeenCalled();
});
