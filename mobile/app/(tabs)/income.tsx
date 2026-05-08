import { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, fontSize, spacing } from '../../src/tokens';
import { finance } from '../../src/api/client';
import { clearToken } from '../../src/store/auth';
import NumPad from '../../src/components/NumPad';

const CURRENCIES = ['UAH', 'USD', 'EUR'] as const;
type Currency = (typeof CURRENCIES)[number];

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  UAH: '₴',
  USD: '$',
  EUR: '€',
};

const ENVELOPES = [
  { key: 'mandatory', label: 'Mandatory', pct: 50, color: colors.primary },
  { key: 'non_mandatory', label: 'Non-Mandatory', pct: 30, color: colors.success },
  { key: 'investments', label: 'Investments', pct: 10, color: colors.warning },
  { key: 'dreams', label: 'Dreams', pct: 10, color: '#EC4899' },
] as const;

export default function IncomeScreen() {
  const router = useRouter();

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('UAH');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  const numericAmount = parseFloat(amount) || 0;
  const canSubmit = numericAmount > 0;

  async function handleSubmit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError('');
    setSubmitting(true);
    try {
      await finance.addIncome({ amount: numericAmount, currency });
      router.navigate('/(tabs)');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('401')) {
        await clearToken();
        router.replace('/(auth)/login');
      } else if (msg.includes('502')) {
        setError('Exchange rate unavailable');
      } else {
        setError('Failed to add income');
      }
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  }

  function formatSplit(pct: number): string {
    const val = (numericAmount * pct) / 100;
    const formatted = val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${CURRENCY_SYMBOLS[currency]}${formatted}`;
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Amount display */}
      <View style={styles.amountSection}>
        <Text style={styles.amountText}>
          {CURRENCY_SYMBOLS[currency]}
          {amount || '0'}
        </Text>

        <View style={styles.currencyRow}>
          {CURRENCIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.currencyPill, currency === c && styles.currencyPillActive]}
              onPress={() => setCurrency(c)}
            >
              <Text
                style={[
                  styles.currencyPillText,
                  currency === c && styles.currencyPillTextActive,
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Distribution preview */}
      <View style={styles.distributionSection}>
        {ENVELOPES.map((env) => (
          <View key={env.key} style={styles.distRow}>
            <View style={[styles.distBorder, { backgroundColor: env.color }]} />
            <View style={styles.distContent}>
              <Text style={styles.distLabel}>
                {env.label}  {env.pct}%
              </Text>
              <Text style={styles.distAmount}>{formatSplit(env.pct)}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Error */}
      {error !== '' && <Text style={styles.error}>{error}</Text>}

      {/* NumPad + submit */}
      <View style={styles.padSection}>
        <NumPad value={amount} onValueChange={setAmount} />

        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={[
                styles.submitButtonText,
                !canSubmit && styles.submitButtonTextDisabled,
              ]}
            >
              Add Income
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Amount
  amountSection: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.sm },
  amountText: {
    fontSize: fontSize.xxl + 8,
    fontWeight: '700',
    color: colors.success,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.sm,
  },
  currencyPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  currencyPillActive: { backgroundColor: colors.success },
  currencyPillText: { fontSize: fontSize.sm, color: colors.textSecondary },
  currencyPillTextActive: { color: '#fff' },

  // Distribution
  distributionSection: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: 8,
  },
  distRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
  },
  distBorder: { width: 4 },
  distContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  distLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  distAmount: { fontSize: fontSize.sm, color: colors.text },

  // Error
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },

  // NumPad area
  padSection: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  submitButton: {
    width: '100%',
    height: 52,
    backgroundColor: colors.success,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonDisabled: { backgroundColor: colors.surfaceAlt },
  submitButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  submitButtonTextDisabled: { color: colors.textSecondary },
});
