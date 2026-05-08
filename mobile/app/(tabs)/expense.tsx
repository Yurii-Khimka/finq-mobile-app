import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, fontSize, spacing } from '../../src/tokens';
import { finance } from '../../src/api/client';
import { clearToken } from '../../src/store/auth';
import type { CategoryResponse, ImpactResponse } from '../../src/types/finance';
import { formatCurrency, envelopeLabel } from '../../src/utils/format';
import NumPad from '../../src/components/NumPad';
import { getCategories as getLocalCategories } from '../../src/db/queries';
import { syncCategories, syncBalances, syncHistory } from '../../src/db/sync';

const CURRENCIES = ['UAH', 'USD', 'EUR'] as const;
type Currency = (typeof CURRENCIES)[number];

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  UAH: '₴',
  USD: '$',
  EUR: '€',
};

const ENVELOPE_COLORS: Record<string, string> = {
  mandatory: colors.primary,
  non_mandatory: colors.success,
  investments: colors.warning,
  dreams: '#EC4899',
};

const RISK_COLORS: Record<string, string> = {
  GREEN: colors.success,
  YELLOW: colors.warning,
  RED: colors.danger,
};

export default function ExpenseScreen() {
  const router = useRouter();

  // Input state
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('UAH');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Confirmation state
  const [mode, setMode] = useState<'input' | 'confirm'>('input');
  const [impact, setImpact] = useState<ImpactResponse | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const numericAmount = parseFloat(amount) || 0;
  const canConfirm = numericAmount > 0 && selectedCategory !== '';

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    // Read local cache first
    const localCats = getLocalCategories();
    if (localCats.length > 0) {
      setCategories(localCats);
      setLoadingCategories(false);
    }

    // Then sync from server
    try {
      const cats = await syncCategories();
      setCategories(cats);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('401')) {
        await clearToken();
        router.replace('/(auth)/login');
      }
    } finally {
      setLoadingCategories(false);
    }
  }

  // Group categories by envelope
  const grouped = categories.reduce<Record<string, CategoryResponse[]>>((acc, cat) => {
    (acc[cat.envelope_name] ??= []).push(cat);
    return acc;
  }, {});

  async function handleConfirm() {
    setError('');
    setLoadingImpact(true);
    try {
      const impactResult = await finance.calculateImpact({
        amount: numericAmount,
        category: selectedCategory,
      });
      setImpact(impactResult);
      setMode('confirm');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('401')) {
        await clearToken();
        router.replace('/(auth)/login');
      } else if (msg.includes('404')) {
        setError('Category not found');
      } else {
        setError('Failed to load impact preview');
      }
    } finally {
      setLoadingImpact(false);
    }
  }

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      const result = await finance.addExpense({
        category: selectedCategory,
        amount: numericAmount,
        currency,
      });

      // Sync cache after successful expense
      syncBalances().catch(() => {});
      syncHistory('all').catch(() => {});

      if (result.breach_note) {
        Alert.alert('Budget Breach', result.breach_note, [
          { text: 'OK', onPress: () => router.navigate('/(tabs)') },
        ]);
      } else {
        router.navigate('/(tabs)');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('401')) {
        await clearToken();
        router.replace('/(auth)/login');
      } else if (msg.includes('502')) {
        setError('Exchange rate unavailable');
      } else if (msg.includes('404')) {
        setError('Category not found');
      } else {
        setError('Failed to submit expense');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    setMode('input');
    setImpact(null);
    setError('');
  }

  function resetForm() {
    setAmount('');
    setSelectedCategory('');
    setCurrency('UAH');
    setMode('input');
    setImpact(null);
    setError('');
  }

  // ── Confirmation mode ──
  if (mode === 'confirm' && impact) {
    const riskColor = RISK_COLORS[impact.risk_score] ?? colors.textSecondary;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.confirmContainer}>
          <View style={styles.impactCard}>
            <Text style={styles.impactTitle}>
              Spend {CURRENCY_SYMBOLS[currency]}
              {numericAmount.toFixed(2)} on {selectedCategory}
            </Text>

            <View style={styles.impactRow}>
              <Text style={styles.impactLabel}>Spendable</Text>
              <Text style={styles.impactValue}>
                {formatCurrency(impact.spendable_before, 'UAH')} →{' '}
                {formatCurrency(impact.spendable_after, 'UAH')}
              </Text>
            </View>

            <View style={styles.impactRow}>
              <Text style={styles.impactLabel}>Daily limit</Text>
              <Text style={styles.impactValue}>
                {formatCurrency(impact.daily_limit_before, 'UAH')} →{' '}
                {formatCurrency(impact.daily_limit_after, 'UAH')}
              </Text>
            </View>

            <View style={[styles.riskBadge, { backgroundColor: riskColor }]}>
              <Text style={styles.riskText}>{impact.risk_score}</Text>
            </View>

            {impact.waterfall_triggered && (
              <Text style={styles.breachWarning}>
                ⚠️ Budget breach — pulls from other envelopes
              </Text>
            )}
          </View>

          {error !== '' && <Text style={styles.error}>{error}</Text>}

          <View style={styles.confirmButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Confirm Expense</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Input mode ──
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

      {/* Category picker */}
      <ScrollView style={styles.categoryScroll} contentContainerStyle={styles.categoryContent}>
        {loadingCategories ? (
          <ActivityIndicator color={colors.primary} />
        ) : categories.length === 0 ? (
          <Text style={styles.emptyText}>No categories yet. Add them in Settings.</Text>
        ) : (
          Object.entries(grouped).map(([envelope, cats]) => (
            <View key={envelope}>
              <Text style={styles.sectionHeader}>{envelopeLabel(envelope)}</Text>
              <View style={styles.chipGrid}>
                {cats.map((cat) => (
                  <TouchableOpacity
                    key={cat.name}
                    style={[
                      styles.chip,
                      selectedCategory === cat.name && styles.chipSelected,
                    ]}
                    onPress={() => setSelectedCategory(cat.name)}
                  >
                    <View
                      style={[
                        styles.chipDot,
                        { backgroundColor: ENVELOPE_COLORS[cat.envelope_name] ?? colors.textSecondary },
                      ]}
                    />
                    <Text style={styles.chipText}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Error */}
      {error !== '' && <Text style={styles.errorBottom}>{error}</Text>}

      {/* NumPad + confirm */}
      <View style={styles.padSection}>
        <NumPad value={amount} onValueChange={setAmount} />

        <TouchableOpacity
          style={[styles.confirmButton, !canConfirm && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={!canConfirm || loadingImpact}
        >
          {loadingImpact ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={[
                styles.confirmButtonText,
                !canConfirm && styles.confirmButtonTextDisabled,
              ]}
            >
              Confirm
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
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
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
  currencyPillActive: { backgroundColor: colors.primary },
  currencyPillText: { fontSize: fontSize.sm, color: colors.textSecondary },
  currencyPillTextActive: { color: '#fff' },

  // Categories
  categoryScroll: { flex: 1 },
  categoryContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  sectionHeader: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSelected: { borderColor: colors.primary },
  chipDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  chipText: { fontSize: fontSize.sm, color: colors.text },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.md, textAlign: 'center', marginTop: spacing.lg },

  // NumPad area
  padSection: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  confirmButton: {
    width: '100%',
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonDisabled: { backgroundColor: colors.surfaceAlt },
  confirmButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  confirmButtonTextDisabled: { color: colors.textSecondary },

  // Error
  error: { color: colors.danger, fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.sm },
  errorBottom: { color: colors.danger, fontSize: fontSize.sm, textAlign: 'center', paddingHorizontal: spacing.md },

  // Confirmation mode
  confirmContainer: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  impactCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
  },
  impactTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  impactLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  impactValue: { fontSize: fontSize.sm, color: colors.text },
  riskBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  riskText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '700' },
  breachWarning: {
    color: colors.warning,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },

  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  submitButton: {
    flex: 1,
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
});
