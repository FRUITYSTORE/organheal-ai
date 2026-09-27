"use client";

import Link from "next/link";

import PageHero from "@/app/components/ui/PageHero";
import { useAdminLanguage } from "@/app/admin/use-admin-language";

export type KnowledgePackCard = {
  id: string;
  slug: string;
  organ: string;
  name: string;
  summary: string;
  version: string;
  sectionCount: number;
};

// The hub's own wording follows the site language. The knowledge packs
// themselves are written in English only, so their titles and text stay as
// published until Arabic versions of that content exist.
export default function KnowledgeHubContent({ packs }: { packs: KnowledgePackCard[] }) {
  const { isArabic, language, text } = useAdminLanguage();

  return (
    <div className="knowledgeHubContainer" dir={isArabic ? "rtl" : "ltr"} lang={language}>
      <PageHero
        eyebrow={text("Medical Knowledge", "المعرفة الطبية")}
        title={text("OrganHeal Knowledge Hub", "مركز المعرفة في OrganHeal")}
        description={text(
          "Evidence-based health education organized into structured knowledge packs for organs, families, patients, and clinicians.",
          "تثقيف صحي مبني على الأدلة ومنظَّم في حزم معرفية للأعضاء والأسر والمرضى والأطباء."
        )}
        badge={
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 900 }}>{packs.length}</div>
            <div style={{ fontSize: ".75rem", opacity: 0.85 }}>{text("Packs", "حزم")}</div>
          </div>
        }
      />

      <section className="knowledgeHubIntro">
        <div>
          <span className="knowledgeHubSectionLabel">
            {text("Published Knowledge Packs", "الحزم المعرفية المنشورة")}
          </span>

          <h2>{text("Explore health knowledge by organ system", "استكشف المعرفة الصحية حسب جهاز الجسم")}</h2>

          <p>
            {text(
              "Each pack connects educational articles, practical guidance, research updates, videos, checklists, and medical sources.",
              "تجمع كل حزمة مقالات تثقيفية وإرشادات عملية وتحديثات بحثية وفيديوهات وقوائم تحقق ومصادر طبية."
            )}
          </p>
        </div>

        <span className="knowledgeHubCount">
          {isArabic ? `${packs.length} حزمة` : `${packs.length} pack${packs.length === 1 ? "" : "s"}`}
        </span>
      </section>

      {packs.length > 0 ? (
        <div className="knowledgePackGrid">
          {packs.map((pack) => (
            <Link key={pack.id} href={`/knowledge/${pack.slug}`} className="knowledgePackCard">
              <div className="knowledgePackCardTop">
                <span className="knowledgePackOrgan">{pack.organ}</span>
                <span className="knowledgePackStatus">{text("Published", "منشورة")}</span>
              </div>

              <h2>{pack.name}</h2>

              <p>{pack.summary}</p>

              <div className="knowledgePackMeta">
                <span>
                  {text("Version", "الإصدار")} {pack.version}
                </span>
                <span>
                  {pack.sectionCount} {text("sections", "أقسام")}
                </span>
              </div>

              <span className="knowledgePackExplore">
                {text("Explore knowledge pack →", "استكشف الحزمة المعرفية ←")}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <section className="knowledgeHubEmpty knowledgeCard">
          <span>{text("Knowledge library", "المكتبة المعرفية")}</span>

          <h2>{text("Published knowledge packs are being prepared", "الحزم المعرفية المنشورة قيد الإعداد")}</h2>

          <p>
            {text(
              "Medical content will appear here after scientific review and publication.",
              "سيظهر المحتوى الطبي هنا بعد المراجعة العلمية والنشر."
            )}
          </p>
        </section>
      )}

      <section className="knowledgeSafetyNotice">
        <strong>{text("Evidence-based educational content", "محتوى تثقيفي مبني على الأدلة")}</strong>

        <p>
          {text(
            "OrganHeal knowledge resources support health understanding and preparation. They do not replace evaluation, diagnosis, or treatment by licensed healthcare professionals.",
            "تدعم موارد OrganHeal المعرفية فهمك الصحي واستعدادك، ولا تغني عن التقييم أو التشخيص أو العلاج من مختصين صحيين مرخّصين."
          )}
        </p>
      </section>
    </div>
  );
}
