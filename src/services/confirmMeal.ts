import {
  ConfirmMealRequestDTO,
  ConfirmMealRequestSchema,
} from '../../supabase/functions/confirm-meal/dtos/ConfirmMealRequestDTO';
import {
  ConfirmMealResponseDTO,
  ConfirmMealResponseSchema,
} from '../../supabase/functions/confirm-meal/dtos/ConfirmMealResponseDTO';
import { getSupabaseClient } from '../lib/supabase';

export async function confirmMeal(
  input: ConfirmMealRequestDTO,
): Promise<ConfirmMealResponseDTO> {
  const request = ConfirmMealRequestSchema.parse(input);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('confirm-meal', {
    body: request,
  });

  if (error) {
    throw new Error(`confirm-meal failed: ${error.message}`);
  }

  return ConfirmMealResponseSchema.parse(data);
}
