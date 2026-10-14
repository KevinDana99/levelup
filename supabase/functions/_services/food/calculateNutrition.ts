import type { NutritionDTO } from "../../_shared/dtos/NutritionDTO.ts";

function scale(value: number, factor: number) {
  return Math.round(value * factor * 100) / 100;
}

export function calculateNutrition(
  nutritionPer100Grams: NutritionDTO,
  estimatedGrams: number,
): NutritionDTO {
  const factor = estimatedGrams / 100;

  return {
    calories: scale(nutritionPer100Grams.calories, factor),
    protein: scale(nutritionPer100Grams.protein, factor),
    carbohydrates: scale(nutritionPer100Grams.carbohydrates, factor),
    fat: scale(nutritionPer100Grams.fat, factor),
  };
}
