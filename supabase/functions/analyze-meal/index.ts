import { handleAIService } from "../_services/ai/handleAIService.ts";
import { AnalyzeMealRequestSchema } from "./dtos/AnalyzeMealRequestDTO.ts";
import { AnalyzeMealResponseSchema } from "./dtos/AnalyzeMealResponseDTO.ts";
import { handleFindByFood } from "./tools/handleFindByFood.ts";
import { NutritionSchema } from "../_shared/dtos/NutritionDTO.ts";
import { z } from "zod";

const DetectedFoodsSchema = z.object({
  foods: z.array(z.object({
    name: z.string().trim().min(1),
    searchName: z.string().trim().min(1),
    estimatedGrams: z.number().positive(),
    confidence: z.number().min(0).max(1),
    estimatedNutritionPer100Grams: NutritionSchema,
  })).min(1),
});

const EXTERNAL_LOOKUP_TIMEOUT_MS = 30_000;

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
    throw new Error("AI response does not contain a JSON object");
  }

  return JSON.parse(withoutCodeFence.slice(objectStart, objectEnd + 1));
}

function createAnalysisPrompt(plateSize: "small" | "medium" | "large") {
  return `
Analizá la comida visible en la imagen. El tamaño informado del plato es: ${plateSize}.

Identificá cada alimento visible y estimá su peso en gramos y el nivel de confianza
entre 0 y 1. Para cada alimento generá también un nombre de búsqueda específico en
inglés y compatible con USDA, incluyendo el método de cocción cuando sea visible.
Estimá además sus valores nutricionales por cada 100 gramos. Esa estimación se usará
únicamente como fallback si las fuentes nutricionales externas no responden.

Respondé únicamente con JSON válido y exactamente con esta estructura:
{
  "foods": [
    {
      "name": "nombre visible del alimento en español",
      "searchName": "specific USDA search name in English",
      "estimatedGrams": 0,
      "confidence": 0,
      "estimatedNutritionPer100Grams": {
        "calories": 0,
        "protein": 0,
        "carbohydrates": 0,
        "fat": 0
      }
    }
  ]
}

No agregues texto, Markdown ni propiedades fuera de esta estructura.
  `.trim();
}

function roundNutrition(value: number) {
  return Math.round(value * 100) / 100;
}

async function enrichDetectedFoods(input: unknown) {
  const detected = DetectedFoodsSchema.parse(input);
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    EXTERNAL_LOOKUP_TIMEOUT_MS,
  );
  const foods = await Promise.all(
    detected.foods.map(async (food) => {
      const nutrition = await handleFindByFood(
        {
          name: food.searchName,
          estimatedGrams: food.estimatedGrams,
          estimatedNutritionPer100Grams: food.estimatedNutritionPer100Grams,
        },
        controller.signal,
      );

      return {
        name: food.name,
        estimatedGrams: food.estimatedGrams,
        confidence: food.confidence,
        nutrition: nutrition.nutrition,
        source: nutrition.source,
        isEstimated: nutrition.isEstimated,
      };
    }),
  ).finally(() => clearTimeout(timeoutId));

  const totalNutrition = foods.reduce(
    (total, food) => ({
      calories: total.calories + food.nutrition.calories,
      protein: total.protein + food.nutrition.protein,
      carbohydrates: total.carbohydrates + food.nutrition.carbohydrates,
      fat: total.fat + food.nutrition.fat,
    }),
    { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
  );

  return AnalyzeMealResponseSchema.parse({
    foods,
    totalNutrition: {
      calories: roundNutrition(totalNutrition.calories),
      protein: roundNutrition(totalNutrition.protein),
      carbohydrates: roundNutrition(totalNutrition.carbohydrates),
      fat: roundNutrition(totalNutrition.fat),
    },
  });
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
        "Sos un especialista en reconocimiento visual de alimentos.",
        "Priorizá estimaciones realistas y cumplí estrictamente el formato solicitado.",
      ].join(" "),
      image: {
        mimeType: detectImageMimeType(image),
        data: image,
      },
    });
    const response = await enrichDetectedFoods(
      parseAIResponse(aiResponse.text),
    );

    return jsonResponse(response);
  } catch (error) {
    console.error("analyze-meal failed", error);
    const detail = error instanceof Error
      ? error.message
      : "Unknown analyze-meal error";

    return jsonResponse(
      {
        error: "Unable to analyze meal",
        detail,
      },
      500,
    );
  }
});
