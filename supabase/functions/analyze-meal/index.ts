import { handleAIService } from "../_services/ai/handleAIService.ts";
import { AnalyzeMealRequestSchema } from "./dtos/AnalyzeMealRequestDTO.ts";
import { AnalyzeMealResponseSchema } from "./dtos/AnalyzeMealResponseDTO.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function detectImageMimeType(imageBase64: string) {
  if (imageBase64.startsWith("iVBORw0KGgo")) return "image/png";
  if (imageBase64.startsWith("UklGR")) return "image/webp";
  if (imageBase64.startsWith("R0lGOD")) return "image/gif";

  return "image/jpeg";
}

function parseAIResponse(text: string) {
  const withoutCodeFence = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const objectStart = withoutCodeFence.indexOf("{");
  const objectEnd = withoutCodeFence.lastIndexOf("}");

  if (objectStart === -1 || objectEnd < objectStart) {
    throw new Error("Gemini response does not contain a JSON object");
  }

  return JSON.parse(withoutCodeFence.slice(objectStart, objectEnd + 1));
}

function createAnalysisPrompt(plateSize: "small" | "medium" | "large") {
  return `
Analizá la comida visible en la imagen. El tamaño informado del plato es: ${plateSize}.

Estimá cada alimento, su peso en gramos, el nivel de confianza entre 0 y 1 y sus
valores nutricionales para la porción observada. Calculá el total de toda la comida.

Respondé únicamente con JSON válido y exactamente con esta estructura:
{
  "foods": [
    {
      "name": "string",
      "estimatedGrams": 0,
      "confidence": 0,
      "nutrition": {
        "calories": 0,
        "protein": 0,
        "carbohydrates": 0,
        "fat": 0
      }
    }
  ],
  "totalNutrition": {
    "calories": 0,
    "protein": 0,
    "carbohydrates": 0,
    "fat": 0
  }
}

Todos los valores nutricionales deben ser números no negativos. No agregues texto,
Markdown ni propiedades fuera de esta estructura.
  `.trim();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const requestBody = await request.json();
    const parsedRequest = AnalyzeMealRequestSchema.safeParse(requestBody);

    if (!parsedRequest.success) {
      return jsonResponse(
        {
          error: "Invalid analyze-meal request",
          issues: parsedRequest.error.flatten(),
        },
        400,
      );
    }

    const { image, plateSize } = parsedRequest.data;
    const aiResponse = await handleAIService({
      prompt: createAnalysisPrompt(plateSize),
      systemInstruction: [
        "Sos un especialista en reconocimiento visual de alimentos y nutrición.",
        "Priorizá estimaciones realistas y cumplí estrictamente el formato solicitado.",
      ].join(" "),
      image: {
        mimeType: detectImageMimeType(image),
        data: image,
      },
    });
    const response = AnalyzeMealResponseSchema.parse(
      parseAIResponse(aiResponse.text),
    );

    return jsonResponse(response);
  } catch (error) {
    console.error("analyze-meal failed", error);
    return jsonResponse({ error: "Unable to analyze meal" }, 500);
  }
});
