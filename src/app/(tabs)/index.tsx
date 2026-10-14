import { useEffect, useState } from 'react';
import { useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMealCapture } from '../../context/MealCaptureContext';
import { useDailyNutrition } from '../../hooks/useDailyNutrition';
import { confirmMeal } from '../../services/confirmMeal';
import {
  DAILY_CALORIE_TARGET,
  getCalorieProgress,
} from '../../utils/dailyNutrition';

const COLORS = {
  background: '#050912',
  panel: '#0B1222',
  blue: '#3B82F6',
  blueBright: '#60A5FA',
  purple: '#9B4DFF',
  cyan: '#67E8F9',
  text: '#F4F7FF',
  muted: '#9AA8C3',
  border: '#254A87',
};

const MEAL_IMAGE = require('../../../assets/meal-salmon.jpg');

type MacroCardProps = { label: string; value: string; progress: number; color: string };
type MealConfirmationStatus = 'idle' | 'loading' | 'success' | 'error';

function formatRounded(value: number) {
  return Math.round(value).toLocaleString('es-AR');
}

function getMacroCaloriePercentage(grams: number, caloriesPerGram: number, totalCalories: number) {
  if (totalCalories <= 0) return 0;
  return Math.min(Math.round(((grams * caloriesPerGram) / totalCalories) * 100), 100);
}

