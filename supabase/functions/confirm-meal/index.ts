import { createSupabaseAdminClient } from '../_shared/clients/supabase.client.ts';
import { ConfirmMealRequestSchema } from './dtos/ConfirmMealRequestDTO.ts';
import { ConfirmMealResponseSchema } from './dtos/ConfirmMealResponseDTO.ts';

const corsHeaders = {
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const parsedRequest = ConfirmMealRequestSchema.safeParse(await request.json());

    if (!parsedRequest.success) {
      return jsonResponse(
        {
          error: 'Invalid confirm-meal request',
          issues: parsedRequest.error.flatten(),
        },
        400,
      );
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc('confirm_meal', {
      p_foods: parsedRequest.data.foods,
      p_consumed_at: parsedRequest.data.consumedAt ?? null,
      p_user_id: null,
    });

    if (error) throw error;

    const savedMeal = data?.[0];
    const response = ConfirmMealResponseSchema.parse({
      mealId: savedMeal?.meal_id,
      createdAt: new Date(String(savedMeal?.created_at)).toISOString(),
      totalNutrition: {
        calories: Number(savedMeal?.total_calories),
        protein: Number(savedMeal?.total_protein),
        carbohydrates: Number(savedMeal?.total_carbohydrates),
        fat: Number(savedMeal?.total_fat),
      },
    });

    return jsonResponse(response, 201);
  } catch (error) {
    console.error('confirm-meal failed', error);
    return jsonResponse({ error: 'Unable to confirm meal' }, 500);
  }
});
