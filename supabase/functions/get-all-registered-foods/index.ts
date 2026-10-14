import { createSupabaseAdminClient } from "../_shared/clients/supabase.client.ts";
import { GetAllRegisteredFoodsRequestSchema } from "./dtos/GetAllRegisteredFoodsRequestDTO.ts";
import { GetAllRegisteredFoodsResponseSchema } from "./dtos/GetAllRegisteredFoodsResponseDTO.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function asIsoDatetime(value: unknown) {
  return new Date(String(value)).toISOString();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const parsedRequest = GetAllRegisteredFoodsRequestSchema.safeParse(
      await request.json(),
    );

    if (!parsedRequest.success) {
      return jsonResponse(
        {
          error: "Invalid get-all-registered-foods request",
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
      .from("meals")
      .select(
        "id, consumed_at, created_at, total_calories, total_protein, total_carbohydrates, total_fat, meal_foods(id, position, name, estimated_grams, calories, protein, carbohydrates, fat)",
        { count: "exact" },
      )
      .order("consumed_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("position", { ascending: true, referencedTable: "meal_foods" })
      .range(from, to);

    if (error) throw error;

    const total = count ?? 0;
    const response = GetAllRegisteredFoodsResponseSchema.parse({
      items: (data ?? []).map((meal) => ({
        mealId: meal.id,
        consumedAt: asIsoDatetime(meal.consumed_at),
        createdAt: asIsoDatetime(meal.created_at),
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
    console.error("get-all-registered-foods failed", error);
    return jsonResponse({ error: "Unable to list registered foods" }, 500);
  }
});
