import { z } from 'zod';

export const ListMealsRequestSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type ListMealsRequestDTO = z.infer<typeof ListMealsRequestSchema>;
