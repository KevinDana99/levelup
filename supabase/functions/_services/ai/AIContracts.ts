export type AIJsonSchema = {
  type: string;
  description?: string;
  properties?: Record<string, AIJsonSchema>;
  required?: string[];
  items?: AIJsonSchema;
  enum?: Array<string | number | boolean>;
  [key: string]: unknown;
};

export type AITool = {
  name: string;
  description: string;
  parameters: AIJsonSchema;
  handler: (args: Record<string, unknown>) => unknown | Promise<unknown>;
};

export type AIRequestDTO = {
  prompt: string;
  systemInstruction?: string;

  image?: {
    mimeType: string;
    data: string;
  };

  tools?: AITool[];
};

export type AIResponseDTO = {
  text: string;
  functionCalls?: {
    name: string;
    args: Record<string, unknown>;
    result: unknown;
  }[];
};

export type HandleAIService = (
  input: AIRequestDTO,
) => Promise<AIResponseDTO>;
