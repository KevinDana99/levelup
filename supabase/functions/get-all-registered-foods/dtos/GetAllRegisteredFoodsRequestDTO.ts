import { z } from "zod";

export const GetAllRegisteredFoodsRequestSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

export type GetAllRegisteredFoodsRequestDTO = z.infer<
  typeof GetAllRegisteredFoodsRequestSchema
>;
