import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RegisteredMealDTO } from '../../supabase/functions/get-all-registered-foods/dtos/GetAllRegisteredFoodsResponseDTO';
import { BottomNav } from '../components/BottomNav';
import { getAllRegisteredFoods } from '../services/getAllRegisteredFoods';
import {
  DAILY_CALORIE_TARGET,
  getDailyNutritionSummary,
} from '../utils/dailyNutrition';

const COLORS = {
  background: '#090C12', panel: '#15191F', panelRaised: '#1D222A',
  blue: '#3688FF', blueBright: '#67B1FF', purple: '#8E3DFF',
  purpleDark: '#281150', cyan: '#45D7E8', text: '#F5F7FB',
  muted: '#AEB8C7', border: '#26303C', borderBlue: '#28568F',
};
const TARGET = DAILY_CALORIE_TARGET;
const MACRO_TARGETS = { protein: 180, carbohydrates: 260, fat: 70 };
const PAGE_SIZE = 30;
const MONO = Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' });
type HistoryMode = 'day' | 'month' | 'year';
type HistorySection = { title: string; data: RegisteredMealDTO[] };

function rounded(value: number) { return Math.round(value).toLocaleString('es-AR'); }
function dateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function isToday(value: string) { return dateKey(value) === dateKey(new Date().toISOString()); }
function currentDate() {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' })
    .format(new Date()).replace('.', '').toUpperCase();
}
function periodKey(value: string, mode: HistoryMode) {
  const date = new Date(value);
  if (mode === 'year') return String(date.getFullYear());
  if (mode === 'month') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return dateKey(value);
}
function periodLabel(value: string, mode: HistoryMode) {
  const date = new Date(value);
  if (mode === 'year') return String(date.getFullYear());
  if (mode === 'month') return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(date).toUpperCase();
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(date).toUpperCase();
}
function percent(value: number, target: number) {
  return target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
}
function categoryFor(value: string) {
  const hour = new Date(value).getHours();
  if (hour < 11) return { label: 'DESAYUNO', icon: '◉', accent: COLORS.blue };
  if (hour < 14) return { label: 'SNACK PRE-ENTRENO', icon: 'ϟ', accent: COLORS.blue };
  if (hour < 17) return { label: 'ALMUERZO', icon: '≋', accent: COLORS.purple };
  if (hour < 20) return { label: 'MERIENDA', icon: '♜', accent: COLORS.blue };
  return { label: 'CENA', icon: '◇', accent: COLORS.purple };
}

function MacroMetric({ label, value, target, accent }: { label: string; value: number; target: number; accent: string }) {
  return (
    <View style={[styles.macroMetric, { borderLeftColor: accent }]}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>{rounded(value)} <Text style={styles.macroTarget}>/ {target}g</Text></Text>
      <View style={styles.macroTrack}><View style={[styles.macroFill, { width: `${percent(value, target)}%`, backgroundColor: accent }]} /></View>
    </View>
  );
}

function MealCard({ meal }: { meal: RegisteredMealDTO }) {
  const category = categoryFor(meal.consumedAt);
  const name = meal.foods.map((food) => food.name).join(' + ');
  const time = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(meal.consumedAt));
  return (
    <View style={styles.mealCard}>
      <View style={[styles.mealIcon, { borderColor: category.accent }]}><Text style={[styles.mealIconText, { color: category.accent }]}>{category.icon}</Text></View>
      <View style={styles.mealContent}>
        <View style={styles.mealMeta}><Text style={styles.mealTime}>{time}</Text><Text style={styles.metaDot}>•</Text><Text style={[styles.mealCategory, { color: category.accent }]}>{category.label}</Text></View>
        <Text numberOfLines={2} style={styles.mealName}>{name}</Text>
        <Text style={styles.mealMacros}>P: {rounded(meal.totalNutrition.protein)}g  •  C: {rounded(meal.totalNutrition.carbohydrates)}g  •  G: {rounded(meal.totalNutrition.fat)}g</Text>
      </View>
      <View style={styles.mealCalories}><Text style={styles.mealCaloriesValue}>{rounded(meal.totalNutrition.calories)}</Text><Text style={[styles.mealCaloriesUnit, { color: category.accent }]}>KCAL</Text><Text style={styles.mealAction}>≡⌁</Text></View>
    </View>
  );
}

