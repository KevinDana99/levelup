import { z } from 'zod';

const NutritionSchema = z.object({
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbohydrates: z.number().nonnegative(),
  fat: z.number().nonnegative(),
});

const ConfirmedFoodSchema = z.object({
  name: z.string().min(1),
  estimatedGrams: z.number().positive(),
  nutrition: NutritionSchema,
});

export const ConfirmMealRequestSchema = z.object({
  foods: z.array(ConfirmedFoodSchema).min(1),
  consumedAt: z.string().datetime().optional(),
});

export type ConfirmMealRequestDTO = z.infer<typeof ConfirmMealRequestSchema>;
