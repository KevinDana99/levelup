import { z } from "zod";
import { NutritionSchema } from "../../../_shared/dtos/NutritionDTO.ts";

export const FindByFoodInputSchema = z.object({
  name: z.string().trim().min(1),
  estimatedGrams: z.number().positive(),
  estimatedNutritionPer100Grams: NutritionSchema,
});

export type FindByFoodInputDTO = z.infer<typeof FindByFoodInputSchema>;
