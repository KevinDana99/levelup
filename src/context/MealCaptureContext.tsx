import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { AnalyzeMealRequestDTO } from '../../supabase/functions/analyze-meal/dtos/AnalyzeMealRequestDTO';
import { AnalyzeMealResponseDTO } from '../../supabase/functions/analyze-meal/dtos/AnalyzeMealResponseDTO';
import { analyzeMeal } from '../services/analyzeMeal';

type MealAnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

type MealCaptureContextValue = {
  mealPhotoUri: string | null;
  setMealPhotoUri: (uri: string | null) => void;
  mealAnalysis: AnalyzeMealResponseDTO | null;
  mealAnalysisError: string | null;
  mealAnalysisStatus: MealAnalysisStatus;
  requestMealAnalysis: (input: AnalyzeMealRequestDTO) => Promise<void>;
};

const MealCaptureContext = createContext<MealCaptureContextValue | null>(null);

export function MealCaptureProvider({ children }: PropsWithChildren) {
  const [mealPhotoUri, setMealPhotoUri] = useState<string | null>(null);
  const [mealAnalysis, setMealAnalysis] = useState<AnalyzeMealResponseDTO | null>(null);
  const [mealAnalysisError, setMealAnalysisError] = useState<string | null>(null);
  const [mealAnalysisStatus, setMealAnalysisStatus] = useState<MealAnalysisStatus>('idle');

  const requestMealAnalysis = useCallback(async (input: AnalyzeMealRequestDTO) => {
    setMealAnalysis(null);
    setMealAnalysisError(null);
    setMealAnalysisStatus('loading');

    try {
      const result = await analyzeMeal(input);
      setMealAnalysis(result);
      setMealAnalysisStatus('success');
    } catch (error) {
      setMealAnalysisError(error instanceof Error ? error.message : 'Unable to analyze meal');
      setMealAnalysisStatus('error');
    }
  }, []);

  const value = useMemo(
    () => ({
      mealPhotoUri,
      setMealPhotoUri,
      mealAnalysis,
      mealAnalysisError,
      mealAnalysisStatus,
      requestMealAnalysis,
    }),
    [mealAnalysis, mealAnalysisError, mealAnalysisStatus, mealPhotoUri, requestMealAnalysis],
  );

  return <MealCaptureContext.Provider value={value}>{children}</MealCaptureContext.Provider>;
}

export function useMealCapture() {
  const context = useContext(MealCaptureContext);

  if (!context) {
    throw new Error('useMealCapture debe utilizarse dentro de MealCaptureProvider');
  }

  return context;
}
