import type { AIRequestDTO, AIResponseDTO, AITool } from "./AIContracts.ts";

const GEMINI_API_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
const MAX_FUNCTION_CALL_ROUNDS = 8;
const TOOL_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_.:-]{0,127}$/;

type GeminiFunctionCall = {
  id?: string;
  name: string;
  args?: Record<string, unknown>;
};

type GeminiPart = {
  text?: string;
  functionCall?: GeminiFunctionCall;
  thoughtSignature?: string;
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

type ExecutedFunctionCall = NonNullable<AIResponseDTO["functionCalls"]>[number];

function getRequiredApiKey() {
  const apiKey = Deno.env.get("GEMINI_API_KEY");

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

function createToolDeclarations(tools: AITool[]) {
  if (tools.length === 0) return undefined;

  return [{
    functionDeclarations: tools.map(({ name, description, parameters }) => ({
      name,
      description,
      parameters,
    })),
  }];
}

function validateTools(tools: AITool[]) {
  const names = new Set<string>();

  for (const tool of tools) {
    if (!TOOL_NAME_PATTERN.test(tool.name)) {
      throw new Error(`Invalid AI tool name: ${tool.name}`);
    }

    if (names.has(tool.name)) {
      throw new Error(`Duplicate AI tool name: ${tool.name}`);
    }

    if (!tool.description.trim()) {
      throw new Error(`AI tool ${tool.name} requires a description`);
    }

    names.add(tool.name);
  }
}

function asObjectResponse(result: unknown): Record<string, unknown> {
  if (typeof result === "object" && result !== null && !Array.isArray(result)) {
    return result as Record<string, unknown>;
  }

  return { result };
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unknown tool execution error";
}

async function executeFunctionCall(
  functionCall: GeminiFunctionCall,
  toolsByName: Map<string, AITool>,
) {
  const args = functionCall.args ?? {};
  const tool = toolsByName.get(functionCall.name);
  let result: unknown;

  if (!tool) {
    result = { error: `Unknown or unregistered tool: ${functionCall.name}` };
  } else {
    try {
      result = await tool.handler(args);
    } catch (error) {
      result = { error: errorMessage(error) };
    }
  }

  const executedCall: ExecutedFunctionCall = {
    name: functionCall.name,
    args,
    result,
  };

  const responsePart: GeminiPart = {
    functionResponse: {
      ...(functionCall.id ? { id: functionCall.id } : {}),
      name: functionCall.name,
      response: asObjectResponse(result),
    },
  };

  return { executedCall, responsePart };
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

  const apiKey = getRequiredApiKey();
  const model = getModel();
  const tools = input.tools ?? [];
  validateTools(tools);
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  const toolDeclarations = createToolDeclarations(tools);
  const contents: GeminiContent[] = [createInitialContent(input)];
  const functionCalls: ExecutedFunctionCall[] = [];

  for (let round = 0; round <= MAX_FUNCTION_CALL_ROUNDS; round += 1) {
    const content = await generateContent(apiKey, model, {
      contents,
      ...(input.systemInstruction
        ? { systemInstruction: { parts: [{ text: input.systemInstruction }] } }
        : {}),
      ...(toolDeclarations ? { tools: toolDeclarations } : {}),
    });

    const requestedCalls = content.parts.flatMap((part) =>
      part.functionCall ? [part.functionCall] : []
    );

    if (requestedCalls.length === 0) {
      const text = content.parts
        .flatMap((part) => typeof part.text === "string" ? [part.text] : [])
        .join("\n")
        .trim();

      return {
        text,
        ...(functionCalls.length > 0 ? { functionCalls } : {}),
      };
    }

    if (round === MAX_FUNCTION_CALL_ROUNDS) {
      throw new Error("Gemini exceeded the maximum function-call rounds");
    }

    const executed = await Promise.all(
      requestedCalls.map((functionCall) =>
        executeFunctionCall(functionCall, toolsByName)
      ),
    );

    functionCalls.push(...executed.map(({ executedCall }) => executedCall));
    contents.push(content);
    contents.push({
      role: "user",
      parts: executed.map(({ responsePart }) => responsePart),
    });
  }

  throw new Error("Gemini function-call loop ended unexpectedly");
}

export type { HandleAIService } from "./AIContracts.ts";
