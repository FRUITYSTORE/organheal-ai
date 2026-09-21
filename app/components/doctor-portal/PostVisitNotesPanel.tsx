"use client";

import { useEffect, useState, type FormEvent } from "react";

import { supabase } from "@/lib/supabase";
import {
  createVisitNote,
  deleteVisitNote,
  listVisitNotes,
  VISIT_MEDICATION_MAX_LENGTH,
  VISIT_SUMMARY_MAX_LENGTH,
  type VisitNote,
} from "@/lib/repositories/visit-notes.repository";

type PostVisitNotesPanelProps = {
  isArabic: boolean;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string, isArabic: boolean): string {
  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(isArabic ? "ar" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PostVisitNotesPanel({
  isArabic,
}: PostVisitNotesPanelProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [notes, setNotes] = useState<VisitNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [visitDate, setVisitDate] = useState(todayIso());
  const [doctorSummary, setDoctorSummary] = useState("");
  const [medicationChanges, setMedicationChanges] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setUserId(data.user.id);
      }

      try {
        const existing = await listVisitNotes(data.user.id);

        if (!cancelled) {
          setNotes(existing);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage(
            text(
              "Visit notes are not available yet.",
              "ملاحظات الزيارات غير متاحة حاليًا."
            )
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId || saving || !doctorSummary.trim()) {
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const created = await createVisitNote(userId, {
        visitDate,
        doctorSummary,
        medicationChanges,
        followUpDate,
      });

      setNotes((current) => [created, ...current]);
      setDoctorSummary("");
      setMedicationChanges("");
      setFollowUpDate("");
      setVisitDate(todayIso());
    } catch {
      setErrorMessage(
        text(
          "Could not save this note. Please try again.",
          "تعذّر حفظ الملاحظة. حاول مرة أخرى."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(noteId: number) {
    if (!userId) {
      return;
    }

    try {
      await deleteVisitNote(userId, noteId);
      setNotes((current) => current.filter((note) => note.id !== noteId));
    } catch {
      setErrorMessage(
        text(
          "Could not delete this note. Please try again.",
          "تعذّر حذف الملاحظة. حاول مرة أخرى."
        )
      );
    }
  }

  if (!loading && !userId) {
    return null;
  }

  return (
    <section
      className="ohCard postVisitPanel"
      dir={isArabic ? "rtl" : "ltr"}
      aria-labelledby="post-visit-title"
    >
      <style>{`
        .postVisitPanel .postVisitForm {
          display: grid;
          gap: 14px;
          margin-top: 16px;
        }

        .postVisitPanel .postVisitRow {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .postVisitPanel label {
          display: grid;
          gap: 6px;
          color: #334155;
          font-size: 0.82rem;
          font-weight: 800;
        }

        .postVisitPanel input,
        .postVisitPanel textarea {
          width: 100%;
          padding: 11px 13px;
          border: 1px solid rgba(148, 163, 184, 0.4);
          border-radius: 14px;
          background: #ffffff;
          color: #0f172a;
          font: inherit;
          font-weight: 600;
        }

        .postVisitPanel textarea {
          min-height: 96px;
          resize: vertical;
        }

        .postVisitPanel input:focus,
        .postVisitPanel textarea:focus {
          outline: none;
          border-color: rgba(20, 184, 166, 0.7);
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
        }

        .postVisitPanel .postVisitList {
          display: grid;
          gap: 12px;
          margin-top: 22px;
        }

        .postVisitPanel .postVisitItem {
          padding: 14px 16px;
          border-radius: 16px;
          background: #f8fafc;
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-inline-start: 4px solid #0f766e;
        }

        .postVisitPanel .postVisitItemHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .postVisitPanel .postVisitDate {
          margin: 0;
          color: #0f766e;
          font-size: 0.76rem;
          font-weight: 950;
        }

        .postVisitPanel .postVisitBody {
          margin: 8px 0 0;
          color: #334155;
          font-size: 0.88rem;
          line-height: 1.65;
          white-space: pre-wrap;
        }

        .postVisitPanel .postVisitMeta {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 0.78rem;
          line-height: 1.55;
          white-space: pre-wrap;
        }

        .postVisitPanel .postVisitDelete {
          padding: 6px 10px;
          border: 1px solid rgba(185, 28, 28, 0.25);
          border-radius: 999px;
          background: #ffffff;
          color: #b91c1c;
          font-size: 0.72rem;
          font-weight: 800;
          cursor: pointer;
        }

        .postVisitPanel .postVisitError {
          margin: 12px 0 0;
          color: #b91c1c;
          font-size: 0.82rem;
          font-weight: 700;
        }

        @media (max-width: 640px) {
          .postVisitPanel .postVisitRow {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>

      <p className="ohMetricLabel">
        {text("After your visit", "بعد الزيارة")}
      </p>

      <h2 id="post-visit-title" className="ohCardTitle">
        {text(
          "Record what your doctor said",
          "سجّل ما قاله طبيبك"
        )}
      </h2>

      <p className="ohCardText">
        {text(
          "Save the key points, any medication changes, and your follow-up date. Having them in one place makes your next visit preparation far more accurate.",
          "احفظ النقاط الأساسية وأي تغيير بالأدوية وموعد المتابعة. وجودها في مكان واحد يجعل تحضيرك للزيارة القادمة أدق بكثير."
        )}
      </p>

      <form className="postVisitForm" onSubmit={handleSubmit}>
        <div className="postVisitRow">
          <label>
            {text("Visit date", "تاريخ الزيارة")}
            <input
              type="date"
              value={visitDate}
              max={todayIso()}
              onChange={(event) => setVisitDate(event.target.value)}
              required
            />
          </label>

          <label>
            {text("Follow-up date (optional)", "موعد المتابعة (اختياري)")}
            <input
              type="date"
              value={followUpDate}
              min={visitDate}
              onChange={(event) => setFollowUpDate(event.target.value)}
            />
          </label>
        </div>

        <label>
          {text(
            "What did the doctor say or recommend?",
            "ماذا قال الطبيب أو أوصى؟"
          )}
          <textarea
            value={doctorSummary}
            maxLength={VISIT_SUMMARY_MAX_LENGTH}
            onChange={(event) => setDoctorSummary(event.target.value)}
            required
          />
        </label>

        <label>
          {text(
            "Medication or treatment changes (optional)",
            "تغييرات الأدوية أو العلاج (اختياري)"
          )}
          <textarea
            value={medicationChanges}
            maxLength={VISIT_MEDICATION_MAX_LENGTH}
            onChange={(event) => setMedicationChanges(event.target.value)}
          />
        </label>

        <div>
          <button
            type="submit"
            className="primaryBtn"
            disabled={saving || !doctorSummary.trim()}
          >
            {saving
              ? text("Saving...", "جاري الحفظ...")
              : text("Save visit note", "احفظ ملاحظة الزيارة")}
          </button>
        </div>
      </form>

      {errorMessage && <p className="postVisitError">{errorMessage}</p>}

      {!loading && notes.length > 0 && (
        <div className="postVisitList">
          {notes.map((note) => (
            <article className="postVisitItem" key={note.id}>
              <div className="postVisitItemHeader">
                <p className="postVisitDate">
                  {formatDate(note.visit_date, isArabic)}
                  {note.follow_up_date
                    ? ` · ${text("follow-up", "متابعة")} ${formatDate(
                        note.follow_up_date,
                        isArabic
                      )}`
                    : ""}
                </p>

                <button
                  type="button"
                  className="postVisitDelete"
                  onClick={() => handleDelete(note.id)}
                >
                  {text("Delete", "حذف")}
                </button>
              </div>

              <p className="postVisitBody">{note.doctor_summary}</p>

              {note.medication_changes && (
                <p className="postVisitMeta">
                  {text("Medication: ", "الأدوية: ")}
                  {note.medication_changes}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
