import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

type MealCaptureContextValue = {
  mealPhotoUri: string | null;
  setMealPhotoUri: (uri: string | null) => void;
};

const MealCaptureContext = createContext<MealCaptureContextValue | null>(null);

export function MealCaptureProvider({ children }: PropsWithChildren) {
  const [mealPhotoUri, setMealPhotoUri] = useState<string | null>(null);
  const value = useMemo(() => ({ mealPhotoUri, setMealPhotoUri }), [mealPhotoUri]);

  return <MealCaptureContext.Provider value={value}>{children}</MealCaptureContext.Provider>;
}

export function useMealCapture() {
  const context = useContext(MealCaptureContext);

  if (!context) {
    throw new Error('useMealCapture debe utilizarse dentro de MealCaptureProvider');
  }

  return context;
}
