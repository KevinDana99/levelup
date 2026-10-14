import { handleAIService } from "./handleAIService.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
}

async function withMockedGroq(
  responses: unknown[],
  run: (
    requests: Array<{
      url: string;
      headers: Headers;
      body: Record<string, unknown>;
    }>,
  ) => Promise<void>,
) {
  const originalFetch = globalThis.fetch;
  const originalApiKey = Deno.env.get("GROQ_API_KEY");
  const requests: Array<{
    url: string;
    headers: Headers;
    body: Record<string, unknown>;
  }> = [];

  Deno.env.set("GROQ_API_KEY", "test-api-key");
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push({
      url: request.url,
      headers: request.headers,
      body: JSON.parse(await request.text()) as Record<string, unknown>,
    });
    const response = responses.shift();

    if (!response) throw new Error("Missing mocked Groq response");

    return await Promise.resolve(jsonResponse(response));
  };

  try {
    await run(requests);
  } finally {
    globalThis.fetch = originalFetch;

    if (originalApiKey === undefined) {
      Deno.env.delete("GROQ_API_KEY");
    } else {
      Deno.env.set("GROQ_API_KEY", originalApiKey);
    }
  }
}

Deno.test("sends a Base64 image to Qwen through Groq", async () => {
  await withMockedGroq(
    [{
      choices: [{ message: { role: "assistant", content: "meal" } }],
    }],
    async (requests) => {
      const result = await handleAIService({
        prompt: "Analyze this image",
        image: { mimeType: "image/jpeg", data: "base64-image" },
      });

      assert(result.text === "meal", "Expected Qwen text response");
      assert(requests.length === 1, "Expected one Groq request");
      assert(
        requests[0].url ===
          "https://api.groq.com/openai/v1/chat/completions",
        "Expected the Groq chat completions endpoint",
      );
      assert(
        requests[0].headers.get("Authorization") === "Bearer test-api-key",
        "Expected the Groq bearer token",
      );
      assert(
        requests[0].body.model === "qwen/qwen3.8-27b",
        "Expected Qwen 3.8 27B",
      );
      assert(
        requests[0].body.max_completion_tokens === 600,
        "Expected a 600-token completion limit",
      );
      assert(
        requests[0].body.temperature === 0.1,
        "Expected a 0.1 temperature",
      );

      const messages = requests[0].body.messages as Array<{
        content: Array<Record<string, unknown>>;
      }>;
      assert(
        JSON.stringify(messages[0].content[1]) ===
          JSON.stringify({
            type: "image_url",
            image_url: {
              url: "data:image/jpeg;base64,base64-image",
            },
          }),
        "Expected a Base64 image data URL",
      );
    },
  );
});
