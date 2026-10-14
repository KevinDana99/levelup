import { z } from 'zod';

const NutritionSchema = z.object({
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbohydrates: z.number().nonnegative(),
  fat: z.number().nonnegative(),
});

const MealFoodSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  estimatedGrams: z.number().positive(),
  nutrition: NutritionSchema,
});

const MealSchema = z.object({
  mealId: z.string().uuid(),
  consumedAt: z.string().datetime({ offset: true }),
  createdAt: z.string().datetime({ offset: true }),
  totalNutrition: NutritionSchema,
  foods: z.array(MealFoodSchema),
});

export const ListMealsResponseSchema = z.object({
  items: z.array(MealSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  }),
});

export type ListMealsResponseDTO = z.infer<typeof ListMealsResponseSchema>;
