import "server-only";
import { deepAudioFreeze } from "./narration-foundation";
/** Actual R2.5C auditions; generated media remains outside Git. No activation. */
export const VOICE_AUDITION_EVIDENCE_V1 = deepAudioFreeze([
    {
        "candidateId":  "AUDITION_AR_MARIN",
        "profileId":  "AR_CLINICAL_CALM_V1",
        "language":  "ar",
        "providerReference":  "existing-speech-service",
        "model":  "gpt-4o-mini-tts",
        "voiceRevision":  "marin",
        "sourceSha256":  "8878e575b6b70af5a4d52f7026cf34e9aba0ac251460d07167fe9388f07bbcaf",
        "durationSeconds":  12.768,
        "latencyMs":  3541.9100000000003,
        "cost":  null,
        "status":  "tested-pending-owner-listening",
        "transcriptMatches":  true,
        "active":  false,
        "finalSignature":  false,
        "ownerListeningRequired":  true,
        "subjectiveScores":  null,
        "evidenceReference":  "ar-marin.mp3.json",
        "patientFacing":  false
    },
    {
        "candidateId":  "AUDITION_AR_ONYX",
        "profileId":  "AR_CLINICAL_DEEP_V1",
        "language":  "ar",
        "providerReference":  "existing-speech-service",
        "model":  "gpt-4o-mini-tts",
        "voiceRevision":  "onyx",
        "sourceSha256":  "5cefde4562c0dcaa071d4022c547d10a59224fb7d2e33dcdc235c14a308b5211",
        "durationSeconds":  12.768,
        "latencyMs":  8980.0552,
        "cost":  null,
        "status":  "rejected-content-check",
        "transcriptMatches":  false,
        "active":  false,
        "finalSignature":  false,
        "ownerListeningRequired":  true,
        "subjectiveScores":  null,
        "evidenceReference":  "ar-onyx.mp3.json",
        "patientFacing":  false
    },
    {
        "candidateId":  "AUDITION_EN_CEDAR",
        "profileId":  "EN_CLINICAL_CALM_V1",
        "language":  "en",
        "providerReference":  "existing-speech-service",
        "model":  "gpt-4o-mini-tts",
        "voiceRevision":  "cedar",
        "sourceSha256":  "5b81d631eda56679032e3cc1445fab096eaba45fcf399a816c3fd1fb5d2f817e",
        "durationSeconds":  10.8,
        "latencyMs":  2230.3549999999996,
        "cost":  null,
        "status":  "tested-pending-owner-listening",
        "transcriptMatches":  true,
        "active":  false,
        "finalSignature":  false,
        "ownerListeningRequired":  true,
        "subjectiveScores":  null,
        "evidenceReference":  "en-cedar.mp3.json",
        "patientFacing":  false
    },
    {
        "candidateId":  "AUDITION_EN_MARIN",
        "profileId":  "EN_WARM_GUIDE_V1",
        "language":  "en",
        "providerReference":  "existing-speech-service",
        "model":  "gpt-4o-mini-tts",
        "voiceRevision":  "marin",
        "sourceSha256":  "e2e5afb124f04626cb6ed855f61de704b8f0bad7f969554aa558dd53039ecd0e",
        "durationSeconds":  12.816,
        "latencyMs":  2708.3873999999996,
        "cost":  null,
        "status":  "tested-pending-owner-listening",
        "transcriptMatches":  true,
        "active":  false,
        "finalSignature":  false,
        "ownerListeningRequired":  true,
        "subjectiveScores":  null,
        "evidenceReference":  "en-marin.mp3.json",
        "patientFacing":  false
    }
] as const);

/** Owner decisions are separate from immutable historical audition results.
 * Preference is catalogue metadata, never narration/render authority. */
export const OWNER_VOICE_SELECTION_V1 = deepAudioFreeze({
    id: "OWNER_VOICE_SELECTION_V1", version: "1", patientFacing: false,
    candidates: [
        { language: "ar", voice: "marin", evidence: "AUDITION_AR_MARIN", accepted: true, ownerListeningApproved: true, preferred: true, active: true, fallbackEligible: false, status: "OWNER_APPROVED" },
        { language: "en", voice: "marin", evidence: "AUDITION_EN_MARIN", accepted: true, ownerListeningApproved: true, preferred: true, active: true, fallbackEligible: false, status: "OWNER_APPROVED" },
        { language: "ar", voice: "cedar", evidence: "AR_CEDAR_AUDITION_V1", accepted: true, ownerListeningApproved: true, preferred: false, active: false, fallbackEligible: true, status: "ACCEPTED_FALLBACK" },
        { language: "en", voice: "cedar", evidence: "AUDITION_EN_CEDAR", accepted: true, ownerListeningApproved: true, preferred: false, active: false, fallbackEligible: true, status: "ACCEPTED_FALLBACK" },
        { language: "ar", voice: "onyx", evidence: "AUDITION_AR_ONYX", accepted: false, ownerListeningApproved: false, preferred: false, active: false, fallbackEligible: false, status: "REJECTED_CONTENT_MISMATCH" },
    ],
    pronunciationApproval: "unreviewed", pronunciationReviewNeeded: true, cost: null,
} as const);
