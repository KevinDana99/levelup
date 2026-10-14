import { handleAIService } from "../../_services/ai/handleAIService.ts";
import { calculateNutrition } from "../../_services/food/calculateNutrition.ts";
import {
  FindByFoodInputSchema,
} from "../../_services/food/dtos/FindByFoodInputDTO.ts";
import {
  type FindByFoodOutputDTO,
  FindByFoodOutputSchema,
} from "../../_services/food/dtos/FindByFoodOutputDTO.ts";
import { searchOpenFoodFacts } from "../../_services/food/searchOpenFoodFacts.ts";
import { searchUSDA } from "../../_services/food/searchUSDA.ts";
import { NutritionSchema } from "../../_shared/dtos/NutritionDTO.ts";
import { z } from "zod";

const GeminiFoodEstimateSchema = z.object({
  name: z.string().trim().min(1),
  nutritionPer100Grams: NutritionSchema,
});

function parseJsonObject(text: string) {
  const withoutCodeFence = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const objectStart = withoutCodeFence.indexOf("{");
  const objectEnd = withoutCodeFence.lastIndexOf("}");

  if (objectStart === -1 || objectEnd < objectStart) {
    throw new Error("Gemini food estimate does not contain a JSON object");
  }

  return JSON.parse(withoutCodeFence.slice(objectStart, objectEnd + 1));
}

async function estimateWithGemini(name: string) {
  const response = await handleAIService({
    systemInstruction: [
      "Sos un especialista en composición nutricional de alimentos.",
      "Respondé únicamente con JSON válido y sin Markdown.",
    ].join(" "),
    prompt: `
No se encontró información para "${name}" en USDA FoodData Central ni en
Open Food Facts. Estimá valores nutricionales razonables por cada 100 gramos.

Respondé exactamente con esta estructura:
{
  "name": "nombre normalizado del alimento",
  "nutritionPer100Grams": {
    "calories": 0,
    "protein": 0,
    "carbohydrates": 0,
    "fat": 0
  }
}

Todos los valores nutricionales deben ser números no negativos.
    `.trim(),
  });

  return GeminiFoodEstimateSchema.parse(parseJsonObject(response.text));
}

async function findNutrition(name: string) {
  try {
    const usdaFood = await searchUSDA(name);

    if (usdaFood) return { ...usdaFood, source: "USDA" as const };
  } catch (error) {
    console.warn("USDA food search failed; using OFF fallback", error);
  }

  try {
    const openFoodFactsFood = await searchOpenFoodFacts(name);

    if (openFoodFactsFood) {
      return { ...openFoodFactsFood, source: "OFF" as const };
    }
  } catch (error) {
    console.warn("OFF food search failed; using Gemini fallback", error);
  }

  const geminiFood = await estimateWithGemini(name);
  return { ...geminiFood, source: "GEMINI" as const };
}

export async function handleFindByFood(
  input: unknown,
): Promise<FindByFoodOutputDTO> {
  const { name, estimatedGrams } = FindByFoodInputSchema.parse(input);
  const food = await findNutrition(name);

  return FindByFoodOutputSchema.parse({
    name: food.name,
    estimatedGrams,
    nutrition: calculateNutrition(
      food.nutritionPer100Grams,
      estimatedGrams,
    ),
    source: food.source,
    isEstimated: food.source === "GEMINI",
  });
}
