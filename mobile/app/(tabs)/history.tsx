import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fontSize, spacing } from '../../src/tokens';
import { useTheme } from '../../src/context/ThemeContext';
import { getCategoryIcon } from '../../src/utils/categoryIcons';
import { finance } from '../../src/api/client';
import { clearToken } from '../../src/store/auth';
import type { TransactionResponse } from '../../src/types/finance';
import { formatCurrency, formatDate, envelopeLabel } from '../../src/utils/format';
import SwipeableRow from '../../src/components/SwipeableRow';
import { getTransactions as getLocalTransactions, deleteTransaction as deleteLocalTransaction, insertPendingWrite } from '../../src/db/queries';
import { syncHistory } from '../../src/db/sync';

const ENVELOPE_FILTERS = ['all', 'mandatory', 'non_mandatory', 'investments', 'dreams'] as const;
type EnvelopeFilter = (typeof ENVELOPE_FILTERS)[number];

const ENVELOPE_LABELS: Record<EnvelopeFilter, string> = {
  all: 'All Envelopes',
  mandatory: 'Mandatory',
  non_mandatory: 'Non-Mandatory',
  investments: 'Investments',
  dreams: 'Dreams',
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Section {
  title: string;
  data: TransactionResponse[];
}

export default function HistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [envelopeFilter, setEnvelopeFilter] = useState<EnvelopeFilter>('all');
  const [error, setError] = useState('');

  // Months that have data (derived from "all" fetch)
  const [availableMonths, setAvailableMonths] = useState<number[]>([]);

  const fetchHistory = useCallback(async (filter: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError('');

    // Read local cache first
    const localData = getLocalTransactions(filter);
    if (localData.length > 0) {
      setTransactions(localData);
      if (filter === 'all') {
        const months = [...new Set(localData.map((t) => new Date(t.date).getMonth()))];
        setAvailableMonths(months.sort((a, b) => b - a));
      }
      setLoading(false);
    }

    // Then sync from server
    try {
      const data = await syncHistory(filter);
      setTransactions(data);

      if (filter === 'all') {
        const months = [...new Set(data.map((t) => new Date(t.date).getMonth()))];
        setAvailableMonths(months.sort((a, b) => b - a));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('401')) {
        await clearToken();
        router.replace('/(auth)/login');
      } else if (localData.length === 0) {
        setError('Failed to load history');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchHistory(dateFilter);
  }, [dateFilter, fetchHistory]);

  // Client-side envelope filter
  const filtered = useMemo(() => {
    if (envelopeFilter === 'all') return transactions;
    return transactions.filter((t) => t.envelope === envelopeFilter);
  }, [transactions, envelopeFilter]);

  // Group by day
  const sections: Section[] = useMemo(() => {
    const groups: Record<string, TransactionResponse[]> = {};
    for (const t of filtered) {
      const day = t.date.slice(0, 10); // YYYY-MM-DD
      (groups[day] ??= []).push(t);
    }
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((day) => ({ title: formatDate(day), data: groups[day] }));
  }, [filtered]);

  // Summary
  const { count, totalSpent } = useMemo(() => {
    let spent = 0;
    for (const t of filtered) {
      if (t.type === 'expense') spent += t.amount_uah;
    }
    return { count: filtered.length, totalSpent: spent };
  }, [filtered]);

  async function handleDelete(id: string) {
    try {
      await finance.removeTransaction(id);
      deleteLocalTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const isNetworkError = e instanceof TypeError || msg.includes('Network') || msg.includes('fetch');

      if (msg.includes('401')) {
        await clearToken();
        router.replace('/(auth)/login');
      } else if (isNetworkError) {
        // Queue for offline sync
        insertPendingWrite('removeTransaction', { id });
        deleteLocalTransaction(id);
        setTransactions((prev) => prev.filter((t) => t.id !== id));
      } else {
        setError('Failed to delete transaction');
      }
    }
  }

  function formatTime(dateString: string): string {
    const d = new Date(dateString);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  // Date filter pills
  const datePills: { label: string; value: string }[] = [
    { label: 'All', value: 'all' },
    { label: 'This Month', value: 'current' },
    ...availableMonths.map((m) => ({
      label: MONTH_NAMES[m],
      value: String(m + 1).padStart(2, '0'),
    })),
  ];

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    filterScroll: { flexGrow: 0 },
    filterContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: 8 },
    pill: {
      height: 32,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    pillText: { fontSize: fontSize.sm, color: colors.textSecondary },
    pillTextActive: { color: '#fff' },
    summaryBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    summaryText: { fontSize: fontSize.xs, color: colors.textSecondary },
    error: {
      color: colors.danger,
      fontSize: fontSize.sm,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    sectionHeader: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      fontWeight: '700',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.background,
    },
    txRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      marginHorizontal: spacing.md,
      marginBottom: 4,
    },
    txLeft: { flex: 1 },
    txCategory: { fontSize: fontSize.md, color: colors.text, fontWeight: '600' },
    txEnvelope: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
    txRight: { alignItems: 'flex-end' },
    txAmount: { fontSize: fontSize.md, fontWeight: '600' },
    txOriginal: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
    txTime: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
    listContent: { paddingBottom: spacing.lg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyIcon: { fontSize: 48, marginBottom: spacing.sm },
    emptyText: { fontSize: fontSize.md, color: colors.textSecondary },
  }), [colors]);

  function renderTransaction({ item }: { item: TransactionResponse }) {
    const isExpense = item.type === 'expense';
    const amountColor = isExpense ? colors.danger : colors.success;
    const sign = isExpense ? '-' : '+';

    return (
      <SwipeableRow onDelete={() => handleDelete(item.id)}>
        <View style={styles.txRow}>
          <View style={styles.txLeft}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name={getCategoryIcon(item.category)} size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.txCategory}>{item.category}</Text>
            </View>
            <Text style={styles.txEnvelope}>{envelopeLabel(item.envelope)}</Text>
          </View>
          <View style={styles.txRight}>
            <Text style={[styles.txAmount, { color: amountColor }]}>
              {sign}{formatCurrency(Math.abs(item.amount_uah), 'UAH')}
            </Text>
            {item.original_amount != null && item.original_currency && (
              <Text style={styles.txOriginal}>
                {item.original_currency === 'USD' ? '$' : '€'}
                {item.original_amount.toFixed(2)}
              </Text>
            )}
            <Text style={styles.txTime}>{formatTime(item.date)}</Text>
          </View>
        </View>
      </SwipeableRow>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Date filter row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {datePills.map((p) => (
          <TouchableOpacity
            key={p.value}
            style={[styles.pill, dateFilter === p.value && styles.pillActive]}
            onPress={() => setDateFilter(p.value)}
          >
            <Text style={[styles.pillText, dateFilter === p.value && styles.pillTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Envelope filter row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {ENVELOPE_FILTERS.map((ef) => (
          <TouchableOpacity
            key={ef}
            style={[styles.pill, envelopeFilter === ef && styles.pillActive]}
            onPress={() => setEnvelopeFilter(ef)}
          >
            <Text style={[styles.pillText, envelopeFilter === ef && styles.pillTextActive]}>
              {ENVELOPE_LABELS[ef]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Summary bar */}
      {!loading && filtered.length > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {count} transaction{count !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.summaryText}>
            {formatCurrency(totalSpent, 'UAH')} spent
          </Text>
        </View>
      )}

      {/* Error */}
      {error !== '' && <Text style={styles.error}>{error}</Text>}

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>
            {transactions.length === 0 ? 'No transactions' : 'No transactions match filters'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchHistory(dateFilter, true)}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled
        />
      )}
    </SafeAreaView>
  );
}
