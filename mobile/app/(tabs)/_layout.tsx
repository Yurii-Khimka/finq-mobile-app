import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fontSize } from '../../src/tokens';
import { useTheme } from '../../src/context/ThemeContext';

type TabIcon = React.ComponentProps<typeof Ionicons>['name'];

const tabs: { name: string; title: string; icon: TabIcon }[] = [
  { name: 'index', title: 'Home', icon: 'wallet-outline' },
  { name: 'expense', title: 'Expense', icon: 'remove-circle-outline' },
  { name: 'income', title: 'Income', icon: 'add-circle-outline' },
  { name: 'history', title: 'History', icon: 'time-outline' },
  { name: 'audit', title: 'Audit', icon: 'shield-checkmark-outline' },
  { name: 'settings', title: 'Settings', icon: 'settings-outline' },
];

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: fontSize.xs },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
