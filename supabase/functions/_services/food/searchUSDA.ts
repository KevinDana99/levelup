import type { NutritionDTO } from "../../_shared/dtos/NutritionDTO.ts";

const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
const USDA_DATA_TYPES = ["Foundation", "SR Legacy", "Survey (FNDDS)"];

const NUTRIENT_IDS = {
  calories: [1008, 2048, 2047],
  protein: [1003],
  carbohydrates: [1005],
  fat: [1004],
} as const;

type USDANutrient = {
  nutrientId?: number;
  unitName?: string;
  value?: number;
};

type USDAFood = {
  description?: string;
  foodNutrients?: USDANutrient[];
};

type USDASearchResponse = {
  foods?: USDAFood[];
};

export type USDAFoodResult = {
  name: string;
  nutritionPer100Grams: NutritionDTO;
};

function getApiKey() {
  return Deno.env.get("USDA_API_KEY")?.trim() || "DEMO_KEY";
}

function findNutrient(
  nutrients: USDANutrient[],
  acceptedIds: readonly number[],
) {
  const nutrient = nutrients.find((candidate) =>
    candidate.nutrientId !== undefined &&
    acceptedIds.includes(candidate.nutrientId)
  );
  const value = nutrient?.value;

  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function normalizeFood(food: USDAFood): USDAFoodResult | null {
  if (!food.description || !food.foodNutrients) return null;

  const calories = findNutrient(food.foodNutrients, NUTRIENT_IDS.calories);
  const protein = findNutrient(food.foodNutrients, NUTRIENT_IDS.protein);
  const carbohydrates = findNutrient(
    food.foodNutrients,
    NUTRIENT_IDS.carbohydrates,
  );
  const fat = findNutrient(food.foodNutrients, NUTRIENT_IDS.fat);

  if (
    calories === undefined || protein === undefined ||
    carbohydrates === undefined || fat === undefined
  ) {
    return null;
  }

  return {
    name: food.description,
    nutritionPer100Grams: { calories, protein, carbohydrates, fat },
  };
}

export async function searchUSDA(
  foodName: string,
  signal?: AbortSignal,
): Promise<USDAFoodResult | null> {
  const url = new URL(USDA_SEARCH_URL);
  url.searchParams.set("api_key", getApiKey());

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: foodName,
      pageSize: 10,
      dataType: USDA_DATA_TYPES,
      requireAllWords: true,
    }),
    signal: signal ?? AbortSignal.timeout(10_000),
  });

  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(`USDA request failed with HTTP ${response.status}`);
  }

  let payload: USDASearchResponse;

  try {
    payload = JSON.parse(responseBody) as USDASearchResponse;
  } catch {
    throw new Error("USDA returned an invalid response");
  }

  const match = payload.foods
    ?.map(normalizeFood)
    .find((food): food is USDAFoodResult => food !== null);

  return match ?? null;
}
