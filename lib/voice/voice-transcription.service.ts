export type VoiceTranscriptionLanguage =
  | "en"
  | "ar";

export type VoiceTranscriptionInput = {
  audio:
    File;

  language:
    VoiceTranscriptionLanguage;

  signal?:
    AbortSignal;
};

export type VoiceTranscriptionResult = {
  transcript:
    string;

  model:
    string;
};

type OpenAITranscriptionResponse = {
  text?:
    unknown;
};

const DEFAULT_TRANSCRIPTION_MODEL =
  "gpt-4o-transcribe";

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

function getTranscriptionModel():
  string {
  return (
    process.env
      .OPENAI_TRANSCRIPTION_MODEL
      ?.trim() ||
    DEFAULT_TRANSCRIPTION_MODEL
  );
}

function resolveFileExtension(
  mimeType:
    string
): string {
  const normalized =
    mimeType
      .toLowerCase();

  if (
    normalized.includes(
      "webm"
    )
  ) {
    return "webm";
  }

  if (
    normalized.includes(
      "mp4"
    ) ||
    normalized.includes(
      "m4a"
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

export async function transcribeVoice({
  audio,
  language,
  signal,
}: VoiceTranscriptionInput):
  Promise<
    VoiceTranscriptionResult
  > {
  if (
    !(audio instanceof File) ||
    audio.size <=
      0
  ) {
    throw new Error(
      "A valid audio file is required."
    );
  }

  const apiKey =
    getOpenAIApiKey();

  const model =
    getTranscriptionModel();

  const extension =
    resolveFileExtension(
      audio.type
    );

  const fileName =
    audio.name?.trim() ||
    `organheal-voice.${extension}`;

  const formData =
    new FormData();

  formData.append(
    "file",
    audio,
    fileName
  );

  formData.append(
    "model",
    model
  );

   const response =
    await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,
        },

        body:
          formData,

        signal,
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `Voice transcription provider returned status ${response.status}.`
    );
  }

  const result =
    (await response.json()) as
      OpenAITranscriptionResponse;

  if (
    typeof result.text !==
      "string" ||
    !result.text.trim()
  ) {
    throw new Error(
      "Voice transcription provider returned an empty transcript."
    );
  }

  return {
    transcript:
      result.text.trim(),

    model,
  };
}