"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export type AudioRecorderStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "stopping"
  | "ready"
  | "error"
  | "unsupported";

export type RecordedAudio = {
  blob:
    Blob;

  mimeType:
    string;

  durationMs:
    number;

  size:
    number;
};

export type AudioRecorderErrorCode =
  | "unsupported"
  | "permission-denied"
  | "device-unavailable"
  | "recording-failed"
  | "empty-recording";

export type AudioRecorderError = {
  code:
    AudioRecorderErrorCode;

  message:
    string;
};

export type UseAudioRecorderResult = {
  status:
    AudioRecorderStatus;

  isRecording:
    boolean;

  isReady:
    boolean;

  durationMs:
    number;

  audioLevel:
    number;

  recordedAudio:
    RecordedAudio | null;

  error:
    AudioRecorderError | null;

  startRecording:
    () => Promise<void>;

  stopRecording:
    () => void;

  resetRecording:
    () => void;
};

const MAX_RECORDING_MS =
  120_000;

const LEVEL_UPDATE_INTERVAL_MS =
  80;

const MIME_TYPE_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function resolveSupportedMimeType():
  string {
  if (
    typeof MediaRecorder ===
    "undefined"
  ) {
    return "";
  }

  for (
    const mimeType of
      MIME_TYPE_CANDIDATES
  ) {
    if (
      MediaRecorder
        .isTypeSupported(
          mimeType
        )
    ) {
      return mimeType;
    }
  }

  return "";
}

function normalizeAudioLevel(
  analyser:
    AnalyserNode,
  buffer:
    Uint8Array<ArrayBuffer>
): number {
  analyser.getByteTimeDomainData(
    buffer
  );

  let sumSquares =
    0;

  for (
    let index =
      0;
    index <
    buffer.length;
    index++
  ) {
    const normalized =
      (
        buffer[index] -
        128
      ) /
      128;

    sumSquares +=
      normalized *
      normalized;
  }

  const rms =
    Math.sqrt(
      sumSquares /
        buffer.length
    );

  return Math.min(
    1,
    Math.max(
      0,
      rms * 5
    )
  );
}

function resolveRecorderError(
  error:
    unknown
): AudioRecorderError {
  if (
    error instanceof
      DOMException
  ) {
    if (
      error.name ===
        "NotAllowedError" ||
      error.name ===
        "SecurityError"
    ) {
      return {
        code:
          "permission-denied",

        message:
          "Microphone permission was denied.",
      };
    }

    if (
      error.name ===
        "NotFoundError" ||
      error.name ===
        "NotReadableError" ||
      error.name ===
        "AbortError"
    ) {
      return {
        code:
          "device-unavailable",

        message:
          "The microphone is unavailable.",
      };
    }
  }

  return {
    code:
      "recording-failed",

    message:
      "Audio recording could not be started.",
  };
}

