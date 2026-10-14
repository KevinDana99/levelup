import { createSupabaseAdminClient } from '../_shared/clients/supabase.client.ts';
import { ListMealsRequestSchema } from './dtos/ListMealsRequestDTO.ts';
import { ListMealsResponseSchema } from './dtos/ListMealsResponseDTO.ts';

const corsHeaders = {
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const url = new URL(request.url);
    const parsedRequest = ListMealsRequestSchema.safeParse({
      page: url.searchParams.get('page') ?? undefined,
      pageSize: url.searchParams.get('pageSize') ?? undefined,
    });

    if (!parsedRequest.success) {
      return jsonResponse(
        {
          error: 'Invalid list-meals request',
          issues: parsedRequest.error.flatten(),
        },
        400,
      );
    }

    const { page, pageSize } = parsedRequest.data;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const supabase = createSupabaseAdminClient();
    const { data, error, count } = await supabase
      .from('meals')
      .select(
        'id, consumed_at, created_at, total_calories, total_protein, total_carbohydrates, total_fat, meal_foods(id, position, name, estimated_grams, calories, protein, carbohydrates, fat)',
        { count: 'exact' },
      )
      .order('consumed_at', { ascending: false })
      .order('created_at', { ascending: false })
      .order('position', { ascending: true, referencedTable: 'meal_foods' })
      .range(from, to);

    if (error) throw error;

    const total = count ?? 0;
    const response = ListMealsResponseSchema.parse({
      items: (data ?? []).map((meal) => ({
        mealId: meal.id,
        consumedAt: meal.consumed_at,
        createdAt: meal.created_at,
        totalNutrition: {
          calories: Number(meal.total_calories),
          protein: Number(meal.total_protein),
          carbohydrates: Number(meal.total_carbohydrates),
          fat: Number(meal.total_fat),
        },
        foods: meal.meal_foods.map((food) => ({
          id: food.id,
          name: food.name,
          estimatedGrams: Number(food.estimated_grams),
          nutrition: {
            calories: Number(food.calories),
            protein: Number(food.protein),
            carbohydrates: Number(food.carbohydrates),
            fat: Number(food.fat),
          },
        })),
      })),
      pagination: {
        page,
        pageSize,
        total,
        hasMore: to + 1 < total,
      },
    });

    return jsonResponse(response);
  } catch (error) {
    console.error('list-meals failed', error);
    return jsonResponse({ error: 'Unable to list meals' }, 500);
  }
});
