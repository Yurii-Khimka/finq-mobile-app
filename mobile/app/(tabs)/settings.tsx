import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fontSize, spacing } from '../../src/tokens';
import { clearToken } from '../../src/store/auth';

export default function SettingsScreen() {
  const router = useRouter();

  async function handleLogout() {
    await clearToken();
    router.replace('/(auth)/login');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Display currency, sync, and preferences</Text>

      <View style={styles.spacer} />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  spacer: { height: spacing.xl },
  logoutButton: {
    width: '100%',
    maxWidth: 360,
    height: 48,
    backgroundColor: colors.danger,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
