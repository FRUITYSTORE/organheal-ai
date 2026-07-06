type MedicalSafetyNoticeProps = {
  title: string;
  description: string;
};

export default function MedicalSafetyNotice({
  title,
  description,
}: MedicalSafetyNoticeProps) {
  return (
    <section className="hpSafety">
      <strong>{title}</strong>
      <br />
      {description}
    </section>
  );
}