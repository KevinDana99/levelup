import { z } from 'zod'

import { FoodSchema } from '../../_shared/dtos/FoodDTO.ts'
import { NutritionSchema } from '../../_shared/dtos/NutritionDTO.ts'

export const AnalyzeMealResponseSchema = z.object({
  foods: z.array(FoodSchema),

  totalNutrition: NutritionSchema
})

export type AnalyzeMealResponseDTO = z.infer<typeof AnalyzeMealResponseSchema>