export function useAudioRecorder():
  UseAudioRecorderResult {
  const [
    status,
    setStatus,
  ] =
    useState<
      AudioRecorderStatus
    >(
      "idle"
    );

  const [
    durationMs,
    setDurationMs,
  ] =
    useState(
      0
    );

  const [
    audioLevel,
    setAudioLevel,
  ] =
    useState(
      0
    );

  const [
    recordedAudio,
    setRecordedAudio,
  ] =
    useState<
      RecordedAudio | null
    >(
      null
    );

  const [
    error,
    setError,
  ] =
    useState<
      AudioRecorderError | null
    >(
      null
    );

  const mediaRecorderRef =
    useRef<
      MediaRecorder | null
    >(
      null
    );

  const mediaStreamRef =
    useRef<
      MediaStream | null
    >(
      null
    );

  const audioContextRef =
    useRef<
      AudioContext | null
    >(
      null
    );

  const analyserRef =
    useRef<
      AnalyserNode | null
    >(
      null
    );

  const analyserBufferRef =
    useRef<
      Uint8Array<ArrayBuffer> | null
    >(
      null
    );

  const recordedChunksRef =
    useRef<
      Blob[]
    >(
      []
    );

  const recordingStartedAtRef =
    useRef<
      number | null
    >(
      null
    );

  const durationTimerRef =
    useRef<
      ReturnType<
        typeof setInterval
      > | null
    >(
      null
    );

  const maxDurationTimerRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(
      null
    );

  const levelTimerRef =
    useRef<
      ReturnType<
        typeof setInterval
      > | null
    >(
      null
    );

  const cleanupTimers =
    useCallback(
      () => {
        if (
          durationTimerRef
            .current
        ) {
          clearInterval(
            durationTimerRef
              .current
          );

          durationTimerRef
            .current =
            null;
        }

        if (
          maxDurationTimerRef
            .current
        ) {
          clearTimeout(
            maxDurationTimerRef
              .current
          );

          maxDurationTimerRef
            .current =
            null;
        }

        if (
          levelTimerRef
            .current
        ) {
          clearInterval(
            levelTimerRef
              .current
          );

          levelTimerRef
            .current =
            null;
        }
      },
      []
    );

  const cleanupAudioAnalysis =
    useCallback(
      async () => {
        analyserRef
          .current =
          null;

        analyserBufferRef
          .current =
          null;

        const context =
          audioContextRef
            .current;

        audioContextRef
          .current =
          null;

        if (
          context &&
          context.state !==
            "closed"
        ) {
          try {
            await context.close();
          } catch {
            // Cleanup must not
            // break recording flow.
          }
        }

        setAudioLevel(
          0
        );
      },
      []
    );

  const cleanupMediaStream =
    useCallback(
      () => {
        const stream =
          mediaStreamRef
            .current;

        mediaStreamRef
          .current =
          null;

        if (
          !stream
        ) {
          return;
        }

        for (
          const track of
            stream.getTracks()
        ) {
          track.stop();
        }
      },
      []
    );

  const stopRecording =
    useCallback(
      () => {
        const recorder =
          mediaRecorderRef
            .current;

        if (
          !recorder ||
          recorder.state ===
            "inactive"
        ) {
          return;
        }

        setStatus(
          "stopping"
        );

        cleanupTimers();

        recorder.stop();
      },
      [
        cleanupTimers,
      ]
    );

  const startAudioAnalysis =
    useCallback(
      (
        stream:
          MediaStream
      ) => {
        try {
          const context =
            new AudioContext();

          const source =
            context
              .createMediaStreamSource(
                stream
              );

          const analyser =
            context
              .createAnalyser();

          analyser.fftSize =
            256;

          analyser.smoothingTimeConstant =
            0.75;

          source.connect(
            analyser
          );

          const buffer =
            new Uint8Array(
              new ArrayBuffer(
                analyser
                  .fftSize
              )
            );

          audioContextRef
            .current =
            context;

          analyserRef
            .current =
            analyser;

          analyserBufferRef
            .current =
            buffer;

          levelTimerRef
            .current =
            setInterval(
              () => {
                const currentAnalyser =
                  analyserRef
                    .current;

                const currentBuffer =
                  analyserBufferRef
                    .current;

                if (
                  !currentAnalyser ||
                  !currentBuffer
                ) {
                  return;
                }

                setAudioLevel(
                  normalizeAudioLevel(
                    currentAnalyser,
                    currentBuffer
                  )
                );
              },
              LEVEL_UPDATE_INTERVAL_MS
            );
        } catch {
          // Recording remains usable
          // even without visualization.
          setAudioLevel(
            0
          );
        }
      },
      []
    );

  const startRecording =
    useCallback(
      async () => {
        if (
          typeof window ===
            "undefined" ||
          typeof navigator ===
            "undefined" ||
          !navigator
            .mediaDevices
            ?.getUserMedia ||
          typeof MediaRecorder ===
            "undefined"
        ) {
          setStatus(
            "unsupported"
          );

          setError({
            code:
              "unsupported",

            message:
              "Audio recording is not supported in this browser.",
          });

          return;
        }

        if (
          status ===
            "recording" ||
          status ===
            "requesting" ||
          status ===
            "stopping"
        ) {
          return;
        }

        setStatus(
          "requesting"
        );

        setError(
          null
        );

        setRecordedAudio(
          null
        );

        setDurationMs(
          0
        );

        setAudioLevel(
          0
        );

        recordedChunksRef
          .current =
          [];

        try {
          const stream =
            await navigator
              .mediaDevices
              .getUserMedia({
                audio: {
                  echoCancellation:
                    true,

                  noiseSuppression:
                    true,

                  autoGainControl:
                    true,
                },
              });

          mediaStreamRef
            .current =
            stream;

          const mimeType =
            resolveSupportedMimeType();

          const recorder =
            mimeType
              ? new MediaRecorder(
                  stream,
                  {
                    mimeType,
                  }
                )
              : new MediaRecorder(
                  stream
                );

          mediaRecorderRef
            .current =
            recorder;

          recorder.ondataavailable =
            (
              event
            ) => {
              if (
                event.data.size >
                0
              ) {
                recordedChunksRef
                  .current
                  .push(
                    event.data
                  );
              }
            };

          recorder.onerror =
            () => {
              cleanupTimers();

              void cleanupAudioAnalysis();

              cleanupMediaStream();

              mediaRecorderRef
                .current =
                null;

              setStatus(
                "error"
              );

              setError({
                code:
                  "recording-failed",

                message:
                  "Audio recording failed.",
              });
            };

          recorder.onstop =
            () => {
              cleanupTimers();

              void cleanupAudioAnalysis();

              cleanupMediaStream();

              const startedAt =
                recordingStartedAtRef
                  .current;

              recordingStartedAtRef
                .current =
                null;

              const finalDurationMs =
                startedAt
                  ? Math.max(
                      0,
                      Date.now() -
                        startedAt
                    )
                  : durationMs;

              const chunks =
                recordedChunksRef
                  .current;

              recordedChunksRef
                .current =
                [];

              mediaRecorderRef
                .current =
                null;

              if (
                chunks.length ===
                0
              ) {
                setStatus(
                  "error"
                );

                setError({
                  code:
                    "empty-recording",

                  message:
                    "No audio was captured.",
                });

                return;
              }

              const finalMimeType =
                recorder
                  .mimeType ||
                mimeType ||
                "audio/webm";

              const blob =
                new Blob(
                  chunks,
                  {
                    type:
                      finalMimeType,
                  }
                );

              if (
                blob.size ===
                0
              ) {
                setStatus(
                  "error"
                );

                setError({
                  code:
                    "empty-recording",

                  message:
                    "No audio was captured.",
                });

                return;
              }

              setDurationMs(
                finalDurationMs
              );

              setRecordedAudio({
                blob,

                mimeType:
                  finalMimeType,

                durationMs:
                  finalDurationMs,

                size:
                  blob.size,
              });

              setStatus(
                "ready"
              );

              setError(
                null
              );
            };

          recordingStartedAtRef
            .current =
            Date.now();

          recorder.start(
            250
          );

          setStatus(
            "recording"
          );

          startAudioAnalysis(
            stream
          );

          durationTimerRef
            .current =
            setInterval(
              () => {
                const startedAt =
                  recordingStartedAtRef
                    .current;

                if (
                  startedAt
                ) {
                  setDurationMs(
                    Date.now() -
                      startedAt
                  );
                }
              },
              250
            );

          maxDurationTimerRef
            .current =
            setTimeout(
              () => {
                stopRecording();
              },
              MAX_RECORDING_MS
            );
        } catch (
          startError
        ) {
          cleanupTimers();

          await cleanupAudioAnalysis();

          cleanupMediaStream();

          mediaRecorderRef
            .current =
            null;

          const resolvedError =
            resolveRecorderError(
              startError
            );

          setStatus(
            resolvedError
              .code ===
              "unsupported"
              ? "unsupported"
              : "error"
          );

          setError(
            resolvedError
          );
        }
      },
      [
        cleanupAudioAnalysis,
        cleanupMediaStream,
        cleanupTimers,
        durationMs,
        startAudioAnalysis,
        status,
        stopRecording,
      ]
    );

  const resetRecording =
    useCallback(
      () => {
        const recorder =
          mediaRecorderRef
            .current;

        if (
          recorder &&
          recorder.state !==
            "inactive"
        ) {
          recorder.stop();
        }

        cleanupTimers();

        void cleanupAudioAnalysis();

        cleanupMediaStream();

        mediaRecorderRef
          .current =
          null;

        recordedChunksRef
          .current =
          [];

        recordingStartedAtRef
          .current =
          null;

        setRecordedAudio(
          null
        );

        setDurationMs(
          0
        );

        setAudioLevel(
          0
        );

        setError(
          null
        );

        setStatus(
          "idle"
        );
      },
      [
        cleanupAudioAnalysis,
        cleanupMediaStream,
        cleanupTimers,
      ]
    );

  useEffect(
    () => {
      return () => {
        const recorder =
          mediaRecorderRef
            .current;

        if (
          recorder &&
          recorder.state !==
            "inactive"
        ) {
          try {
            recorder.stop();
          } catch {
            // Component cleanup only.
          }
        }

        cleanupTimers();

        void cleanupAudioAnalysis();

        cleanupMediaStream();
      };
    },
    [
      cleanupAudioAnalysis,
      cleanupMediaStream,
      cleanupTimers,
    ]
  );

  return {
    status,

    isRecording:
      status ===
      "recording",

    isReady:
      status ===
      "ready" &&
      recordedAudio !==
        null,

    durationMs,

    audioLevel,

    recordedAudio,

    error,

    startRecording,

    stopRecording,

    resetRecording,
  };
}