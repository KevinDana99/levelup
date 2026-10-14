import {
  GetAllRegisteredFoodsRequestDTO,
  GetAllRegisteredFoodsRequestSchema,
} from '../../supabase/functions/get-all-registered-foods/dtos/GetAllRegisteredFoodsRequestDTO';
import {
  GetAllRegisteredFoodsResponseDTO,
  GetAllRegisteredFoodsResponseSchema,
} from '../../supabase/functions/get-all-registered-foods/dtos/GetAllRegisteredFoodsResponseDTO';

function getEdgeFunctionConfig() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    );
  }

  return { supabaseUrl, publishableKey };
}

export async function getAllRegisteredFoods(
  input: Partial<GetAllRegisteredFoodsRequestDTO> = {},
): Promise<GetAllRegisteredFoodsResponseDTO> {
  const request = GetAllRegisteredFoodsRequestSchema.parse(input);
  const { supabaseUrl, publishableKey } = getEdgeFunctionConfig();
  let response: Response;

  try {
    response = await fetch(
      `${supabaseUrl}/functions/v1/get-all-registered-foods`,
      {
        method: 'POST',
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown network error';
    throw new Error(`No se pudo conectar con Supabase: ${detail}`);
  }

  const responseBody = await response.text();
  let data: unknown;

  try {
    data = JSON.parse(responseBody);
  } catch {
    throw new Error(`Supabase devolvió una respuesta inválida (HTTP ${response.status})`);
  }

  if (!response.ok) {
    const payload = data as { error?: string; message?: string };
    throw new Error(
      payload.error ?? payload.message ?? `La consulta falló (HTTP ${response.status})`,
    );
  }

  return GetAllRegisteredFoodsResponseSchema.parse(data);
}
