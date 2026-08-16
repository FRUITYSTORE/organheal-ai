"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";

import {
  useAudioRecorder,
} from "@/lib/voice/use-audio-recorder";

import {
  useRealtimeTranscription,
} from "@/lib/voice/use-realtime-transcription";

type VoiceInputLanguage =
  | "en"
  | "ar";

type VoiceInputButtonProps = {
  language:
    VoiceInputLanguage;

  disabled?:
    boolean;

  onTranscript:
    (
      transcript:
        string
    ) => void;
};

type VoiceTranscriptionResponse = {
  success?:
    boolean;

  transcript?:
    string;

  language?:
    VoiceInputLanguage;

  error?:
    string;

  requestId?:
    string;
};

function formatDuration(
  durationMs:
    number
): string {
  const totalSeconds =
    Math.floor(
      durationMs /
        1000
    );

  const minutes =
    Math.floor(
      totalSeconds /
        60
    );

  const seconds =
    totalSeconds %
    60;

  return `${minutes}:${seconds
    .toString()
    .padStart(
      2,
      "0"
    )}`;
}

function resolveAudioExtension(
  mimeType:
    string
): string {
  const normalized =
    mimeType
      .toLowerCase();

  if (
    normalized.includes(
      "mp4"
    )
  ) {
    return "mp4";
  }

  if (
    normalized.includes(
      "ogg"
    )
  ) {
    return "ogg";
  }

  if (
    normalized.includes(
      "wav"
    )
  ) {
    return "wav";
  }

  if (
    normalized.includes(
      "mpeg"
    ) ||
    normalized.includes(
      "mp3"
    )
  ) {
    return "mp3";
  }

  return "webm";
}

