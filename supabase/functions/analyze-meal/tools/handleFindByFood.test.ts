import { handleFindByFood } from "./handleFindByFood.ts";

function assertEquals(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${
        JSON.stringify(actual)
      }`,
    );
  }
}

Deno.test("normalizes USDA values and scales them to estimated grams", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = Deno.env.get("USDA_API_KEY");

  Deno.env.set("USDA_API_KEY", "test-usda-key");
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(JSON.stringify({
        foods: [{
          description: "Fish, salmon, cooked, dry heat",
          foodNutrients: [
            { nutrientId: 1008, unitName: "KCAL", value: 200 },
            { nutrientId: 1003, unitName: "G", value: 20 },
            { nutrientId: 1005, unitName: "G", value: 1.5 },
            { nutrientId: 1004, unitName: "G", value: 10 },
          ],
        }],
      })),
    );

  try {
    const result = await handleFindByFood({
      name: "salmon cooked dry heat",
      estimatedGrams: 175,
    });

    assertEquals(result, {
      name: "Fish, salmon, cooked, dry heat",
      estimatedGrams: 175,
      nutrition: {
        calories: 350,
        protein: 35,
        carbohydrates: 2.63,
        fat: 17.5,
      },
      source: "USDA",
      isEstimated: false,
    });
  } finally {
    globalThis.fetch = originalFetch;

    if (originalApiKey === undefined) {
      Deno.env.delete("USDA_API_KEY");
    } else {
      Deno.env.set("USDA_API_KEY", originalApiKey);
    }
  }
});

Deno.test("falls back to Open Food Facts and scales its values", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;

  globalThis.fetch = () => {
    requestCount += 1;

    if (requestCount === 1) {
      return Promise.resolve(new Response(JSON.stringify({ foods: [] })));
    }

    return Promise.resolve(
      new Response(JSON.stringify({
        hits: [{
          product_name: "Incomplete result",
        }, {
          product_name: "Natural peanut butter",
          nutriments: {
            "energy-kcal_100g": 600,
            proteins_100g: 25,
            carbohydrates_100g: 20,
            fat_100g: 50,
          },
        }],
      })),
    );
  };

  try {
    const result = await handleFindByFood({
      name: "natural peanut butter",
      estimatedGrams: 30,
    });

    assertEquals(requestCount, 2);
    assertEquals(result, {
      name: "Natural peanut butter",
      estimatedGrams: 30,
      nutrition: {
        calories: 180,
        protein: 7.5,
        carbohydrates: 6,
        fat: 15,
      },
      source: "OFF",
      isEstimated: false,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("uses Gemini as the final fallback and keeps scaling in the handler", async () => {
  const originalFetch = globalThis.fetch;
  const originalGeminiApiKey = Deno.env.get("GEMINI_API_KEY");
  let requestCount = 0;

  Deno.env.set("GEMINI_API_KEY", "test-gemini-key");
  globalThis.fetch = () => {
    requestCount += 1;

    if (requestCount === 1) {
      return Promise.resolve(new Response(JSON.stringify({ foods: [] })));
    }

    if (requestCount === 2) {
      return Promise.resolve(new Response(JSON.stringify({ hits: [] })));
    }

    return Promise.resolve(
      new Response(JSON.stringify({
        candidates: [{
          content: {
            role: "model",
            parts: [{
              text: JSON.stringify({
                name: "Homemade vegetable pie",
                nutritionPer100Grams: {
                  calories: 180,
                  protein: 6,
                  carbohydrates: 24,
                  fat: 7,
                },
              }),
            }],
          },
        }],
      })),
    );
  };

  try {
    const result = await handleFindByFood({
      name: "homemade vegetable pie",
      estimatedGrams: 250,
    });

    assertEquals(requestCount, 3);
    assertEquals(result, {
      name: "Homemade vegetable pie",
      estimatedGrams: 250,
      nutrition: {
        calories: 450,
        protein: 15,
        carbohydrates: 60,
        fat: 17.5,
      },
      source: "GEMINI",
      isEstimated: true,
    });
  } finally {
    globalThis.fetch = originalFetch;

    if (originalGeminiApiKey === undefined) {
      Deno.env.delete("GEMINI_API_KEY");
    } else {
      Deno.env.set("GEMINI_API_KEY", originalGeminiApiKey);
    }
  }
});
