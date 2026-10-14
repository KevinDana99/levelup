export type AIRequestDTO = {
  prompt: string;
  systemInstruction?: string;

  image?: {
    mimeType: string;
    data: string;
  };
};

export type AIResponseDTO = {
  text: string;
};

export type HandleAIService = (
  input: AIRequestDTO,
) => Promise<AIResponseDTO>;