function MacroCard({ label, value, progress, color }: MacroCardProps) {
  return (
    <View style={[styles.macroCard, { borderColor: color }]}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>{value}</Text>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${progress}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const [water, setWater] = useState(2.8);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isOpeningCamera, setIsOpeningCamera] = useState(false);
  const [confirmationStatus, setConfirmationStatus] = useState<MealConfirmationStatus>('idle');
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const {
    meals: dailyMeals,
    totals: dailyTotals,
    refresh: refreshDailyNutrition,
  } = useDailyNutrition();
  const { mealAnalysis, mealAnalysisError, mealAnalysisStatus, mealPhotoUri } = useMealCapture();
  const hasMealPhoto = Boolean(mealPhotoUri);
  const registered = confirmationStatus === 'success';
  const waterPercent = Math.min((water / 3.5) * 100, 100);
  const foods = mealAnalysis?.foods ?? [];
  const nutrition = mealAnalysis?.totalNutrition;
  const hasAnalysis = mealAnalysisStatus === 'success' && Boolean(mealAnalysis);
  const totalWeight = foods.reduce((total, food) => total + food.estimatedGrams, 0);
  const averageConfidence = foods.length > 0
    ? foods.reduce((total, food) => total + food.confidence, 0) / foods.length
    : 0;
  const hasEstimatedNutrition = foods.some((food) => food.isEstimated);
  const mealName = foods.length > 0
    ? foods.map((food) => food.name).join(' + ')
    : mealAnalysisStatus === 'loading'
      ? 'Analizando alimentos...'
      : mealAnalysisStatus === 'error'
        ? 'No se pudo analizar la comida'
        : 'Tomá una foto de tu comida';
  const detectionLabel = hasAnalysis
    ? hasEstimatedNutrition
      ? '⚠ DATOS ESTIMADOS POR IA'
      : '⚑ PLATO DETECTADO'
    : mealAnalysisStatus === 'loading'
      ? '◎ PROCESANDO IMAGEN'
      : mealAnalysisStatus === 'error'
        ? '⚠ ANÁLISIS FALLIDO'
        : '◎ LISTO PARA ESCANEAR';
  const calories = hasAnalysis && nutrition ? formatRounded(nutrition.calories) : '0';
  const protein = hasAnalysis && nutrition ? `${formatRounded(nutrition.protein)}g` : '0g';
  const carbohydrates = hasAnalysis && nutrition
    ? `${formatRounded(nutrition.carbohydrates)}g`
    : '0g';
  const fat = hasAnalysis && nutrition ? `${formatRounded(nutrition.fat)}g` : '0g';
  const totalCalories = nutrition?.calories ?? 0;
  const dailyProgress = getCalorieProgress(dailyTotals.calories);
  const remainingCalories = Math.max(0, DAILY_CALORIE_TARGET - dailyTotals.calories);

  useEffect(() => {
    setConfirmationStatus('idle');
    setConfirmationError(null);
  }, [mealAnalysis]);

  const openCamera = async () => {
    if (isOpeningCamera) return;

    try {
      setIsOpeningCamera(true);
      if (!cameraPermission?.granted && cameraPermission?.canAskAgain !== false) {
        await requestCameraPermission();
      }
      router.push('/camera');
    } finally {
      setIsOpeningCamera(false);
    }
  };

  const registerMeal = async () => {
    if (!mealAnalysis || mealAnalysisStatus !== 'success') return;
    if (confirmationStatus === 'loading' || confirmationStatus === 'success') return;

    setConfirmationStatus('loading');
    setConfirmationError(null);

    try {
      await confirmMeal({
        foods: mealAnalysis.foods.map((food) => ({
          name: food.name,
          estimatedGrams: food.estimatedGrams,
          nutrition: food.nutrition,
        })),
        consumedAt: new Date().toISOString(),
      });
      await refreshDailyNutrition();
      setConfirmationStatus('success');
    } catch (error) {
      setConfirmationError(
        error instanceof Error ? error.message : 'No se pudo registrar la comida',
      );
      setConfirmationStatus('error');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>● NUTRICIÓN DEPORTIVA</Text>
              <Text style={styles.title}>Recomposición{`\n`}Corporal</Text>
            </View>
            <View style={styles.caloriePill}>
              <Text style={styles.flame}>♨</Text>
              <View>
                <Text style={styles.caloriePillValue}>{formatRounded(dailyTotals.calories)} /</Text>
                <Text style={styles.caloriePillTarget}>{formatRounded(DAILY_CALORIE_TARGET)} kcal</Text>
              </View>
            </View>
            <Pressable style={styles.settingsButton} accessibilityLabel="Abrir configuración">
              <Text style={styles.settingsIcon}>◇</Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hasMealPhoto ? 'Tomar otra foto de la comida' : 'Tomar una foto de la comida'}
            disabled={isOpeningCamera}
            onPress={openCamera}
            style={({ pressed }) => [styles.scannerCard, pressed && styles.scannerCardPressed]}
          >
            <ImageBackground source={mealPhotoUri ? { uri: mealPhotoUri } : MEAL_IMAGE} style={styles.mealImage} imageStyle={styles.mealImageRadius}>
              <View style={styles.imageShade} />
              <View style={styles.scannerTopRow}>
                <View style={styles.scanPill}>
                  <Text style={styles.scanPillText}>
                    {mealAnalysisStatus === 'loading'
                      ? '● ANALIZANDO COMIDA...'
                      : mealAnalysisStatus === 'error'
                        ? '● ERROR DE ANÁLISIS'
                        : mealAnalysisStatus === 'success'
                          ? '● ANÁLISIS COMPLETADO'
                          : '● ESCÁNER DE ALIMENTOS IA'}
                  </Text>
                </View>
                <Text style={styles.weightBadge}>
                  {hasAnalysis ? `${formatRounded(totalWeight)}g` : '0g'}
                </Text>
              </View>
              <View style={styles.targetBox}>
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
                <View style={styles.targetDot} />
              </View>
              <View style={styles.mealResult}>
                <View style={styles.mealResultTop}>
                  <Text style={styles.detected}>
                    {detectionLabel}
                  </Text>
                  <Text style={styles.mealCalories}>{calories}</Text>
                </View>
                <View style={styles.mealResultBottom}>
                  <Text numberOfLines={1} style={styles.mealName}>{mealName}</Text>
                  <Text style={styles.kcalLabel}>KCAL</Text>
                </View>
                {mealAnalysisStatus === 'error' && mealAnalysisError ? (
                  <Text numberOfLines={2} style={styles.analysisError}>{mealAnalysisError}</Text>
                ) : null}
              </View>
            </ImageBackground>
          </Pressable>

          <View style={styles.energyCard}>
            <View style={styles.energyTop}>
              <View>
                <Text style={styles.sectionLabel}>VALOR ENERGÉTICO</Text>
                <View style={styles.energyValueRow}>
                  <Text style={styles.energyValue}>{calories}</Text>
                  <Text style={styles.energyUnit}>KCAL</Text>
                </View>
              </View>
              <View style={styles.scorePill}>
                <Text style={styles.scoreText}>
                  {hasAnalysis ? `◎ Score: ${Math.round(averageConfidence * 100)}/100` : '◎ SIN ANÁLISIS'}
                </Text>
              </View>
            </View>
            <View style={styles.macrosRow}>
              <MacroCard
                label="PROTEÍNAS"
                value={protein}
                progress={getMacroCaloriePercentage(nutrition?.protein ?? 0, 4, totalCalories)}
                color={COLORS.blue}
              />
              <MacroCard
                label="CARBOHIDRATOS"
                value={carbohydrates}
                progress={getMacroCaloriePercentage(nutrition?.carbohydrates ?? 0, 4, totalCalories)}
                color="#A855F7"
              />
              <MacroCard
                label="GRASAS"
                value={fat}
                progress={getMacroCaloriePercentage(nutrition?.fat ?? 0, 9, totalCalories)}
                color="#9333EA"
              />
            </View>
            {hasAnalysis && foods.length > 0 ? (
              <View style={styles.detectedFoods}>
                <Text style={styles.detectedFoodsTitle}>ALIMENTOS DETECTADOS</Text>
                {foods.map((food, index) => (
                  <View key={`${food.name}-${index}`} style={styles.detectedFoodRow}>
                    <View style={styles.detectedFoodCopy}>
                      <Text numberOfLines={1} style={styles.detectedFoodName}>{food.name}</Text>
                      <Text style={styles.detectedFoodMeta}>
                        {formatRounded(food.estimatedGrams)}g · {formatRounded(food.nutrition.calories)} kcal
                      </Text>
                    </View>
                    <View style={[styles.sourcePill, food.isEstimated && styles.estimatedSourcePill]}>
                      <Text style={styles.sourceText}>
                        {food.isEstimated ? `${food.source} · EST.` : food.source}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.dailyCard}>
            <View style={styles.ring}><View style={styles.ringInner}><Text style={styles.ringText}>{dailyProgress}%</Text></View></View>
            <View style={styles.dailyCopy}>
              <Text style={styles.sectionLabel}>CUOTA DIARIA</Text>
              <Text style={styles.dailyValue}>{formatRounded(dailyTotals.calories)} <Text style={styles.dailyTarget}>/ {formatRounded(DAILY_CALORIE_TARGET)} kcal</Text></Text>
              <Text style={styles.remaining}>Restante: {formatRounded(remainingCalories)} kcal</Text>
            </View>
            <Pressable
              accessibilityLabel="Agregar agua"
              onPress={() => setWater((current) => (current >= 3.5 ? 2.8 : Math.min(3.5, current + 0.1)))}
              style={({ pressed }) => [styles.waterCard, pressed && styles.pressed]}
            >
              <Text style={styles.waterLabel}>♧ AGUA</Text>
              <Text style={styles.waterValue}>{water.toFixed(1)} L <Text style={styles.waterTarget}>/ 3.5 L</Text></Text>
              <View style={styles.waterTrack}><View style={[styles.waterFill, { width: `${waterPercent}%` }]} /></View>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Registrar comida"
            accessibilityState={{
              disabled: !hasAnalysis || confirmationStatus === 'loading' || registered,
            }}
            disabled={!hasAnalysis || confirmationStatus === 'loading' || registered}
            onPress={registerMeal}
            style={({ pressed }) => [
              styles.registerButton,
              (!hasAnalysis || confirmationStatus === 'loading' || registered) && styles.registerButtonDisabled,
              pressed && styles.registerButtonPressed,
            ]}
          >
            <Text style={styles.registerIcon}>{registered ? '✓' : '⊕'}</Text>
            <Text style={styles.registerText}>
              {confirmationStatus === 'loading'
                ? '[ REGISTRANDO... ]'
                : registered
                  ? '[ COMIDA REGISTRADA ]'
                  : '[ REGISTRAR COMIDA ]'}
            </Text>
          </Pressable>
          {confirmationError ? (
            <Text style={styles.registrationError}>{confirmationError}</Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver comidas registradas"
            onPress={() => router.push('/meals')}
            style={({ pressed }) => [
              styles.historyButton,
              pressed && styles.historyButtonPressed,
            ]}
          >
            <Text style={styles.historyButtonIcon}>▤</Text>
            <Text style={styles.historyButtonText}>[ VER COMIDAS REGISTRADAS ]</Text>
            <Text style={styles.historyButtonArrow}>›</Text>
          </Pressable>

          <View style={styles.todayHeader}>
            <Text style={styles.sectionLabel}>COMIDAS DE HOY</Text>
            <View style={styles.countBadge}><Text style={styles.countText}>{dailyMeals.length} REGISTROS</Text></View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mealsList}>
            <View style={styles.mealItem}>
              <View style={[styles.mealThumb, styles.oatsThumb]}><Text style={styles.thumbEmoji}>🥣</Text></View>
              <View>
                <Text style={styles.mealTime}>08:15 AM · Desayuno</Text>
                <Text style={styles.mealItemName}>Oat Bowl + Whey</Text>
                <Text style={styles.mealItemKcal}>580 kcal</Text>
              </View>
            </View>
            <View style={styles.mealItem}>
              <View style={[styles.mealThumb, styles.eggThumb]}><Text style={styles.thumbEmoji}>🥚</Text></View>
              <View>
                <Text style={styles.mealTime}>12:30 PM · Snack</Text>
                <Text style={styles.mealItemName}>Gel Isotónico</Text>
                <Text style={styles.mealItemKcal}>180 kcal</Text>
              </View>
            </View>
          </ScrollView>
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 16, paddingBottom: 110 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 16, gap: 10 },
  headerCopy: { flex: 1 },
  eyebrow: { color: COLORS.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginBottom: 4 },
  title: { color: COLORS.text, fontSize: 21, lineHeight: 24, fontWeight: '800' },
  caloriePill: { minWidth: 128, height: 40, borderRadius: 16, borderWidth: 1, borderColor: '#256579', backgroundColor: '#17202A', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  flame: { color: COLORS.blueBright, fontSize: 19 },
  caloriePillValue: { color: COLORS.text, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  caloriePillTarget: { color: '#CED6E6', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  settingsButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  settingsIcon: { color: COLORS.blueBright, fontSize: 28, fontWeight: '300' },
  scannerCard: { height: 300, borderRadius: 9, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 12 },
  scannerCardPressed: { opacity: 0.82 },
  mealImage: { flex: 1, padding: 12, justifyContent: 'space-between' },
  mealImageRadius: { borderRadius: 8 },
  imageShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(3, 8, 18, 0.26)' },
  scannerTopRow: { zIndex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  scanPill: { borderRadius: 14, borderWidth: 1, borderColor: COLORS.blue, backgroundColor: 'rgba(7, 20, 39, 0.88)', paddingHorizontal: 11, paddingVertical: 6 },
  scanPillText: { color: COLORS.blueBright, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  weightBadge: { color: COLORS.blueBright, borderWidth: 1, borderColor: COLORS.blue, backgroundColor: '#071020', paddingHorizontal: 10, paddingVertical: 6, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  targetBox: { position: 'absolute', left: '39%', top: '31%', width: 82, height: 82, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.45)', alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 17, height: 17, borderColor: COLORS.blue },
  cornerTopLeft: { left: -2, top: -2, borderLeftWidth: 3, borderTopWidth: 3 },
  cornerTopRight: { right: -2, top: -2, borderRightWidth: 3, borderTopWidth: 3 },
  cornerBottomLeft: { left: -2, bottom: -2, borderLeftWidth: 3, borderBottomWidth: 3 },
  cornerBottomRight: { right: -2, bottom: -2, borderRightWidth: 3, borderBottomWidth: 3 },
  targetDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#F97316', borderWidth: 2, borderColor: '#FDBA74' },
  mealResult: { zIndex: 1, borderRadius: 5, borderWidth: 1, borderColor: COLORS.border, backgroundColor: 'rgba(7, 15, 32, 0.94)', padding: 10 },
  mealResultTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detected: { color: COLORS.blueBright, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  mealCalories: { color: COLORS.blueBright, fontSize: 19, fontWeight: '900' },
  mealResultBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  mealName: { flex: 1, color: COLORS.text, fontSize: 17, fontWeight: '800', paddingRight: 8 },
  kcalLabel: { color: COLORS.text, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  analysisError: { color: '#FDA4AF', fontSize: 9, lineHeight: 13, marginTop: 6 },
  energyCard: { backgroundColor: COLORS.panel, borderRadius: 9, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 12 },
  energyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionLabel: { color: '#AEBAD0', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  energyValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  energyValue: { color: COLORS.text, fontSize: 33, fontWeight: '900', lineHeight: 38 },
  energyUnit: { color: COLORS.blueBright, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  scorePill: { borderRadius: 5, borderWidth: 1, borderColor: COLORS.purple, backgroundColor: '#201445', paddingHorizontal: 10, paddingVertical: 7 },
  scoreText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  macrosRow: { flexDirection: 'row', gap: 8 },
  macroCard: { flex: 1, borderWidth: 1, borderRadius: 4, backgroundColor: '#131827', padding: 9 },
  macroLabel: { color: '#D9E0EE', fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  macroValue: { color: COLORS.text, fontSize: 19, fontWeight: '900', marginVertical: 3 },
  macroTrack: { height: 8, borderRadius: 4, backgroundColor: '#050A13', overflow: 'hidden', marginTop: 4 },
  macroFill: { height: '100%', borderRadius: 4 },
  detectedFoods: { borderTopWidth: 1, borderTopColor: '#203A64', marginTop: 14, paddingTop: 12, gap: 9 },
  detectedFoodsTitle: { color: '#AEBAD0', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  detectedFoodRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detectedFoodCopy: { flex: 1 },
  detectedFoodName: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  detectedFoodMeta: { color: COLORS.muted, fontSize: 9, fontWeight: '700', marginTop: 2 },
  sourcePill: { borderWidth: 1, borderColor: '#256579', borderRadius: 4, backgroundColor: '#142534', paddingHorizontal: 7, paddingVertical: 4 },
  estimatedSourcePill: { borderColor: '#A855F7', backgroundColor: '#291847' },
  sourceText: { color: COLORS.cyan, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  dailyCard: { minHeight: 86, backgroundColor: COLORS.panel, borderRadius: 9, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  ring: { width: 53, height: 53, borderRadius: 27, borderWidth: 6, borderColor: COLORS.blue, borderLeftColor: '#243450', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-18deg' }] },
  ringInner: { transform: [{ rotate: '18deg' }] },
  ringText: { color: COLORS.blueBright, fontSize: 10, fontWeight: '900' },
  dailyCopy: { flex: 1 },
  dailyValue: { color: COLORS.text, fontSize: 17, fontWeight: '900', marginTop: 3 },
  dailyTarget: { color: '#C2CBDB', fontSize: 11, fontWeight: '700' },
  remaining: { color: COLORS.blueBright, fontSize: 11, fontWeight: '700', marginTop: 2 },
  waterCard: { width: 98, alignSelf: 'stretch', borderRadius: 4, borderWidth: 1, borderColor: '#246176', backgroundColor: '#182534', padding: 10, justifyContent: 'center' },
  waterLabel: { color: COLORS.blueBright, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  waterValue: { color: COLORS.text, fontSize: 12, fontWeight: '900', marginTop: 7 },
  waterTarget: { color: COLORS.muted, fontSize: 9 },
  waterTrack: { height: 5, backgroundColor: '#354154', borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  waterFill: { height: '100%', backgroundColor: COLORS.blue, borderRadius: 3 },
  pressed: { opacity: 0.7 },
  registerButton: { height: 53, borderRadius: 12, backgroundColor: '#347CF0', borderWidth: 1, borderColor: COLORS.blueBright, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 17, shadowColor: COLORS.blue, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  registerButtonDisabled: { opacity: 0.48 },
  registerButtonPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  registerIcon: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  registerText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.2 },
  registrationError: { color: '#FDA4AF', fontSize: 10, lineHeight: 14, marginTop: -9, marginBottom: 14 },
  historyButton: { height: 49, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#0B1528', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, marginBottom: 19 },
  historyButtonPressed: { transform: [{ scale: 0.985 }], opacity: 0.82 },
  historyButtonIcon: { color: COLORS.cyan, fontSize: 18, marginRight: 10 },
  historyButtonText: { flex: 1, color: COLORS.blueBright, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  historyButtonArrow: { color: COLORS.blueBright, fontSize: 24, marginTop: -2 },
  todayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 3, marginBottom: 8 },
  countBadge: { backgroundColor: '#6D28D9', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 2 },
  countText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  mealsList: { gap: 8 },
  mealItem: { width: 220, height: 67, borderRadius: 5, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#091226', padding: 7, flexDirection: 'row', alignItems: 'center', gap: 9 },
  mealThumb: { width: 49, height: 51, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  oatsThumb: { backgroundColor: '#403728' },
  eggThumb: { backgroundColor: '#263E34' },
  thumbEmoji: { fontSize: 25 },
  mealTime: { color: COLORS.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
  mealItemName: { color: COLORS.text, fontSize: 13, fontWeight: '800', marginVertical: 2 },
  mealItemKcal: { color: COLORS.blueBright, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});
