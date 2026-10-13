import { useState } from 'react';
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
  const { mealAnalysisStatus, mealPhotoUri } = useMealCapture();
  const registered = Boolean(mealPhotoUri);
  const waterPercent = Math.min((water / 3.5) * 100, 100);

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
                <Text style={styles.caloriePillValue}>2,150 /</Text>
                <Text style={styles.caloriePillTarget}>2,800 kcal</Text>
              </View>
            </View>
            <Pressable style={styles.settingsButton} accessibilityLabel="Abrir configuración">
              <Text style={styles.settingsIcon}>◇</Text>
            </Pressable>
          </View>

          <View style={styles.scannerCard}>
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
                <Text style={styles.weightBadge}>420g</Text>
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
                  <Text style={styles.detected}>⚑ PLATO DETECTADO</Text>
                  <Text style={styles.mealCalories}>685</Text>
                </View>
                <View style={styles.mealResultBottom}>
                  <Text numberOfLines={1} style={styles.mealName}>Salmón Grillado + Quinoa</Text>
                  <Text style={styles.kcalLabel}>KCAL</Text>
                </View>
              </View>
            </ImageBackground>
          </View>

          <View style={styles.energyCard}>
            <View style={styles.energyTop}>
              <View>
                <Text style={styles.sectionLabel}>VALOR ENERGÉTICO</Text>
                <View style={styles.energyValueRow}>
                  <Text style={styles.energyValue}>685</Text>
                  <Text style={styles.energyUnit}>KCAL</Text>
                </View>
              </View>
              <View style={styles.scorePill}><Text style={styles.scoreText}>◎ Score: 96/100</Text></View>
            </View>
            <View style={styles.macrosRow}>
              <MacroCard label="PROTEÍNAS" value="52g" progress={82} color={COLORS.blue} />
              <MacroCard label="CARBOHIDRATOS" value="44g" progress={61} color="#A855F7" />
              <MacroCard label="GRASAS" value="21g" progress={46} color="#9333EA" />
            </View>
          </View>

          <View style={styles.dailyCard}>
            <View style={styles.ring}><View style={styles.ringInner}><Text style={styles.ringText}>77%</Text></View></View>
            <View style={styles.dailyCopy}>
              <Text style={styles.sectionLabel}>CUOTA DIARIA</Text>
              <Text style={styles.dailyValue}>2,150 <Text style={styles.dailyTarget}>/ 2,800 kcal</Text></Text>
              <Text style={styles.remaining}>Restante: 650 kcal</Text>
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
            disabled={isOpeningCamera}
            onPress={openCamera}
            style={({ pressed }) => [styles.registerButton, pressed && styles.registerButtonPressed]}
          >
            <Text style={styles.registerIcon}>{isOpeningCamera ? '…' : registered ? '✓' : '⊕'}</Text>
            <Text style={styles.registerText}>{isOpeningCamera ? '[ ABRIENDO CÁMARA ]' : registered ? '[ TOMAR OTRA FOTO ]' : '[ REGISTRAR COMIDA ]'}</Text>
          </Pressable>

          <View style={styles.todayHeader}>
            <Text style={styles.sectionLabel}>COMIDAS DE HOY</Text>
            <View style={styles.countBadge}><Text style={styles.countText}>{registered ? '3' : '2'} REGISTROS</Text></View>
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
  registerButtonPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  registerIcon: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  registerText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.2 },
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
