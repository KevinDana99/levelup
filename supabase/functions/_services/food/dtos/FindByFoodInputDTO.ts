import { z } from "zod";

export const FindByFoodInputSchema = z.object({
  name: z.string().trim().min(1),
  estimatedGrams: z.number().positive(),
});

export type FindByFoodInputDTO = z.infer<typeof FindByFoodInputSchema>;
