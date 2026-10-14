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

async function findNutrition(name: string, signal: AbortSignal) {
  try {
    const usdaFood = await searchUSDA(name, signal);

    if (usdaFood) return { ...usdaFood, source: "USDA" as const };
  } catch (error) {
    console.warn("USDA food search failed; using OFF fallback", error);
  }

  try {
    const openFoodFactsFood = await searchOpenFoodFacts(name, signal);

    if (openFoodFactsFood) {
      return { ...openFoodFactsFood, source: "OFF" as const };
    }
  } catch (error) {
    console.warn("OFF food search failed", error);
  }

  return null;
}

export async function handleFindByFood(
  input: unknown,
  signal: AbortSignal,
): Promise<FindByFoodOutputDTO> {
  const { name, estimatedGrams, estimatedNutritionPer100Grams } =
    FindByFoodInputSchema.parse(input);
  const externalFood = await findNutrition(name, signal);
  const food = externalFood ?? {
    name,
    nutritionPer100Grams: estimatedNutritionPer100Grams,
    source: "GEMINI" as const,
  };

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
