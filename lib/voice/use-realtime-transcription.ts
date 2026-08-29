"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";
type RealtimeStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "stopping"
  | "error";

type UseRealtimeTranscriptionOptions = {
  onTranscript?: (
    transcript: string
  ) => void;

  onError?: (
    message: string
  ) => void;
};

type RealtimeServerEvent = {
  type?: string;
  transcript?: string;
  delta?: string;
};

export function useRealtimeTranscription(
  options: UseRealtimeTranscriptionOptions = {}
) {
  const {
    onTranscript,
    onError,
  } = options;

  const [
    status,
    setStatus,
  ] =
    useState<RealtimeStatus>(
      "idle"
    );

  const [
    liveTranscript,
    setLiveTranscript,
  ] =
    useState("");

  const peerConnectionRef =
    useRef<RTCPeerConnection | null>(
      null
    );

  const dataChannelRef =
    useRef<RTCDataChannel | null>(
      null
    );

  const mediaStreamRef =
    useRef<MediaStream | null>(
      null
    );

  const stopInternal =
    useCallback(() => {
      dataChannelRef.current
        ?.close();

      dataChannelRef.current =
        null;

      peerConnectionRef.current
        ?.close();

      peerConnectionRef.current =
        null;

      mediaStreamRef.current
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      mediaStreamRef.current =
        null;
    }, []);

 const stop =
  useCallback(() => {
    setStatus(
      "stopping"
    );

    mediaStreamRef.current
      ?.getAudioTracks()
      .forEach(
        (track) => {
          track.enabled =
            false;
        }
      );

    window.setTimeout(
      () => {
        stopInternal();

        setStatus(
          "idle"
        );
      },
      3000
    );
  }, [
    stopInternal,
  ]);

  const start =
    useCallback(
      async () => {
        if (
          status ===
            "connecting" ||
          status ===
            "listening"
        ) {
          return;
        }

        setStatus(
          "connecting"
        );

        setLiveTranscript(
          ""
        );

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

          mediaStreamRef.current =
            stream;

            if (
  process.env.NODE_ENV ===
  "development"
) {
  const audioContext =
    new AudioContext();

  const source =
    audioContext
      .createMediaStreamSource(
        stream
      );

  const analyser =
    audioContext
      .createAnalyser();

  analyser.fftSize =
    2048;

  source.connect(
    analyser
  );

  const samples =
    new Float32Array(
      analyser.fftSize
    );

  let checks =
    0;

  const interval =
    window.setInterval(
      () => {
        analyser
          .getFloatTimeDomainData(
            samples
          );

        let sumSquares =
          0;

        let peak =
          0;

        for (
          const sample of samples
        ) {
          const absolute =
            Math.abs(
              sample
            );

          peak =
            Math.max(
              peak,
              absolute
            );

          sumSquares +=
            sample *
            sample;
        }

        const rms =
          Math.sqrt(
            sumSquares /
              samples.length
          );

        console.log(
          "[VOICE LOCAL AUDIO LEVEL]",
          {
            rms:
              Number(
                rms.toFixed(
                  5
                )
              ),

            peak:
              Number(
                peak.toFixed(
                  5
                )
              ),

            trackLabel:
              stream
                .getAudioTracks()[0]
                ?.label,

            enabled:
              stream
                .getAudioTracks()[0]
                ?.enabled,

            muted:
              stream
                .getAudioTracks()[0]
                ?.muted,
          }
        );

        checks +=
          1;

        if (
          checks >=
          5
        ) {
          window.clearInterval(
            interval
          );

          source.disconnect();

          void audioContext.close();
        }
      },
      1000
    );
}
          const peerConnection =
            new RTCPeerConnection();

          peerConnectionRef.current =
            peerConnection;

          stream
            .getAudioTracks()
            .forEach(
              (track) => {
                peerConnection.addTrack(
                  track,
                  stream
                );
              }
            );

          const dataChannel =
            peerConnection
              .createDataChannel(
                "oai-events"
              );

          dataChannelRef.current =
            dataChannel;
dataChannel.onopen =
  () => {
    if (
  process.env.NODE_ENV ===
  "development"
) {
  console.log(
    "[VOICE REALTIME CONNECTED]",
    {
      readyState:
        dataChannel.readyState,

      peerConnectionState:
        peerConnection
          .connectionState,

      iceConnectionState:
        peerConnection
          .iceConnectionState,
    }
  );
}

    dataChannel.send(
      JSON.stringify({
        event_id:
          `organheal_voice_${Date.now()}`,

        type:
          "session.update",

        session: {
          type:
            "realtime",

          output_modalities: [
            "text",
          ],

          audio: {
            input: {
              noise_reduction: {
                type:
                  "far_field",
              },

              transcription: {
                model:
                  "gpt-4o-transcribe",

                prompt:
                  "Accurately transcribe the user's speech. The speaker may use English, Arabic, or a mixture of both. Preserve medical terms, medication names, laboratory names, abbreviations, and numbers accurately.",
              },

              turn_detection: {
                type:
                  "server_vad",

                threshold:
                  0.5,

                prefix_padding_ms:
                  300,

                silence_duration_ms:
                  700,

                create_response:
                  false,

                interrupt_response:
                  false,
              },
            },
          },
        },
      })
    );
  };
  window.setTimeout(
  async () => {
    const sender =
      peerConnection
        .getSenders()
        .find(
          (
            candidate
          ) =>
            candidate.track
              ?.kind ===
            "audio"
        );

    const track =
      sender
        ?.track;

    const stats =
  await peerConnection
    .getStats(
      track ?? null
    );

    let bytesSent =
      0;

    let packetsSent =
      0;

    stats.forEach(
      (
        report
      ) => {
        if (
          report.type ===
            "outbound-rtp" &&
          report.kind ===
            "audio"
        ) {
          bytesSent =
            Number(
              report.bytesSent ??
              0
            );

          packetsSent =
            Number(
              report.packetsSent ??
              0
            );
        }
      }
    );

    if (
  process.env.NODE_ENV ===
  "development"
) {
  console.log(
    "[VOICE AUDIO OUTBOUND]",
    {
      trackEnabled:
        track
          ?.enabled,

      trackMuted:
        track
          ?.muted,

      readyState:
        track
          ?.readyState,

      label:
        track
          ?.label,

      bytesSent,

      packetsSent,
    }
  );
}
  },
  3000
);
          dataChannel.onmessage =
            (
              event
            ) => {
              try {
                const payload =
                  JSON.parse(
                    event.data
                  ) as RealtimeServerEvent;

               if (
  payload.type ===
    "conversation.item.input_audio_transcription.delta" &&
  typeof payload.delta ===
    "string"
) {
if (
  process.env.NODE_ENV ===
  "development"
) {
  console.log(
    "[VOICE REALTIME EVENT]",
    payload
  );
}
  setLiveTranscript(
    (
      current
    ) =>
      current +
      payload.delta
  );

  return;
}

if (
  payload.type ===
    "conversation.item.input_audio_transcription.completed" &&
  typeof payload.transcript ===
    "string"
) {
  const transcript =
    payload.transcript.trim();

  if (
  transcript
) {

  setLiveTranscript(
    transcript
  );

  onTranscript?.(
    transcript
  );

  stopInternal();

  setStatus(
    "idle"
  );
}

  return;
}

if (
  payload.type ===
  "conversation.item.input_audio_transcription.failed"
) {
  if (
  process.env.NODE_ENV ===
  "development"
) {
  console.error(
    "[VOICE REALTIME TRANSCRIPTION FAILED]",
    payload
  );
}

  return;
}

if (
  payload.type ===
  "error"
) {
  if (
  process.env.NODE_ENV ===
  "development"
) {
  console.error(
    "[VOICE REALTIME ERROR]",
    payload
  );
}
}
              } catch {
                // Ignore unrelated
                // realtime events.
              }
            };

          dataChannel.onerror =
  (event) => {
    if (
      process.env.NODE_ENV ===
      "development"
    ) {
      console.error(
        "[VOICE REALTIME DATA CHANNEL ERROR]",
        event
      );
    }

    dataChannel.onclose =
      () => {
        if (
          process.env.NODE_ENV ===
          "development"
        ) {
          console.log(
            "[VOICE REALTIME DATA CHANNEL CLOSED]"
          );
        }
      };
              setStatus(
                "error"
              );

              onError?.(
                "Realtime voice connection failed."
              );
            };

          const offer =
  await peerConnection
    .createOffer();

await peerConnection
  .setLocalDescription(
    offer
  );

if (
  peerConnection
    .iceGatheringState !==
  "complete"
) {
  await new Promise<void>(
    (
      resolve
    ) => {
      const handleIceGatheringStateChange =
        () => {
          if (
            peerConnection
              .iceGatheringState ===
            "complete"
          ) {
            peerConnection
              .removeEventListener(
                "icegatheringstatechange",
                handleIceGatheringStateChange
              );

            resolve();
          }
        };

      peerConnection
        .addEventListener(
          "icegatheringstatechange",
          handleIceGatheringStateChange
        );

      setTimeout(
        () => {
          peerConnection
            .removeEventListener(
              "icegatheringstatechange",
              handleIceGatheringStateChange
            );

          resolve();
        },
        5000
      );
    }
  );
}

const localSdp =
  peerConnection
    .localDescription
    ?.sdp;

if (
  !localSdp ||
  !localSdp.startsWith(
    "v=0"
  ) ||
  !localSdp.includes(
    "m=audio"
  )
) {
  throw new Error(
    "The browser did not create a valid realtime SDP offer."
  );
}

if (
  process.env.NODE_ENV ===
  "development"
) {
  console.log(
    "[VOICE SDP READY]",
    {
      length:
        localSdp.length,

      iceGatheringState:
        peerConnection
          .iceGatheringState,

      hasAudio:
        localSdp.includes(
          "m=audio"
        ),

      hasDataChannel:
        localSdp.includes(
          "m=application"
        ),
    }
  );
}

          if (
            !localSdp
          ) {
            throw new Error(
              "Could not create the realtime SDP offer."
            );
          }

          const {
            data:
              sessionData,
            error:
              sessionError,
          } =
            await supabase.auth
              .getSession();

          if (
            sessionError
          ) {
            throw new Error(
              sessionError.message
            );
          }

          const accessToken =
            sessionData
              .session
              ?.access_token;

          if (!accessToken) {
            throw new Error(
              "Your session has expired. Please log in again."
            );
          }

          const response =
            await fetch(
              "/api/voice/realtime",
              {
                method:
                  "POST",

                headers: {
                  Authorization:
                    `Bearer ${accessToken}`,

                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    sdp:
                      localSdp,

                    microphoneType:
                      "far_field",
                  }),
              }
            );

          if (
            !response.ok
          ) {
            const payload =
              await response
                .json()
                .catch(
                  () =>
                    null
                );

            throw new Error(
              payload?.error ||
                "Could not start realtime voice."
            );
          }

          const answerSdp =
            await response.text();

          await peerConnection
            .setRemoteDescription({
              type:
                "answer",

              sdp:
                answerSdp,
            });

          setStatus(
            "listening"
          );
        } catch (
          error
        ) {
          stopInternal();

          setStatus(
            "error"
          );

          const message =
            error instanceof
            Error
              ? error.message
              : "Could not start realtime voice.";

          onError?.(
            message
          );
        }
      },
      [
        onError,
        onTranscript,
        status,
        stopInternal,
      ]
    );

  useEffect(
    () => {
      return () => {
        stopInternal();
      };
    },
    [
      stopInternal,
    ]
  );

  return {
    status,
    liveTranscript,

    isConnecting:
      status ===
      "connecting",

    isListening:
      status ===
      "listening",

    start,
    stop,
  };
}