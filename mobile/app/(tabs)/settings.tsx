import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { fontSize, spacing, type ThemeName } from '../../src/tokens';
import { useTheme } from '../../src/context/ThemeContext';
import { finance } from '../../src/api/client';
import { clearToken } from '../../src/store/auth';
import { getConfig as getLocalConfig, upsertConfig, clearAllData, getConfigValue, setConfigValue } from '../../src/db/queries';
import { syncConfig } from '../../src/db/sync';

const CURRENCIES = [
  { value: 'UAH', label: 'UAH (₴)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
] as const;

type Currency = 'UAH' | 'USD' | 'EUR';

const THEMES: { value: ThemeName; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'monochrome', label: 'Mono' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, colors, setTheme } = useTheme();

  const [currency, setCurrency] = useState<Currency>('UAH');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const fetchConfig = useCallback(async () => {
    // Read local cache first
    const localConfig = getLocalConfig();
    setCurrency(localConfig.base_currency as Currency);

    // Then sync from server
    try {
      const config = await syncConfig();
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
    // Check biometric availability
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);
      if (hasHardware && isEnrolled) {
        setBiometricEnabled(getConfigValue('biometric_lock') === 'true');
      }
    })();
  }, [fetchConfig]);

  async function handleBiometricToggle(value: boolean) {
    if (value) {
      // Verify biometric before enabling
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric lock',
      });
      if (result.success) {
        setBiometricEnabled(true);
        setConfigValue('biometric_lock', 'true');
      }
    } else {
      setBiometricEnabled(false);
      setConfigValue('biometric_lock', 'false');
    }
  }

  async function handleCurrencyChange(value: Currency) {
    const prev = currency;
    setCurrency(value);
    setSaving(true);
    try {
      await finance.updateConfig({ base_currency: value });
      upsertConfig({ base_currency: value });
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
            clearAllData();
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

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { padding: spacing.md, paddingBottom: spacing.xl },
    sectionHeader: {
      fontSize: fontSize.xs,
      color: colors.textSecondary,
      fontWeight: '600',
      letterSpacing: 1,
      marginBottom: 8,
      marginTop: 24,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
    },
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
    logoutButton: {
      height: 48,
      backgroundColor: colors.danger,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      margin: 8,
    },
    logoutText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
    dangerHeader: {
      fontSize: fontSize.xs,
      color: colors.danger,
      fontWeight: '600',
      letterSpacing: 1,
      marginBottom: 8,
      marginTop: 24,
    },
  }), [colors]);

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
        {/* Theme */}
        <Text style={styles.sectionHeader}>THEME</Text>
        <View style={styles.sectionCard}>
          <View style={styles.segmentedControl}>
            {THEMES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.segment,
                  theme === t.value && styles.segmentActive,
                ]}
                onPress={() => setTheme(t.value)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    theme === t.value && styles.segmentTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Security */}
        {biometricAvailable && (
          <>
            <Text style={styles.sectionHeader}>SECURITY</Text>
            <View style={styles.sectionCard}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Biometric Lock</Text>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </>
        )}

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
        <Text style={styles.dangerHeader}>DANGER ZONE</Text>
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
