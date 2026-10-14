import { z } from "zod";

export const FindByFoodOutputSchema = z.object({
  name: z.string().min(1),
  estimatedGrams: z.number().positive(),

  nutrition: z.object({
    calories: z.number().nonnegative(),
    protein: z.number().nonnegative(),
    carbohydrates: z.number().nonnegative(),
    fat: z.number().nonnegative(),
  }),

  source: z.enum(["USDA", "OFF", "GEMINI"]),
  isEstimated: z.boolean(),
});

export type FindByFoodOutputDTO = z.infer<typeof FindByFoodOutputSchema>;
