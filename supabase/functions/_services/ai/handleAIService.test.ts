import { handleAIService } from "./handleAIService.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
}

async function withMockedGemini(
  responses: unknown[],
  run: (requests: Record<string, unknown>[]) => Promise<void>,
) {
  const originalFetch = globalThis.fetch;
  const originalApiKey = Deno.env.get("GEMINI_API_KEY");
  const requests: Record<string, unknown>[] = [];

  Deno.env.set("GEMINI_API_KEY", "test-api-key");
  globalThis.fetch = async (_input, init) => {
    const body = init && "body" in init ? init.body : undefined;
    requests.push(JSON.parse(String(body)) as Record<string, unknown>);
    const response = responses.shift();

    if (!response) throw new Error("Missing mocked Gemini response");

    return await Promise.resolve(jsonResponse(response));
  };

  try {
    await run(requests);
  } finally {
    globalThis.fetch = originalFetch;

    if (originalApiKey === undefined) {
      Deno.env.delete("GEMINI_API_KEY");
    } else {
      Deno.env.set("GEMINI_API_KEY", originalApiKey);
    }
  }
}

Deno.test("sends a Base64 image as Gemini inline data", async () => {
  await withMockedGemini(
    [{
      candidates: [{ content: { role: "model", parts: [{ text: "meal" }] } }],
    }],
    async (requests) => {
      const result = await handleAIService({
        prompt: "Analyze this image",
        image: { mimeType: "image/jpeg", data: "base64-image" },
      });

      assert(result.text === "meal", "Expected Gemini text response");
      assert(requests.length === 1, "Expected one Gemini request");

      const contents = requests[0].contents as Array<{
        parts: Array<Record<string, unknown>>;
      }>;
      assert(
        JSON.stringify(contents[0].parts[0]) ===
          JSON.stringify({
            inlineData: { mimeType: "image/jpeg", data: "base64-image" },
          }),
        "Expected inline Base64 image",
      );
    },
  );
});

Deno.test("executes tools and sends their results back to Gemini", async () => {
  const functionCallPart = {
    functionCall: {
      id: "call-1",
      name: "findByFood",
      args: { name: "apple", estimatedGrams: 100 },
    },
    thoughtSignature: "signature",
  };

  await withMockedGemini(
    [
      {
        candidates: [{
          content: { role: "model", parts: [functionCallPart] },
        }],
      },
      {
        candidates: [{
          content: { role: "model", parts: [{ text: "Apple identified" }] },
        }],
      },
    ],
    async (requests) => {
      const result = await handleAIService({
        prompt: "Identify the food",
        tools: [{
          name: "findByFood",
          description: "Find nutrition information",
          parameters: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
          },
          handler: ({ name }) => ({ name, calories: 52 }),
        }],
      });

      assert(result.text === "Apple identified", "Expected final Gemini text");
      assert(result.functionCalls?.length === 1, "Expected one function call");
      assert(requests.length === 2, "Expected two Gemini requests");

      const secondContents = requests[1].contents as Array<{
        role: string;
        parts: Array<Record<string, unknown>>;
      }>;
      assert(
        secondContents[1].parts[0].thoughtSignature === "signature",
        "Expected Gemini thought signature to be preserved",
      );

      const functionResponse = secondContents[2].parts[0].functionResponse as {
        id: string;
        response: Record<string, unknown>;
      };
      assert(
        functionResponse.id === "call-1",
        "Expected matching function call id",
      );
      assert(
        functionResponse.response.calories === 52,
        "Expected handler result in function response",
      );
    },
  );
});
