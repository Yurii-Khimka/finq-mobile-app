import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fontSize, spacing } from '../../src/tokens';
import { useTheme } from '../../src/context/ThemeContext';
import { getCategoryIcon } from '../../src/utils/categoryIcons';
import { finance } from '../../src/api/client';
import { clearToken } from '../../src/store/auth';
import type { BalancesResponse, TransactionResponse } from '../../src/types/finance';
import { formatCurrency, formatDate, envelopeLabel } from '../../src/utils/format';
import { getBalances as getLocalBalances, getTransactions as getLocalTransactions, getPendingCount } from '../../src/db/queries';
import { syncBalances, syncHistory } from '../../src/db/sync';

const ENVELOPE_KEYS = ['mandatory', 'non_mandatory', 'investments', 'dreams'] as const;
const ENVELOPE_PCTS: Record<string, string> = {
  mandatory: '50%',
  non_mandatory: '30%',
  investments: '10%',
  dreams: '10%',
};

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [balances, setBalances] = useState<BalancesResponse | null>(null);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [usdRate, setUsdRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  const envelopeMeta: Record<string, { color: string; pct: string }> = useMemo(() => ({
    mandatory: { color: colors.envelopeMandatory, pct: '50%' },
    non_mandatory: { color: colors.envelopeNonMandatory, pct: '30%' },
    investments: { color: colors.envelopeInvestments, pct: '10%' },
    dreams: { color: colors.envelopeDreams, pct: '10%' },
  }), [colors]);

  const fetchData = useCallback(async () => {
    setError('');

    // Read local cache first
    const localBal = getLocalBalances();
    const localTx = getLocalTransactions('all');
    if (localBal) setBalances(localBal);
    if (localTx.length > 0) setTransactions(localTx.slice(0, 10));
    if (localBal || localTx.length > 0) setLoading(false);

    // Then sync from server
    try {
      const [bal, hist, rate] = await Promise.all([
        syncBalances(),
        syncHistory('all'),
        finance.getRate('USD').catch(() => null),
      ]);
      setBalances(bal);
      setTransactions(hist.slice(0, 10));
      setUsdRate(rate?.rate ?? null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('401')) {
        await clearToken();
        router.replace('/(auth)/login');
        return;
      }
      if (!localBal && getLocalBalances() === null) {
        setError('Failed to load data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPendingCount(getPendingCount());
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  function handleRefresh() {
    setRefreshing(true);
    fetchData();
  }

  const styles = useMemo(() => StyleSheet.create({
    scroll: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: spacing.xl },
    center: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    balanceSection: { alignItems: 'center', paddingVertical: spacing.lg },
    pendingText: {
      fontSize: fontSize.xs,
      color: colors.warning,
      marginTop: spacing.xs,
    },
    balanceMain: {
      fontSize: fontSize.xxl,
      fontWeight: '700',
      color: colors.text,
    },
    balanceSub: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: spacing.md,
      gap: 12,
    },
    card: {
      width: '47%',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      borderLeftWidth: 3,
    },
    cardLabel: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
    cardAmount: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: colors.text,
      marginTop: spacing.xs,
    },
    cardPct: {
      fontSize: fontSize.xs,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    txSection: { padding: spacing.md },
    txTitle: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },
    txRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: spacing.sm,
    },
    txLeft: {},
    txRight: { alignItems: 'flex-end' },
    txCategory: { fontSize: fontSize.md, color: colors.text },
    txDate: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
    txAmount: { fontSize: fontSize.md },
    txEnvelope: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
    errorText: { color: colors.danger, fontSize: fontSize.md, marginBottom: spacing.md },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 8,
    },
    retryText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
    emptyText: { color: colors.textSecondary, fontSize: fontSize.md, textAlign: 'center' },
  }), [colors]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalUah =
    (balances?.mandatory ?? 0) +
    (balances?.non_mandatory ?? 0) +
    (balances?.investments ?? 0) +
    (balances?.dreams ?? 0);

  const showUsd = usdRate != null && usdRate > 0;
  const totalUsd = showUsd ? totalUah / usdRate : 0;

  return (
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
      {/* Section A — Total Balance */}
      <View style={styles.balanceSection}>
        <Text style={styles.balanceMain}>
          {showUsd ? formatCurrency(totalUsd, 'USD') : formatCurrency(totalUah, 'UAH')}
        </Text>
        {showUsd && (
          <Text style={styles.balanceSub}>{formatCurrency(totalUah, 'UAH')}</Text>
        )}
        {pendingCount > 0 && (
          <Text style={styles.pendingText}>
            {pendingCount} pending change{pendingCount !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {/* Section B — Envelope cards */}
      <View style={styles.grid}>
        {ENVELOPE_KEYS.map((key) => {
          const uah = balances?.[key] ?? 0;
          const meta = envelopeMeta[key];
          return (
            <View key={key} style={[styles.card, { borderLeftColor: meta.color }]}>
              <Text style={styles.cardLabel}>{envelopeLabel(key)}</Text>
              <Text style={styles.cardAmount}>
                {showUsd ? formatCurrency(uah / usdRate, 'USD') : formatCurrency(uah, 'UAH')}
              </Text>
              <Text style={styles.cardPct}>{meta.pct}</Text>
            </View>
          );
        })}
      </View>

      {/* Section C — Recent transactions */}
      <View style={styles.txSection}>
        <Text style={styles.txTitle}>Recent</Text>
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions yet</Text>
        ) : (
          transactions.map((tx) => {
            const isExpense = tx.type === 'expense';
            return (
              <View key={tx.id} style={styles.txRow}>
                <View style={styles.txLeft}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={getCategoryIcon(tx.category)} size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={styles.txCategory}>{tx.category}</Text>
                  </View>
                  <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
                </View>
                <View style={styles.txRight}>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: isExpense ? colors.danger : colors.success },
                    ]}
                  >
                    {isExpense ? '-' : '+'}
                    {formatCurrency(Math.abs(tx.amount_uah), 'UAH')}
                  </Text>
                  <Text style={styles.txEnvelope}>{tx.envelope}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
