import type { Metadata } from "next";
import MedicalDisclaimerContent from "./MedicalDisclaimerContent";

export const metadata: Metadata = {
  title: "Medical Disclaimer",
  description:
    "Medical Disclaimer for OrganHeal AI explaining that the platform is educational and does not replace licensed medical care.",
};

export default function MedicalDisclaimerPage() {
  return <MedicalDisclaimerContent />;
}


