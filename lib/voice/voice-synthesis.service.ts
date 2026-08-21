export type VoiceSynthesisLanguage =
  | "en"
  | "ar";

export type VoiceSynthesisInput = {
  text:
    string;

  language:
    VoiceSynthesisLanguage;

  signal?:
    AbortSignal;
};

export type VoiceSynthesisResult = {
  audio:
    ArrayBuffer;

  model:
    string;

  voice:
    string;

  contentType:
    "audio/mpeg";
};

const DEFAULT_SYNTHESIS_MODEL =
  "gpt-4o-mini-tts";

const DEFAULT_SYNTHESIS_VOICE =
  "alloy";

const MAX_SYNTHESIS_TEXT_LENGTH =
  4000;

function getOpenAIApiKey():
  string {
  const apiKey =
    process.env
      .OPENAI_API_KEY
      ?.trim();

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured."
    );
  }

  return apiKey;
}

function getSynthesisModel():
  string {
  return (
    process.env
      .OPENAI_TTS_MODEL
      ?.trim() ||
    DEFAULT_SYNTHESIS_MODEL
  );
}

function getSynthesisVoice():
  string {
  return (
    process.env
      .OPENAI_TTS_VOICE
      ?.trim() ||
    DEFAULT_SYNTHESIS_VOICE
  );
}

function getVoiceInstructions(
  language:
    VoiceSynthesisLanguage
): string {
  if (
    language ===
    "ar"
  ) {
    return [
      "Speak in clear Modern Standard Arabic.",
      "Use a calm, professional, reassuring healthcare tone.",
      "Pronounce medical terms, numbers, and measurements carefully.",
      "Do not sound dramatic or overly emotional.",
    ].join(" ");
  }

  return [
    "Speak in clear natural English.",
    "Use a calm, professional, reassuring healthcare tone.",
    "Pronounce medical terms, numbers, and measurements carefully.",
    "Do not sound dramatic or overly emotional.",
  ].join(" ");
}

export async function synthesizeVoice({
  text,
  language,
  signal,
}: VoiceSynthesisInput):
  Promise<
    VoiceSynthesisResult
  > {
  const normalizedText =
    text.trim();

  if (!normalizedText) {
    throw new Error(
      "Text is required for voice synthesis."
    );
  }

  if (
    normalizedText.length >
    MAX_SYNTHESIS_TEXT_LENGTH
  ) {
    throw new Error(
      `Voice synthesis text must not exceed ${MAX_SYNTHESIS_TEXT_LENGTH} characters.`
    );
  }

  const apiKey =
    getOpenAIApiKey();

  const model =
    getSynthesisModel();

  const voice =
    getSynthesisVoice();

  const response =
    await fetch(
      "https://api.openai.com/v1/audio/speech",
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            model,

            voice,

            input:
              normalizedText,

            instructions:
              getVoiceInstructions(
                language
              ),

            response_format:
              "mp3",
          }),

        signal,
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `Voice synthesis provider returned status ${response.status}.`
    );
  }

  const audio =
    await response.arrayBuffer();

  if (
    audio.byteLength <=
    0
  ) {
    throw new Error(
      "Voice synthesis provider returned empty audio."
    );
  }

  return {
    audio,

    model,

    voice,

    contentType:
      "audio/mpeg",
  };
}