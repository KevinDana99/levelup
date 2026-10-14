import { z } from 'zod';

export const ConfirmMealResponseSchema = z.object({
  mealId: z.string().uuid(),
  createdAt: z.string().datetime(),
  totalNutrition: z.object({
    calories: z.number(),
    protein: z.number(),
    carbohydrates: z.number(),
    fat: z.number(),
  }),
});

export type ConfirmMealResponseDTO = z.infer<typeof ConfirmMealResponseSchema>;
