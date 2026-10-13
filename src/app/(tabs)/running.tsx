import { useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  background: '#050912',
  panel: '#0B1222',
  panelRaised: '#101A32',
  blue: '#3B82F6',
  blueBright: '#60A5FA',
  purple: '#9333EA',
  purpleBright: '#B05CFF',
  cyan: '#22D3EE',
  text: '#F5F7FF',
  muted: '#A7B2C8',
  border: '#244780',
  red: '#FB7185',
};

const routePoints = [
  { x: 0.05, y: 0.81 },
  { x: 0.24, y: 0.59 },
  { x: 0.48, y: 0.49 },
  { x: 0.58, y: 0.36 },
  { x: 0.78, y: 0.29 },
  { x: 0.89, y: 0.17 },
];

function RouteChart() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };

  return (
    <View style={styles.chart} onLayout={handleLayout}>
      {size.width > 0 && routePoints.slice(0, -1).map((point, index) => {
        const next = routePoints[index + 1];
        const x1 = point.x * size.width;
        const y1 = point.y * size.height;
        const x2 = next.x * size.width;
        const y2 = next.y * size.height;
        const length = Math.hypot(x2 - x1, y2 - y1);
        const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

        return (
          <View
            key={`${point.x}-${point.y}`}
            style={[
              styles.routeSegment,
              {
                left: x1,
                top: y1,
                width: length,
                transform: [{ rotate: `${angle}deg` }],
              },
            ]}
          />
        );
      })}
      {size.width > 0 && routePoints.slice(1).map((point, index) => (
        <View
          key={`node-${point.x}-${point.y}`}
          style={[
            styles.routeNode,
            index === routePoints.length - 2 && styles.routeNodeLast,
            { left: point.x * size.width - 5, top: point.y * size.height - 5 },
          ]}
        />
      ))}
    </View>
  );
}

type MetricProps = {
  icon?: string;
  label: string;
  value: string;
  unit?: string;
  accent?: 'blue' | 'purple';
};

function Metric({ icon, label, value, unit, accent = 'blue' }: MetricProps) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricHeading}>
        {icon ? <Text style={[styles.metricIcon, accent === 'purple' && styles.purpleText]}>{icon}</Text> : null}
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue}>{value}<Text style={styles.metricUnit}>{unit}</Text></Text>
    </View>
  );
}

