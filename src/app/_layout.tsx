import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MealCaptureProvider } from '../context/MealCaptureContext';

export default function RootLayout() {
  return (
    <MealCaptureProvider>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
      <StatusBar style="light" />
    </MealCaptureProvider>
  );
}
