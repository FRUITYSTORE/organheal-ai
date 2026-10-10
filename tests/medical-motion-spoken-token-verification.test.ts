import { expect,it } from "vitest";
import { canonicalMedicalSpokenTokens,medicalSpokenTextMatches } from "../lib/medical-motion/composition/spoken-token-verification";
it.each([
  ["الكوليسترول","الكولسترول"],
  ["الكوليسترول","الكولستيرول"],
  ["إل دي إل","LDL"],
  ["إِلْ، دِي، إِلْ","LDL"],
])("accepts only approved lexical forms: %s / %s",(a,b)=>expect(medicalSpokenTextMatches(a,b)).toBe(true));
it.each([
  ["LDL","HDL"],
  ["الكوليسترول مرتفع","الكوليسترول منخفض"],
  ["لا توجد لويحات","توجد لويحات"],
  ["قد يزيد الخطر","يؤكد وجود المرض"],
  ["لا يعني أنك مصاب","يعني أنك مصاب"],
  ["ناقش النتيجة مع مختص","ناقش النتيجة"],
  ["ناقش النتيجة","ناقش النتيجة المصابة"],
  ["الشريان","الوريد"],
  ["5%","5"],
  ["5%","6%"],
  ["-5","5"],
  ["5.1","51"],
  ["إل دي إل","إل إل دي"],
  ["لا توجد","لاتوجد"],
  ["الكوليسترول","الكوليستروول"],
  ["تعليمي عام","مرضك المؤكد"],
  ["أسبرين","وارفارين"],
])("rejects meaningful/unapproved differences: %s / %s",(a,b)=>expect(medicalSpokenTextMatches(a,b)).toBe(false));
it("preserves exact token order, count and repeated words",()=>{
  expect(canonicalMedicalSpokenTokens("الكولسترول ومنها إِلْ، دِي، إِلْ.")).toEqual(["الكوليسترول","ومنها","LDL"]);
  expect(medicalSpokenTextMatches("مع مختص مع بقية","مع مختص بقية")).toBe(false);
  expect(()=>canonicalMedicalSpokenTokens("\u202eLDL")).toThrow("VOICE_TRANSCRIPT_INVALID");
});
