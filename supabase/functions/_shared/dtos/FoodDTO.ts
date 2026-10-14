import { z } from "zod";

import { NutritionSchema } from "./NutritionDTO.ts";

export const FoodSchema = z.object({
  name: z.string().min(1),
  estimatedGrams: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  nutrition: NutritionSchema,
  source: z.enum(["USDA", "OFF", "GEMINI"]),
  isEstimated: z.boolean(),
});

export type FoodDTO = z.infer<typeof FoodSchema>;
