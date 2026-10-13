import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AppSection = 'STATUS' | 'NUTRITION' | 'RUNNING' | 'QUESTS';

type BottomNavProps = {
  active: AppSection;
  onNavigate: (section: 'NUTRITION' | 'RUNNING') => void;
};

const items: { icon: string; label: AppSection; enabled: boolean }[] = [
  { icon: '◎', label: 'STATUS', enabled: false },
  { icon: '⌗', label: 'NUTRITION', enabled: true },
  { icon: 'ϟ', label: 'RUNNING', enabled: true },
  { icon: '☑', label: 'QUESTS', enabled: false },
];

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        {items.map((item) => {
          const selected = active === item.label;

          return (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={item.label}
              disabled={!item.enabled}
              onPress={() => item.enabled && onNavigate(item.label as 'NUTRITION' | 'RUNNING')}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <Text style={[styles.icon, selected && styles.active]}>{item.icon}</Text>
              <Text style={[styles.label, selected && styles.active]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    borderTopWidth: 1,
    borderTopColor: '#16355E',
    backgroundColor: '#050A14',
  },
  container: { height: 74, flexDirection: 'row' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  icon: { color: '#C3CCDB', fontSize: 23, fontWeight: '800' },
  label: { color: '#C3CCDB', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  active: { color: '#60A5FA' },
  pressed: { opacity: 0.65 },
});
