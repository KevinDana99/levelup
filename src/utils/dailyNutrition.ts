import { RegisteredMealDTO } from '../../supabase/functions/get-all-registered-foods/dtos/GetAllRegisteredFoodsResponseDTO';

export const DAILY_CALORIE_TARGET = 2800;

export type NutritionTotals = {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
};

function localDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function getMealsForDay(meals: RegisteredMealDTO[], day = new Date()) {
  const expectedDate = localDateKey(day);
  return meals.filter((meal) => localDateKey(meal.consumedAt) === expectedDate);
}

export function calculateNutritionTotals(meals: RegisteredMealDTO[]): NutritionTotals {
  return meals.reduce<NutritionTotals>((totals, meal) => ({
    calories: totals.calories + meal.totalNutrition.calories,
    protein: totals.protein + meal.totalNutrition.protein,
    carbohydrates: totals.carbohydrates + meal.totalNutrition.carbohydrates,
    fat: totals.fat + meal.totalNutrition.fat,
  }), { calories: 0, protein: 0, carbohydrates: 0, fat: 0 });
}

export function getCalorieProgress(calories: number) {
  if (DAILY_CALORIE_TARGET <= 0) return 0;
  return Math.min(100, Math.round((calories / DAILY_CALORIE_TARGET) * 100));
}

export function getDailyNutritionSummary(meals: RegisteredMealDTO[], day = new Date()) {
  const dailyMeals = getMealsForDay(meals, day);
  return {
    meals: dailyMeals,
    totals: calculateNutritionTotals(dailyMeals),
  };
}
