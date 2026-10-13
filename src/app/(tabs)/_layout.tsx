import { Tabs } from 'expo-router';
import { BottomNav } from '../../components/BottomNav';

export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="none"
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => {
        const currentRoute = state.routes[state.index]?.name;
        const active = currentRoute === 'running' ? 'RUNNING' : 'NUTRITION';

        return (
          <BottomNav
            active={active}
            onNavigate={(section) => {
              const routeName = section === 'RUNNING' ? 'running' : 'index';
              navigation.navigate(routeName);
            }}
          />
        );
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Nutrition' }} />
      <Tabs.Screen name="running" options={{ title: 'Running' }} />
    </Tabs>
  );
}
