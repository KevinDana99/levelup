import type { AIRequestDTO, AIResponseDTO } from "./AIContracts.ts";

const GROQ_CHAT_COMPLETIONS_URL =
  "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "qwen/qwen3.8-27b";

type GroqTextContent = {
  type: "text";
  text: string;
};

type GroqImageContent = {
  type: "image_url";
  image_url: {
    url: string;
  };
};

type GroqMessage = {
  role: "system" | "user";
  content: string | Array<GroqTextContent | GroqImageContent>;
};

type GroqResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
    finish_reason?: string;
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

function getRequiredApiKey() {
  const apiKey = Deno.env.get("GROQ_API_KEY")?.trim();

  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY Supabase secret");
  }

  return apiKey;
}

function getModel() {
  return Deno.env.get("GROQ_MODEL")?.trim() || DEFAULT_GROQ_MODEL;
}

function createMessages(input: AIRequestDTO): GroqMessage[] {
  const messages: GroqMessage[] = [];

  if (input.systemInstruction) {
    messages.push({ role: "system", content: input.systemInstruction });
  }

  messages.push({
    role: "user",
    content: input.image
      ? [
        { type: "text", text: input.prompt },
        {
          type: "image_url",
          image_url: {
            url: `data:${input.image.mimeType};base64,${input.image.data}`,
          },
        },
      ]
      : input.prompt,
  });

  return messages;
}

async function createChatCompletion(
  apiKey: string,
  model: string,
  messages: GroqMessage[],
) {
  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_completion_tokens: 600,
      temperature: 0.1,
    }),
  });

  const responseBody = await response.text();
  let payload: GroqResponse;

  try {
    payload = JSON.parse(responseBody) as GroqResponse;
  } catch {
    throw new Error(
      `Groq returned an invalid response (HTTP ${response.status})`,
    );
  }

  if (!response.ok) {
    const detail = payload.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`Groq request failed: ${detail}`);
  }

  const choice = payload.choices?.[0];
  const text = choice?.message?.content?.trim();

  if (!text) {
    throw new Error(
      `Qwen returned no text content${
        choice?.finish_reason ? ` (${choice.finish_reason})` : ""
      }`,
    );
  }

  return text;
}

export async function handleAIService(
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

  const text = await createChatCompletion(
    getRequiredApiKey(),
    getModel(),
    createMessages(input),
  );

  return { text };
}

export type { HandleAIService } from "./AIContracts.ts";
