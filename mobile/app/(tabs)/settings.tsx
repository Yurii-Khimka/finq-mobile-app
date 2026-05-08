import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, fontSize, spacing } from '../../src/tokens';
import { finance } from '../../src/api/client';
import { clearToken } from '../../src/store/auth';

const CURRENCIES = [
  { value: 'UAH', label: 'UAH (₴)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
] as const;

type Currency = 'UAH' | 'USD' | 'EUR';

export default function SettingsScreen() {
  const router = useRouter();

  const [currency, setCurrency] = useState<Currency>('UAH');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const config = await finance.getConfig();
      setCurrency(config.base_currency as Currency);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('401')) {
        await clearToken();
        router.replace('/(auth)/login');
      }
    }
  }, [router]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  async function handleCurrencyChange(value: Currency) {
    const prev = currency;
    setCurrency(value);
    setSaving(true);
    try {
      await finance.updateConfig({ base_currency: value });
    } catch {
      setCurrency(prev);
      Alert.alert('Error', 'Failed to update currency. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    Alert.alert(
      'Log out of finQ?',
      "You'll need to sign in again.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await clearToken();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  }

  function handleReset() {
    Alert.alert('Coming soon', 'This feature is not yet available.');
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchConfig();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Display Currency */}
        <Text style={styles.sectionHeader}>DISPLAY CURRENCY</Text>
        <View style={styles.sectionCard}>
          <View style={styles.segmentedControl}>
            {CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c.value}
                style={[
                  styles.segment,
                  currency === c.value && styles.segmentActive,
                ]}
                onPress={() => handleCurrencyChange(c.value)}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.segmentText,
                    currency === c.value && styles.segmentTextActive,
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {saving && (
            <ActivityIndicator
              color={colors.primary}
              style={styles.savingIndicator}
            />
          )}
        </View>

        {/* Account */}
        <Text style={styles.sectionHeader}>ACCOUNT</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <Text style={styles.sectionHeader}>ABOUT</Text>
        <View style={styles.sectionCard}>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Build</Text>
            <Text style={styles.rowValue}>MVP</Text>
          </View>
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionHeader, { color: colors.danger }]}>
          DANGER ZONE
        </Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={[styles.row, { opacity: 0.5 }]}
            onPress={handleReset}
          >
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
              Reset All Data
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },

  // Section header
  sectionHeader: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 24,
  },

  // Section card
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Segmented control
  segmentedControl: {
    flexDirection: 'row',
    padding: 4,
  },
  segment: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: fontSize.md, color: colors.textSecondary },
  segmentTextActive: { color: '#fff', fontWeight: '600' },
  savingIndicator: { paddingVertical: 8 },

  // Rows
  row: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: fontSize.md, color: colors.text },
  rowValue: { fontSize: fontSize.md, color: colors.textSecondary },

  // Logout
  logoutButton: {
    height: 48,
    backgroundColor: colors.danger,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 8,
  },
  logoutText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
});
