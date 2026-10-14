import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { RegisteredMealDTO } from '../../supabase/functions/get-all-registered-foods/dtos/GetAllRegisteredFoodsResponseDTO';
import { getAllRegisteredFoods } from '../services/getAllRegisteredFoods';
import {
  getDailyNutritionSummary,
  NutritionTotals,
} from '../utils/dailyNutrition';

const PAGE_SIZE = 100;
const EMPTY_TOTALS: NutritionTotals = {
  calories: 0,
  protein: 0,
  carbohydrates: 0,
  fat: 0,
};

export function useDailyNutrition() {
  const [meals, setMeals] = useState<RegisteredMealDTO[]>([]);
  const [totals, setTotals] = useState<NutritionTotals>(EMPTY_TOTALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getAllRegisteredFoods({ page: 1, pageSize: PAGE_SIZE });
      const summary = getDailyNutritionSummary(response.items);
      setMeals(summary.meals);
      setTotals(summary.totals);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'No se pudo actualizar la cuota diaria',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { meals, totals, loading, error, refresh };
}