function StateCard({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <View style={[styles.stateCard, error && styles.stateCardError]}>
      {error ? <><Text style={styles.stateErrorTitle}>NO SE PUDO CARGAR</Text><Text style={styles.stateErrorText}>{error}</Text><Pressable onPress={onRetry} style={styles.retryButton}><Text style={styles.retryText}>[ REINTENTAR ]</Text></Pressable></>
        : <><ActivityIndicator color={COLORS.blueBright} /><Text style={styles.loadingText}>CARGANDO MATRIZ NUTRICIONAL...</Text></>}
    </View>
  );
}

export default function MealsScreen() {
  const [meals, setMeals] = useState<RegisteredMealDTO[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<HistoryMode>('day');

  const fetchMeals = useCallback(async (nextPage: number, replace: boolean) => {
    if (replace) setLoading(true); else setLoadingMore(true);
    setError(null);
    try {
      const response = await getAllRegisteredFoods({ page: nextPage, pageSize: PAGE_SIZE });
      setMeals((current) => replace ? response.items : [...current, ...response.items]);
      setPage(response.pagination.page);
      setHasMore(response.pagination.hasMore);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'No se pudo cargar el historial');
    } finally { setLoading(false); setLoadingMore(false); }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void fetchMeals(1, true);
    }, [fetchMeals]),
  );

  const dailySummary = useMemo(() => getDailyNutritionSummary(meals), [meals]);
  const todayMeals = dailySummary.meals;
  const totals = dailySummary.totals;
  const progress = percent(totals.calories, TARGET);
  const remaining = Math.max(0, TARGET - totals.calories);
  const average = meals.length ? meals.reduce((sum, meal) => sum + meal.totalNutrition.calories, 0) / meals.length : 0;
  const sections = useMemo<HistorySection[]>(() => {
    const groups = new Map<string, HistorySection>();
    meals.filter((meal) => !isToday(meal.consumedAt)).forEach((meal) => {
      const key = periodKey(meal.consumedAt, mode);
      const group = groups.get(key);
      if (group) group.data.push(meal);
      else groups.set(key, { title: periodLabel(meal.consumedAt, mode), data: [meal] });
    });
    return Array.from(groups.values());
  }, [meals, mode]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.screen}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.mealId}
          renderItem={({ item }) => <MealCard meal={item} />}
          renderSectionHeader={({ section }) => <View style={styles.historyHeader}><Text style={styles.historyTitle}>{section.title}</Text><Text style={styles.historyCount}>{section.data.length} REGISTROS</Text></View>}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          ListHeaderComponent={<>
            <View style={styles.topHeader}>
              <View style={styles.brand}><Text style={styles.eyebrow}>● NUTRICIÓN DEPORTIVA</Text><Text style={styles.brandTitle}>Recomposición{`\n`}Corporal</Text></View>
              <View style={styles.caloriePill}><Text style={styles.flame}>♨</Text><Text style={styles.caloriePillText}>{rounded(totals.calories)} /{`\n`}{rounded(TARGET)} kcal</Text></View>
              <View style={styles.settings}><Text style={styles.settingsIcon}>⬡</Text></View>
            </View>
            <View style={styles.titleBanner}>
              <View style={styles.titleCopy}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.matrixLabel}>● MATRIZ NUTRICIONAL // HISTORIAL</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.pageTitle}>REGISTRO DE COMIDAS</Text></View>
              <View style={styles.dateBadge}><Text style={styles.dateIcon}>▣</Text><Text style={styles.dateText}>HOY, {currentDate()}</Text></View>
            </View>
            {loading || error ? <StateCard error={error} onRetry={() => void fetchMeals(1, true)} /> : <>
              <View style={styles.dailyCard}>
                <View style={[styles.corner, styles.ctl]} /><View style={[styles.corner, styles.ctr]} /><View style={[styles.corner, styles.cbl]} /><View style={[styles.corner, styles.cbr]} />
                <View style={styles.dailyHeader}><View style={styles.dailyHeading}><View style={styles.dailyIconBox}><Text style={styles.dailyIcon}>♨</Text></View><Text style={styles.dailyTitle}>CUOTA DIARIA DE CALORÍAS</Text></View><View style={styles.targetBadge}><Text style={styles.targetText}>OBJETIVO: {rounded(TARGET)}</Text></View></View>
                <View style={styles.calorieMain}><View style={styles.calorieBigRow}><Text style={styles.calorieBig}>{rounded(totals.calories)}</Text><Text style={styles.calorieSlash}> /{`\n`}{rounded(TARGET)}</Text><Text style={styles.kcalText}>KCAL</Text></View><View style={styles.remainingBox}><Text style={styles.remainingLabel}>RESTANTE:</Text><Text style={styles.remainingValue}>{rounded(remaining)}{`\n`}kcal</Text></View></View>
                <View style={styles.progressTrack}><View style={[styles.progressBlue, { width: `${Math.min(progress, 76)}%` }]} />{progress > 76 ? <View style={[styles.progressPurple, { width: `${progress - 76}%` }]} /> : null}</View>
                <View style={styles.progressLabels}><Text style={styles.progressSide}>0 KCAL</Text><Text style={styles.progressCenter}>{progress}% ASIMILADO</Text><Text style={styles.progressSide}>MAX {rounded(TARGET)}</Text></View>
                <View style={styles.macroGrid}><MacroMetric label="PROTEÍNAS" value={totals.protein} target={MACRO_TARGETS.protein} accent={COLORS.blue} /><MacroMetric label="CARBOS" value={totals.carbohydrates} target={MACRO_TARGETS.carbohydrates} accent={COLORS.blueBright} /><MacroMetric label="GRASAS" value={totals.fat} target={MACRO_TARGETS.fat} accent={COLORS.purple} /></View>
              </View>
              <View style={styles.mealsHeading}><Text style={styles.mealsHeadingText}>[ COMIDAS REGISTRADAS HOY ]</Text><View style={styles.countBadge}><Text style={styles.countText}>{todayMeals.length} REGISTROS</Text></View></View>
              {todayMeals.length ? <View style={styles.todayMeals}>{todayMeals.map((meal) => <MealCard key={meal.mealId} meal={meal} />)}</View> : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>SIN REGISTROS PARA HOY</Text><Text style={styles.emptyText}>Registrá una comida para iniciar tu historial diario.</Text></View>}
              <Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)')} style={({ pressed }) => [styles.newMealButton, pressed && styles.pressed]}><Text style={styles.plusIcon}>⊕</Text><Text style={styles.newMealText}>[ + REGISTRAR NUEVA COMIDA ]</Text></Pressable>
              <View style={styles.periodCard}>
                <View style={styles.periodHeader}><Text style={styles.periodTitle}>⌁ PERÍODO DE VISUALIZACIÓN</Text><Text style={styles.filterActive}>FILTRO ACTIVO</Text></View>
                <View style={styles.periodSelector}>{(['day', 'month', 'year'] as HistoryMode[]).map((item) => <Pressable key={item} onPress={() => setMode(item)} style={[styles.periodButton, mode === item && styles.periodButtonActive]}><Text style={[styles.periodText, mode === item && styles.periodTextActive]}>[ {item === 'day' ? 'DÍA' : item === 'month' ? 'MES' : 'AÑO'} ]</Text></Pressable>)}</View>
                <View style={styles.averageBox}><Text style={styles.averageText}>Promedio Diario: <Text style={styles.averageStrong}>{rounded(average)} kcal</Text>  <Text style={styles.averageDot}>•</Text>{`\n`}Cumplimiento: <Text style={styles.compliance}>{progress}%</Text></Text></View>
              </View>
              {sections.length ? <View style={styles.previousTitle}><Text style={styles.mealsHeadingText}>[ HISTORIAL ANTERIOR ]</Text></View> : null}
            </>}
          </>}
          ListFooterComponent={hasMore ? <Pressable disabled={loadingMore} onPress={() => void fetchMeals(page + 1, false)} style={styles.loadMore}>{loadingMore ? <ActivityIndicator color={COLORS.blueBright} /> : <Text style={styles.loadMoreText}>[ CARGAR MÁS REGISTROS ]</Text>}</Pressable> : <View style={styles.footer} />}
        />
        <BottomNav active="NUTRITION" onNavigate={(section) => router.replace(section === 'RUNNING' ? '/running' : '/(tabs)')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background }, screen: { flex: 1, backgroundColor: COLORS.background }, content: { paddingHorizontal: 16, paddingBottom: 24 },
  topHeader: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4, paddingBottom: 14 }, brand: { flex: 1 },
  eyebrow: { color: '#B8EAF1', fontFamily: MONO, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginBottom: 5 }, brandTitle: { color: COLORS.text, fontSize: 23, lineHeight: 29, fontWeight: '900' },
  caloriePill: { width: 132, height: 49, borderRadius: 18, borderWidth: 1, borderColor: '#256579', backgroundColor: '#242A30', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, flame: { color: COLORS.blue, fontSize: 22 }, caloriePillText: { color: COLORS.text, fontFamily: MONO, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, lineHeight: 13 },
  settings: { width: 55, height: 55, borderRadius: 11, borderWidth: 1, borderColor: COLORS.borderBlue, backgroundColor: '#0C1423', alignItems: 'center', justifyContent: 'center' }, settingsIcon: { color: COLORS.blueBright, fontSize: 35 },
  titleBanner: { minHeight: 76, borderLeftWidth: 2, borderLeftColor: COLORS.blue, backgroundColor: '#0D1016', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, titleCopy: { flex: 1, minWidth: 0 }, matrixLabel: { color: COLORS.muted, fontFamily: MONO, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginBottom: 5 }, pageTitle: { color: COLORS.text, fontSize: 21, fontWeight: '900' },
  dateBadge: { height: 39, borderWidth: 1, borderColor: COLORS.borderBlue, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 }, dateIcon: { color: COLORS.blue, fontSize: 17 }, dateText: { color: COLORS.text, fontFamily: MONO, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  stateCard: { minHeight: 170, borderWidth: 1, borderColor: COLORS.borderBlue, backgroundColor: '#0C111A', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 22, marginBottom: 18 }, stateCardError: { borderColor: '#8A234B' }, stateErrorTitle: { color: '#FF9BB8', fontFamily: MONO, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 }, stateErrorText: { color: COLORS.muted, fontSize: 10, lineHeight: 15, textAlign: 'center' }, retryButton: { borderWidth: 1, borderColor: COLORS.blue, paddingHorizontal: 18, paddingVertical: 9 }, retryText: { color: COLORS.blueBright, fontFamily: MONO, fontSize: 9, fontWeight: '900' }, loadingText: { color: COLORS.blueBright, fontFamily: MONO, fontSize: 9, fontWeight: '900' },
  dailyCard: { position: 'relative', borderWidth: 1, borderColor: COLORS.borderBlue, backgroundColor: '#08101F', padding: 16, marginBottom: 20, overflow: 'hidden' }, corner: { position: 'absolute', width: 12, height: 12, borderColor: COLORS.blue }, ctl: { left: 0, top: 0, borderLeftWidth: 3, borderTopWidth: 3 }, ctr: { right: 0, top: 0, borderRightWidth: 3, borderTopWidth: 3 }, cbl: { left: 0, bottom: 0, borderLeftWidth: 3, borderBottomWidth: 3, borderColor: COLORS.purple }, cbr: { right: 0, bottom: 0, borderRightWidth: 3, borderBottomWidth: 3, borderColor: COLORS.purple },
  dailyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }, dailyHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 }, dailyIconBox: { width: 31, height: 31, borderWidth: 1, borderColor: COLORS.borderBlue, alignItems: 'center', justifyContent: 'center' }, dailyIcon: { color: COLORS.blue, fontSize: 18 }, dailyTitle: { color: COLORS.text, fontFamily: MONO, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 }, targetBadge: { borderWidth: 1, borderColor: COLORS.borderBlue, backgroundColor: '#102039', paddingHorizontal: 10, paddingVertical: 6 }, targetText: { color: COLORS.blueBright, fontFamily: MONO, fontSize: 9, fontWeight: '900' },
  calorieMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 17 }, calorieBigRow: { flexDirection: 'row', alignItems: 'center' }, calorieBig: { color: COLORS.text, fontSize: 34, fontWeight: '900' }, calorieSlash: { color: COLORS.text, fontFamily: MONO, fontSize: 17, fontWeight: '900', lineHeight: 22, marginLeft: 7 }, kcalText: { color: COLORS.blueBright, fontFamily: MONO, fontSize: 9, fontWeight: '900', marginLeft: 16 }, remainingBox: { minWidth: 170, minHeight: 46, borderWidth: 1, borderColor: COLORS.purple, backgroundColor: COLORS.purpleDark, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, remainingLabel: { color: '#D5B9FF', fontFamily: MONO, fontSize: 10, fontWeight: '900' }, remainingValue: { color: COLORS.text, fontFamily: MONO, fontSize: 14, lineHeight: 15, fontWeight: '900', textAlign: 'center' },
  progressTrack: { height: 10, borderWidth: 1, borderColor: '#343C47', backgroundColor: '#222933', flexDirection: 'row', overflow: 'hidden' }, progressBlue: { height: '100%', backgroundColor: COLORS.blue }, progressPurple: { height: '100%', backgroundColor: COLORS.purple }, progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9, marginBottom: 21 }, progressSide: { color: COLORS.muted, fontFamily: MONO, fontSize: 9, fontWeight: '900' }, progressCenter: { color: COLORS.blue, fontFamily: MONO, fontSize: 9, fontWeight: '900' },
  macroGrid: { flexDirection: 'row', gap: 10 }, macroMetric: { flex: 1, minHeight: 89, borderLeftWidth: 2, backgroundColor: '#20242A', padding: 11 }, macroLabel: { color: COLORS.muted, fontFamily: MONO, fontSize: 10, fontWeight: '900' }, macroValue: { color: COLORS.text, fontFamily: MONO, fontSize: 18, fontWeight: '900', marginTop: 9 }, macroTarget: { color: COLORS.muted, fontSize: 10 }, macroTrack: { height: 7, backgroundColor: '#090D12', marginTop: 9 }, macroFill: { height: '100%' },
  mealsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11, paddingHorizontal: 3 }, mealsHeadingText: { color: COLORS.text, fontFamily: MONO, fontSize: 11, fontWeight: '900', letterSpacing: 1.3 }, countBadge: { borderWidth: 1, borderColor: COLORS.purple, backgroundColor: '#251044', paddingHorizontal: 13, paddingVertical: 6 }, countText: { color: '#E2D3FF', fontFamily: MONO, fontSize: 8, fontWeight: '900' }, todayMeals: { marginBottom: 8 },
  mealCard: { minHeight: 124, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.panel, padding: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 10 }, mealIcon: { width: 44, height: 44, borderWidth: 1, backgroundColor: '#111820', alignItems: 'center', justifyContent: 'center' }, mealIconText: { fontSize: 22, fontWeight: '900' }, mealContent: { flex: 1 }, mealMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 }, mealTime: { color: COLORS.muted, fontFamily: MONO, fontSize: 10, fontWeight: '900' }, metaDot: { color: COLORS.blue }, mealCategory: { fontFamily: MONO, fontSize: 9, fontWeight: '900' }, mealName: { color: COLORS.text, fontSize: 16, lineHeight: 21, fontWeight: '800', marginTop: 8 }, mealMacros: { color: '#C8CFD8', fontFamily: MONO, fontSize: 9, fontWeight: '900', marginTop: 9 }, mealCalories: { minWidth: 52, alignItems: 'flex-end' }, mealCaloriesValue: { color: COLORS.text, fontFamily: MONO, fontSize: 20, fontWeight: '900' }, mealCaloriesUnit: { fontFamily: MONO, fontSize: 8, fontWeight: '900' }, mealAction: { color: COLORS.muted, fontSize: 18, marginTop: 16 },
  emptyCard: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.panel, alignItems: 'center', padding: 28, marginBottom: 18 }, emptyTitle: { color: COLORS.text, fontFamily: MONO, fontSize: 11, fontWeight: '900' }, emptyText: { color: COLORS.muted, fontSize: 10, marginTop: 7 },
  newMealButton: { minHeight: 63, borderWidth: 1, borderColor: COLORS.blueBright, backgroundColor: '#347CF0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 13, marginBottom: 22, shadowColor: COLORS.blue, shadowOpacity: 0.35, shadowRadius: 14 }, plusIcon: { color: COLORS.text, fontSize: 27, fontWeight: '900' }, newMealText: { color: COLORS.text, fontFamily: MONO, fontSize: 14, fontWeight: '900' },
  periodCard: { borderWidth: 1, borderColor: COLORS.borderBlue, backgroundColor: '#0A0E14', padding: 16, marginBottom: 20 }, periodHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }, periodTitle: { color: COLORS.text, fontFamily: MONO, fontSize: 10, fontWeight: '900' }, filterActive: { color: COLORS.blueBright, fontFamily: MONO, fontSize: 8, fontWeight: '900' }, periodSelector: { height: 51, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.panel, padding: 5, flexDirection: 'row', marginBottom: 13 }, periodButton: { flex: 1, alignItems: 'center', justifyContent: 'center' }, periodButtonActive: { backgroundColor: '#5A3CF1', borderLeftWidth: 6, borderLeftColor: COLORS.blue }, periodText: { color: '#C5CCD6', fontFamily: MONO, fontSize: 10, fontWeight: '900' }, periodTextActive: { color: COLORS.text }, averageBox: { minHeight: 78, borderLeftWidth: 2, borderLeftColor: COLORS.blue, backgroundColor: '#1C2128', justifyContent: 'center' }, averageText: { color: '#D3D8E0', fontFamily: MONO, fontSize: 11, lineHeight: 25, textAlign: 'center' }, averageStrong: { color: COLORS.text, fontWeight: '900' }, averageDot: { color: COLORS.blue }, compliance: { color: COLORS.blue, fontWeight: '900' },
  previousTitle: { borderTopWidth: 1, borderTopColor: COLORS.borderBlue, paddingTop: 15, marginBottom: 8 }, historyHeader: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.borderBlue, paddingVertical: 10 }, historyTitle: { color: COLORS.blueBright, fontFamily: MONO, fontSize: 9, fontWeight: '900' }, historyCount: { color: COLORS.muted, fontFamily: MONO, fontSize: 8, fontWeight: '900' }, loadMore: { minHeight: 48, borderWidth: 1, borderColor: COLORS.borderBlue, alignItems: 'center', justifyContent: 'center' }, loadMoreText: { color: COLORS.blueBright, fontFamily: MONO, fontSize: 9, fontWeight: '900' }, footer: { height: 8 }, pressed: { opacity: 0.74 },
});
