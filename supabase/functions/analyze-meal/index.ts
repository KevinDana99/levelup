import { AnalyzeMealRequestSchema } from './dtos/AnalyzeMealRequestDTO.ts'
import { AnalyzeMealResponseSchema } from './dtos/AnalyzeMealResponseDTO.ts'

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*'
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const requestBody = await request.json()
    const parsedRequest = AnalyzeMealRequestSchema.safeParse(requestBody)

    if (!parsedRequest.success) {
      return jsonResponse(
        {
          error: 'Invalid analyze-meal request',
          issues: parsedRequest.error.flatten()
        },
        400
      )
    }

    // TODO: Replace this neutral result with handleAIService(parsedRequest.data).
    const response = AnalyzeMealResponseSchema.parse({
      foods: [],
      totalNutrition: {
        calories: 0,
        protein: 0,
        carbohydrates: 0,
        fat: 0
      }
    })

    return jsonResponse(response)
  } catch (error) {
    console.error('analyze-meal failed', error)
    return jsonResponse({ error: 'Unable to analyze meal' }, 500)
  }
})
