import {
  AnalyzeMealRequestDTO,
  AnalyzeMealRequestSchema,
} from '../../supabase/functions/analyze-meal/dtos/AnalyzeMealRequestDTO';
import {
  AnalyzeMealResponseDTO,
  AnalyzeMealResponseSchema,
} from '../../supabase/functions/analyze-meal/dtos/AnalyzeMealResponseDTO';
import { getSupabaseClient } from '../lib/supabase';

export async function analyzeMeal(
  input: AnalyzeMealRequestDTO,
): Promise<AnalyzeMealResponseDTO> {
  const request = AnalyzeMealRequestSchema.parse(input);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('analyze-meal', {
    body: request,
  });

  if (error) {
    throw new Error(`analyze-meal failed: ${error.message}`);
  }

  return AnalyzeMealResponseSchema.parse(data);
}
