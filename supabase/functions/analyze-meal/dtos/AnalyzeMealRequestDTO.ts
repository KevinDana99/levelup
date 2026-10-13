import { z } from 'zod'

export const AnalyzeMealRequestSchema = z.object({
  image: z
    .string()
    .min(1)
    .max(20_000_000)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'image must be a valid Base64 string'),

  plateSize: z.enum(['small', 'medium', 'large']).default('medium')
})

export type AnalyzeMealRequestDTO = z.infer<typeof AnalyzeMealRequestSchema>
