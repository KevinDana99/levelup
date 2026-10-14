import type { NutritionDTO } from "../../_shared/dtos/NutritionDTO.ts";

const OPEN_FOOD_FACTS_SEARCH_URL = "https://search.openfoodfacts.org/search";

type OpenFoodFactsNutriments = {
  "energy-kcal_100g"?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
};

type OpenFoodFactsProduct = {
  product_name?: string;
  generic_name?: string;
  nutriments?: OpenFoodFactsNutriments;
};

type OpenFoodFactsSearchResponse = {
  hits?: OpenFoodFactsProduct[];
};

export type OpenFoodFactsResult = {
  name: string;
  nutritionPer100Grams: NutritionDTO;
};

function getUserAgent() {
  return Deno.env.get("OPEN_FOOD_FACTS_USER_AGENT")?.trim() ||
    "LevelUp/0.1.0 (nutrition lookup)";
}

function asNonNegativeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function normalizeProduct(
  product: OpenFoodFactsProduct,
): OpenFoodFactsResult | null {
  const name = product.product_name?.trim() || product.generic_name?.trim();
  const nutriments = product.nutriments;

  if (!name || !nutriments) return null;

  const calories = asNonNegativeNumber(nutriments["energy-kcal_100g"]);
  const protein = asNonNegativeNumber(nutriments.proteins_100g);
  const carbohydrates = asNonNegativeNumber(nutriments.carbohydrates_100g);
  const fat = asNonNegativeNumber(nutriments.fat_100g);

  if (
    calories === undefined || protein === undefined ||
    carbohydrates === undefined || fat === undefined
  ) {
    return null;
  }

  return {
    name,
    nutritionPer100Grams: { calories, protein, carbohydrates, fat },
  };
}

export async function searchOpenFoodFacts(
  foodName: string,
  signal?: AbortSignal,
): Promise<OpenFoodFactsResult | null> {
  const response = await fetch(OPEN_FOOD_FACTS_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": getUserAgent(),
    },
    body: JSON.stringify({
      q: foodName,
      page: 1,
      page_size: 10,
      fields: ["code", "product_name", "generic_name", "nutriments"],
    }),
    signal: signal ?? AbortSignal.timeout(10_000),
  });
  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(
      `Open Food Facts request failed with HTTP ${response.status}`,
    );
  }

  let payload: OpenFoodFactsSearchResponse;

  try {
    payload = JSON.parse(responseBody) as OpenFoodFactsSearchResponse;
  } catch {
    throw new Error("Open Food Facts returned an invalid response");
  }

  return payload.hits
    ?.map(normalizeProduct)
    .find((product): product is OpenFoodFactsResult => product !== null) ??
    null;
}
