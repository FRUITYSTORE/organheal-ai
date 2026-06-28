import type { Metadata } from "next";
import LegalPage from "../components/LegalPage";

export const metadata: Metadata = {
  title: "Medical Disclaimer",
  description:
    "Medical Disclaimer for OrganHeal AI explaining that the platform is educational and does not replace licensed medical care.",
};

export default function MedicalDisclaimerPage() {
  return (
    <LegalPage
      badge="MEDICAL DISCLAIMER"
      title="Medical Disclaimer"
      intro="OrganHeal AI provides educational and organizational health intelligence only. It is not a substitute for professional medical advice."
      updated="June 2026"
      sections={[
        {
          title: "1. Not a Medical Diagnosis",
          body: "OrganHeal AI does not diagnose medical conditions, confirm diseases, prescribe medications, recommend treatment plans, or replace clinical judgment.",
        },
        {
          title: "2. Emergency Warning",
          body: "Do not use OrganHeal AI for emergencies. If you have severe chest pain, severe shortness of breath, fainting, confusion, stroke symptoms, severe bleeding, or any urgent symptoms, seek emergency medical care immediately.",
        },
        {
          title: "3. Lab and Report Interpretation",
          body: "Lab values and medical reports can be complex and depend on age, history, medications, symptoms, pregnancy status, clinical examination, and other factors. OrganHeal AI summaries are educational and should be reviewed with a licensed healthcare professional.",
        },
        {
          title: "4. AI Limitations",
          body: "AI-generated content may contain errors, miss context, or misunderstand uploaded information. Users should not rely on OrganHeal AI as the only source for health decisions.",
        },
        {
          title: "5. Professional Care",
          body: "Always consult a licensed doctor or qualified healthcare professional for diagnosis, treatment, medication decisions, or urgent medical concerns.",
        },
      ]}
    />
  );
}
