import { z } from 'zod'

export const NutritionSchema = z.object({
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbohydrates: z.number().nonnegative(),
  fat: z.number().nonnegative()
})

export type NutritionDTO = z.infer<typeof NutritionSchema>
