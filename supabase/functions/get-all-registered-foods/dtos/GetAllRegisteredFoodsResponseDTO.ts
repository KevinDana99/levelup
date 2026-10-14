import { z } from "zod";

const NutritionSchema = z.object({
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbohydrates: z.number().nonnegative(),
  fat: z.number().nonnegative(),
});

const RegisteredFoodSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1),
  estimatedGrams: z.number().positive(),
  nutrition: NutritionSchema,
});

export const RegisteredMealSchema = z.object({
  mealId: z.string().uuid(),
  consumedAt: z.string().datetime({ offset: true }),
  createdAt: z.string().datetime({ offset: true }),
  totalNutrition: NutritionSchema,
  foods: z.array(RegisteredFoodSchema),
});

export const GetAllRegisteredFoodsResponseSchema = z.object({
  items: z.array(RegisteredMealSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  }),
});

export type RegisteredMealDTO = z.infer<typeof RegisteredMealSchema>;
export type GetAllRegisteredFoodsResponseDTO = z.infer<
  typeof GetAllRegisteredFoodsResponseSchema
>;