export default function RunningScreen() {
  const [sessionState, setSessionState] = useState<'running' | 'paused' | 'finished'>('running');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>● [ENTRENAMIENTO GPS ACTIVO]</Text>
              <View style={styles.titleRow}>
                <Text style={styles.title}>Running</Text>
                <View style={styles.energyBadge}><Text style={styles.energyBadgeText}>ENERGÍA: 82%</Text></View>
              </View>
            </View>
            <View style={styles.batteryBlock}>
              <View style={styles.batteryRow}><Text style={styles.batteryLabel}>BAT</Text><View style={styles.batteryTrack}><View style={[styles.batteryFill, { width: '76%' }]} /></View></View>
              <View style={styles.batteryRow}><Text style={styles.batteryLabel}>ESF</Text><View style={styles.batteryTrack}><View style={[styles.batteryFill, styles.effortFill, { width: '100%' }]} /></View></View>
            </View>
            <Pressable style={styles.settingsButton} accessibilityLabel="Abrir configuración"><Text style={styles.settingsIcon}>◇</Text></Pressable>
          </View>

          <View style={styles.missionCard}>
            <View>
              <Text style={styles.missionLabel}>● MISIÓN ACTIVA</Text>
              <Text style={styles.missionValue}>Objetivo: <Text style={styles.mono}>10.00 KM</Text></Text>
            </View>
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>TIEMPO LÍMITE</Text>
              <View style={styles.timeBadge}><Text style={styles.timeBadgeText}>◴ 02:55</Text></View>
            </View>
          </View>

          <View style={styles.routeCard}>
            <View style={styles.routeTopRow}>
              <View style={styles.routeBadge}><Text style={styles.routeBadgeText}>● RUTA GPS: CIRCUITO URBANO</Text></View>
              <View style={styles.gpsButton}><Text style={styles.gpsIcon}>◎</Text></View>
            </View>
            <RouteChart />
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.distanceLabel}>DISTANCIA TOTAL</Text>
            <Text style={styles.distanceValue}>8.46<Text style={styles.distanceUnit}> KM</Text></Text>
            <View style={styles.divider} />
            <View style={styles.metricsGrid}>
              <Metric label="RITMO MEDIO" value="4:28" unit=" KM" />
              <Metric label="TIEMPO" value="42:05" />
              <Metric icon="⚑" label="CADENCIA" value="178" unit=" KM" accent="purple" />
              <Metric icon="♨" label="CALORÍAS" value="590" unit=" KM" />
            </View>
          </View>

          <View style={styles.heartCard}>
            <View style={styles.heartHeader}>
              <Text style={styles.heartLabel}><Text style={styles.bolt}>ϟ</Text> ZONA CARDÍACA</Text>
              <View style={styles.zoneBadge}><Text style={styles.zoneText}>ZONA 4: UMBRAL</Text></View>
            </View>
            <View style={styles.zoneBars}>
              {[COLORS.purple, COLORS.purple, COLORS.purple, COLORS.blue, '#39404B'].map((color, index) => (
                <View key={`${color}-${index}`} style={[styles.zoneBar, { backgroundColor: color }]} />
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSessionState((current) => current === 'paused' ? 'running' : 'paused')}
              disabled={sessionState === 'finished'}
              style={({ pressed }) => [styles.actionButton, styles.pauseButton, pressed && styles.pressed, sessionState === 'finished' && styles.disabled]}
            >
              <Text style={styles.actionText}>{sessionState === 'paused' ? '▷  [ REANUDAR ]' : 'Ⅱ  [ PAUSAR ]'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSessionState('finished')}
              style={({ pressed }) => [styles.actionButton, styles.finishButton, pressed && styles.pressed]}
            >
              <Text style={styles.actionText}>{sessionState === 'finished' ? '✓  [ FINALIZADO ]' : '□  [ FINALIZAR ]'}</Text>
            </Pressable>
          </View>
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 16, paddingBottom: 116 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, paddingBottom: 18 },
  headerCopy: { flex: 1 },
  eyebrow: { color: COLORS.blueBright, fontSize: 8, fontWeight: '900', letterSpacing: 1.1, marginBottom: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { color: COLORS.text, fontSize: 19, fontWeight: '900' },
  energyBadge: { backgroundColor: '#3B1D72', borderWidth: 1, borderColor: COLORS.purpleBright, paddingHorizontal: 7, paddingVertical: 4 },
  energyBadgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  batteryBlock: { width: 75, gap: 4 },
  batteryRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  batteryLabel: { width: 19, color: COLORS.blueBright, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  batteryTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#323849', overflow: 'hidden' },
  batteryFill: { height: '100%', backgroundColor: COLORS.blue, borderRadius: 3 },
  effortFill: { backgroundColor: COLORS.purple },
  settingsButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  settingsIcon: { color: COLORS.blueBright, fontSize: 28 },
  missionCard: { minHeight: 70, padding: 12, marginBottom: 13, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.panel, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  missionLabel: { color: COLORS.blueBright, fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginBottom: 5 },
  missionValue: { color: COLORS.text, fontSize: 17, fontWeight: '900' },
  mono: { letterSpacing: 1 },
  timeBlock: { alignItems: 'flex-end', gap: 4 },
  timeLabel: { color: COLORS.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  timeBadge: { borderWidth: 1, borderColor: '#E4465F', backgroundColor: '#321522', paddingHorizontal: 11, paddingVertical: 7 },
  timeBadgeText: { color: COLORS.text, fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  routeCard: { height: 255, padding: 12, marginBottom: 13, borderRadius: 8, borderWidth: 1, borderColor: '#087FA7', backgroundColor: '#080D18', overflow: 'hidden' },
  routeTopRow: { flexDirection: 'row', justifyContent: 'space-between', zIndex: 2 },
  routeBadge: { borderWidth: 1, borderColor: '#187DB8', backgroundColor: '#071326', paddingHorizontal: 7, paddingVertical: 5 },
  routeBadgeText: { color: COLORS.cyan, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  gpsButton: { width: 32, height: 32, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.panelRaised, alignItems: 'center', justifyContent: 'center' },
  gpsIcon: { color: COLORS.blue, fontSize: 25, fontWeight: '900' },
  chart: { flex: 1, marginTop: 4 },
  routeSegment: { position: 'absolute', height: 4, borderRadius: 2, backgroundColor: '#814BFF', transformOrigin: 'left center' },
  routeNode: { position: 'absolute', width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#813EFF', backgroundColor: '#101324' },
  routeNodeLast: { width: 17, height: 17, borderRadius: 9, marginLeft: -3.5, marginTop: -3.5, borderWidth: 3, borderColor: COLORS.blue, backgroundColor: '#132141', shadowColor: COLORS.blue, shadowOpacity: 0.8, shadowRadius: 7 },
  statsCard: { padding: 12, marginBottom: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.panel },
  distanceLabel: { color: COLORS.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.3, textAlign: 'center', marginTop: 8 },
  distanceValue: { color: COLORS.text, fontSize: 45, fontWeight: '900', letterSpacing: -1.5, textAlign: 'center', marginVertical: 5 },
  distanceUnit: { fontSize: 18, letterSpacing: 0 },
  divider: { height: 1, backgroundColor: '#19294A', marginBottom: 8 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { width: '48.7%', minHeight: 67, padding: 10, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#101A33', alignItems: 'center', justifyContent: 'center' },
  metricHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  metricIcon: { color: COLORS.blue, fontSize: 19, fontWeight: '900' },
  purpleText: { color: COLORS.purpleBright },
  metricLabel: { color: COLORS.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  metricValue: { color: COLORS.text, fontSize: 26, fontWeight: '900', marginTop: 5 },
  metricUnit: { fontSize: 17 },
  heartCard: { minHeight: 62, padding: 12, marginBottom: 16, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.panel },
  heartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  heartLabel: { color: COLORS.text, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  bolt: { color: COLORS.blue, fontSize: 24 },
  zoneBadge: { backgroundColor: COLORS.blue, borderWidth: 1, borderColor: COLORS.blueBright, paddingHorizontal: 10, paddingVertical: 4 },
  zoneText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  zoneBars: { flexDirection: 'row', gap: 6 },
  zoneBar: { flex: 1, height: 6, borderRadius: 3 },
  actions: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, height: 53, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  pauseButton: { backgroundColor: '#2875EC', borderColor: COLORS.blueBright },
  finishButton: { backgroundColor: '#7C2DE2', borderColor: COLORS.purpleBright },
  actionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1.2 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
});
