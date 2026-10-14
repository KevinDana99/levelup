import type { AIRequestDTO, AIResponseDTO } from "./AIContracts.ts";

const GEMINI_API_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

type GeminiPart = {
  text?: string;
  [key: string]: unknown;
};

type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

type GeminiResponse = {
  candidates?: Array<{
    content?: GeminiContent;
    finishReason?: string;
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

function getRequiredApiKey() {
  const apiKey = Deno.env.get("GEMINI_API_KEY")?.trim();

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY Supabase secret");
  }

  return apiKey;
}

function getModel() {
  return Deno.env.get("GEMINI_MODEL")?.trim() || DEFAULT_GEMINI_MODEL;
}

function createInitialContent(input: AIRequestDTO): GeminiContent {
  const parts: GeminiPart[] = [];

  if (input.image) {
    parts.push({
      inlineData: {
        mimeType: input.image.mimeType,
        data: input.image.data,
      },
    });
  }

  parts.push({ text: input.prompt });

  return { role: "user", parts };
}

async function generateContent(
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(
    `${GEMINI_API_BASE_URL}/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    },
  );

  const responseBody = await response.text();
  let payload: GeminiResponse;

  try {
    payload = JSON.parse(responseBody) as GeminiResponse;
  } catch {
    throw new Error(
      `Gemini returned an invalid response (HTTP ${response.status})`,
    );
  }

  if (!response.ok) {
    const detail = payload.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`Gemini request failed: ${detail}`);
  }

  const content = payload.candidates?.[0]?.content;

  if (!content?.parts?.length) {
    const finishReason = payload.candidates?.[0]?.finishReason;
    throw new Error(
      `Gemini returned no content${finishReason ? ` (${finishReason})` : ""}`,
    );
  }

  return content;
}

export async function handleGeminiAIService(
  input: AIRequestDTO,
): Promise<AIResponseDTO> {
  if (!input.prompt.trim()) {
    throw new Error("AI prompt cannot be empty");
  }

  if (input.image && (!input.image.mimeType.trim() || !input.image.data)) {
    throw new Error("AI image requires mimeType and Base64 data");
  }

  if (input.image && !input.image.mimeType.startsWith("image/")) {
    throw new Error("AI image mimeType must start with image/");
  }

  const content = await generateContent(getRequiredApiKey(), getModel(), {
    contents: [createInitialContent(input)],
    ...(input.systemInstruction
      ? { systemInstruction: { parts: [{ text: input.systemInstruction }] } }
      : {}),
  });
  const text = content.parts
    .flatMap((part) => typeof part.text === "string" ? [part.text] : [])
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Gemini returned no text content");
  }

  return { text };
}