export default function VoiceInputButton({
  language,
  disabled =
    false,
  onTranscript,
}: VoiceInputButtonProps) {
  const isArabic =
    language ===
    "ar";

  const [
    transcriptionError,
    setTranscriptionError,
  ] =
    useState("");

  const [
    useFallback,
    setUseFallback,
  ] =
    useState(false);

  const [
    realtimeFailed,
    setRealtimeFailed,
  ] =
    useState(false);

  const labels =
    useMemo(
      () => ({
        start:
          isArabic
            ? "تحدث بسؤالك"
            : "Speak your question",

        stop:
          isArabic
            ? "إيقاف الاستماع"
            : "Stop listening",

        connecting:
          isArabic
            ? "جارٍ الاتصال بالصوت المباشر..."
            : "Connecting live voice...",

        listening:
          isArabic
            ? "أستمع الآن... تحدث بشكل طبيعي."
            : "Listening now... speak naturally.",

        fallbackListening:
          isArabic
            ? "جارٍ التسجيل الاحتياطي..."
            : "Fallback recording...",

        processing:
          isArabic
            ? "جارٍ تحويل الصوت إلى نص..."
            : "Converting speech to text...",

        permission:
          isArabic
            ? "تعذر الوصول إلى الميكروفون. تحقق من صلاحية الميكروفون."
            : "Could not access the microphone. Check microphone permission.",

        unavailable:
          isArabic
            ? "الميكروفون غير متاح."
            : "The microphone is unavailable.",

        unsupported:
          isArabic
            ? "الإدخال الصوتي غير مدعوم في هذا المتصفح."
            : "Voice input is not supported in this browser.",

        realtimeFailed:
          isArabic
            ? "تعذر تشغيل الصوت المباشر. سيتم استخدام التسجيل الاحتياطي."
            : "Live voice could not start. Using fallback recording.",

        failed:
          isArabic
            ? "تعذر معالجة الصوت. حاول مرة أخرى."
            : "Could not process the voice input. Please try again.",
      }),
      [
        isArabic,
      ]
    );

  const {
    status:
      recorderStatus,
    isRecording,
    durationMs,
    audioLevel,
    recordedAudio,
    error:
      recorderError,
    startRecording,
    stopRecording,
    resetRecording,
  } =
    useAudioRecorder();

  const handleRealtimeTranscript =
    useCallback(
      (
        transcript:
          string
      ) => {
        const normalized =
          transcript
            .trim();

        if (
          !normalized
        ) {
          return;
        }

        setTranscriptionError(
          ""
        );

        onTranscript(
          normalized
        );
      },
      [
        onTranscript,
      ]
    );

  const handleRealtimeError =
    useCallback(
      (
        message:
          string
      ) => {
        console.error(
          "Realtime voice failed:",
          message
        );

        setRealtimeFailed(
          true
        );

        setTranscriptionError(
          labels.realtimeFailed
        );
      },
      [
        labels.realtimeFailed,
      ]
    );

  const {
    status:
      realtimeStatus,
    liveTranscript,
    isConnecting,
    isListening,
    start:
      startRealtime,
    stop:
      stopRealtime,
  } =
    useRealtimeTranscription({
      onTranscript:
        handleRealtimeTranscript,

      onError:
        handleRealtimeError,
    });

  const [
    isTranscribing,
    setIsTranscribing,
  ] =
    useState(false);

  const transcribeFallbackRecording =
    useCallback(
      async () => {
        if (
          !recordedAudio ||
          isTranscribing
        ) {
          return;
        }

        setIsTranscribing(
          true
        );

        setTranscriptionError(
          ""
        );

        try {
          const extension =
            resolveAudioExtension(
              recordedAudio
                .mimeType
            );

          const file =
            new File(
              [
                recordedAudio
                  .blob,
              ],
              `organheal-voice.${extension}`,
              {
                type:
                  recordedAudio
                    .mimeType,
              }
            );

          const formData =
            new FormData();

          formData.append(
            "audio",
            file
          );

          formData.append(
            "language",
            language
          );

          const {
            data:
              sessionData,
          } =
            await supabase
              .auth
              .getSession();

          const accessToken =
            sessionData
              .session
              ?.access_token;

          const response =
            await fetch(
              "/api/voice/transcribe",
              {
                method:
                  "POST",

                headers:
                  accessToken
                    ? {
                        Authorization:
                          `Bearer ${accessToken}`,
                      }
                    : undefined,

                body:
                  formData,
              }
            );

          const payload =
            (await response
              .json()
              .catch(
                () =>
                  null
              )) as
              | VoiceTranscriptionResponse
              | null;

          if (
            !response.ok ||
            !payload
              ?.success ||
            !payload
              .transcript
              ?.trim()
          ) {
            throw new Error(
              payload
                ?.error ||
                labels.failed
            );
          }

          onTranscript(
            payload
              .transcript
              .trim()
          );

          resetRecording();

          setUseFallback(
            false
          );
        } catch (
          transcriptionFailure
        ) {
          console.error(
            "Fallback voice transcription failed:",
            transcriptionFailure
          );

          setTranscriptionError(
            transcriptionFailure instanceof
              Error
              ? transcriptionFailure
                  .message
              : labels.failed
          );
        } finally {
          setIsTranscribing(
            false
          );
        }
      },
      [
        isTranscribing,
        labels.failed,
        language,
        onTranscript,
        recordedAudio,
        resetRecording,
      ]
    );

  useEffect(
    () => {
      if (
        recorderStatus !==
          "ready" ||
        !recordedAudio ||
        isTranscribing
      ) {
        return;
      }

      void transcribeFallbackRecording();
    },
    [
      isTranscribing,
      recordedAudio,
      recorderStatus,
      transcribeFallbackRecording,
    ]
  );

  useEffect(
    () => {
      if (
        !realtimeFailed ||
        disabled ||
        isRecording ||
        recorderStatus ===
          "requesting" ||
        recorderStatus ===
          "stopping" ||
        isTranscribing
      ) {
        return;
      }

      setRealtimeFailed(
        false
      );

      setUseFallback(
        true
      );

      resetRecording();

      void startRecording();
    },
    [
      disabled,
      isRecording,
      isTranscribing,
      realtimeFailed,
      recorderStatus,
      resetRecording,
      startRecording,
    ]
  );

  const isBusy =
    isConnecting ||
    realtimeStatus ===
      "stopping" ||
    recorderStatus ===
      "requesting" ||
    recorderStatus ===
      "stopping" ||
    isTranscribing;

  const isActive =
    isListening ||
    isRecording;

  const statusMessage =
    (() => {
      if (
        transcriptionError &&
        !useFallback
      ) {
        return transcriptionError;
      }

      if (
        recorderError
      ) {
        switch (
          recorderError.code
        ) {
          case "permission-denied":
            return labels.permission;

          case "device-unavailable":
            return labels.unavailable;

          case "unsupported":
            return labels.unsupported;

          default:
            return labels.failed;
        }
      }

      if (
        isTranscribing
      ) {
        return labels.processing;
      }

      if (
        recorderStatus ===
        "requesting"
      ) {
        return labels.connecting;
      }

      if (
        isRecording
      ) {
        return `${labels.fallbackListening} ${formatDuration(
          durationMs
        )}`;
      }

      if (
        isConnecting
      ) {
        return labels.connecting;
      }

      if (
        isListening
      ) {
        if (
          liveTranscript
            .trim()
        ) {
          return liveTranscript;
        }

        return labels.listening;
      }

      return "";
    })();

  const handleVoiceClick =
    async () => {
      if (
        disabled ||
        isBusy
      ) {
        return;
      }

      setTranscriptionError(
        ""
      );

      if (
        isListening
      ) {
        stopRealtime();

        return;
      }

      if (
        isRecording
      ) {
        stopRecording();

        return;
      }

     setUseFallback(
  false
);

setRealtimeFailed(
  false
);

await startRealtime();
};

  const waveformBars =
    [
      0.36,
      0.55,
      0.72,
      1,
      0.82,
      0.62,
      0.44,
    ];

  return (
    <div className="organhealVoiceInput">
      <style>{`
        .organhealVoiceInput {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .organhealVoiceButton {
          position: relative;
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          border: 1px solid rgba(13, 148, 136, 0.28);
          background: linear-gradient(145deg, #f0fdfa, #ffffff);
          color: #0f766e;
          cursor: pointer;
          box-shadow: 0 8px 22px rgba(15, 118, 110, 0.08);
          transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .organhealVoiceButton:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(13, 148, 136, 0.55);
          box-shadow: 0 12px 26px rgba(15, 118, 110, 0.15);
        }

        .organhealVoiceButton.recording {
          background: linear-gradient(145deg, #dc2626, #ef4444);
          border-color: #dc2626;
          color: #ffffff;
          box-shadow: 0 0 0 5px rgba(220, 38, 38, 0.12);
        }

        .organhealVoiceButton.processing {
          cursor: wait;
          background: linear-gradient(145deg, #ecfeff, #f0fdfa);
        }

        .organhealVoiceButton:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .organhealVoiceButton svg {
          width: 21px;
          height: 21px;
        }

        .organhealVoiceWave {
          height: 28px;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .organhealVoiceWave span {
          width: 3px;
          min-height: 4px;
          border-radius: 999px;
          background: #ef4444;
          transition: height 0.08s linear;
        }

        .organhealVoiceWave.live span {
          animation: organhealVoiceWave 0.9s ease-in-out infinite alternate;
        }

        .organhealVoiceWave.live span:nth-child(2),
        .organhealVoiceWave.live span:nth-child(6) {
          animation-delay: 0.12s;
        }

        .organhealVoiceWave.live span:nth-child(3),
        .organhealVoiceWave.live span:nth-child(5) {
          animation-delay: 0.24s;
        }

        .organhealVoiceStatus {
          max-width: 280px;
          color: #64748b;
          font-size: 0.74rem;
          font-weight: 750;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .organhealVoiceStatus.error {
          color: #b91c1c;
        }

        .organhealVoiceSpinner {
          width: 19px;
          height: 19px;
          border-radius: 999px;
          border: 2px solid rgba(15, 118, 110, 0.2);
          border-top-color: #0f766e;
          animation: organhealVoiceSpin 0.8s linear infinite;
        }

        @keyframes organhealVoiceSpin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes organhealVoiceWave {
          from {
            transform: scaleY(0.45);
          }

          to {
            transform: scaleY(1);
          }
        }

        @media (max-width: 640px) {
          .organhealVoiceStatus {
            max-width: 180px;
            font-size: 0.7rem;
          }
        }
      `}</style>

      <button
        type="button"
        className={`organhealVoiceButton ${
          isActive
            ? "recording"
            : isBusy
              ? "processing"
              : ""
        }`}
        onClick={
          handleVoiceClick
        }
        disabled={
          disabled ||
          isBusy
        }
        aria-label={
          isActive
            ? labels.stop
            : labels.start
        }
        aria-pressed={
          isActive
        }
        title={
          isActive
            ? labels.stop
            : labels.start
        }
      >
        {isBusy ? (
          <span className="organhealVoiceSpinner" />
        ) : isActive ? (
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <rect
              x="7"
              y="7"
              width="10"
              height="10"
              rx="2"
              fill="currentColor"
            />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="9"
              y="3"
              width="6"
              height="11"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.8"
            />

            <path
              d="M5.5 10.5a6.5 6.5 0 0 0 13 0"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            <path
              d="M12 17v4M9 21h6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      {isActive && (
        <div
          className={`organhealVoiceWave ${
            isListening
              ? "live"
              : ""
          }`}
          aria-hidden="true"
        >
          {waveformBars.map(
            (
              multiplier,
              index
            ) => (
              <span
                key={
                  index
                }
                style={{
                  height:
                    isRecording
                      ? `${Math.max(
                          4,
                          Math.round(
                            28 *
                              multiplier *
                              Math.max(
                                0.18,
                                audioLevel
                              )
                          )
                        )}px`
                      : `${Math.round(
                          28 *
                            multiplier
                        )}px`,
                }}
              />
            )
          )}
        </div>
      )}

      {statusMessage && (
        <span
          className={`organhealVoiceStatus ${
            recorderError ||
            (
              transcriptionError &&
              !useFallback
            )
              ? "error"
              : ""
          }`}
          role={
            recorderError ||
            (
              transcriptionError &&
              !useFallback
            )
              ? "alert"
              : "status"
          }
        >
          {
            statusMessage
          }
        </span>
      )}
    </div>
  );
}
