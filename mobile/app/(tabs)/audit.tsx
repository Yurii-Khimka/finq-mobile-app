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
import { useRouter } from 'expo-router';
import { fontSize, spacing } from '../../src/tokens';
import { useTheme } from '../../src/context/ThemeContext';
import { finance } from '../../src/api/client';
import { clearToken } from '../../src/store/auth';
import type {
  AuditResponse,
  SustainabilityResponse,
  AnomalyItem,
  AdvisorResponse,
} from '../../src/types/finance';
import { formatCurrency, envelopeLabel } from '../../src/utils/format';

const SUSTAINABILITY_KEYS = [
  { key: 'mandatory', burnKey: 'mandatory_burn' as const, dtzKey: 'days_to_zero_mandatory' as const, safeKey: 'safe_daily_mandatory' as const },
  { key: 'non_mandatory', burnKey: 'non_mandatory_burn' as const, dtzKey: 'days_to_zero_non_mandatory' as const, safeKey: 'safe_daily_non_mandatory' as const },
] as const;

export default function AuditScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [sustainability, setSustainability] = useState<SustainabilityResponse | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [advisor, setAdvisor] = useState<AdvisorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const envelopeColors: Record<string, string> = useMemo(() => ({
    mandatory: colors.envelopeMandatory,
    non_mandatory: colors.envelopeNonMandatory,
    investments: colors.envelopeInvestments,
    dreams: colors.envelopeDreams,
  }), [colors]);

  const healthColors: Record<string, string> = useMemo(() => ({
    healthy: colors.success,
    warning: colors.warning,
    critical: colors.danger,
  }), [colors]);

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const [auditData, susData, anomData, advData] = await Promise.all([
        finance.getAudit(),
        finance.getSustainability(),
        finance.getAnomalies(),
        finance.getAdvisor().catch(() => null),
      ]);
      setAudit(auditData);
      setSustainability(susData);
      setAnomalies(anomData);
      setAdvisor(advData);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('401')) {
        await clearToken();
        router.replace('/(auth)/login');
        return;
      }
      setError('Audit data requires internet connection');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const styles = useMemo(() => StyleSheet.create({
    scroll: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl },
    center: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: fontSize.md,
      color: colors.text,
      fontWeight: '600',
      marginBottom: spacing.sm,
    },
    healthRow: { alignItems: 'center', marginBottom: spacing.sm },
    healthBadge: {
      height: 40,
      borderRadius: 20,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    healthBadgeText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '700' },
    spendableAmount: {
      fontSize: fontSize.xxl,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    spendableLabel: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 2,
    },
    safeDaily: {
      fontSize: fontSize.sm,
      color: colors.success,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    daysRemaining: {
      fontSize: fontSize.xs,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    burnRate: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: colors.text,
    },
    projection: { fontSize: fontSize.sm, marginTop: 4 },
    totalSpent: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: 4,
    },
    noBreach: { fontSize: fontSize.sm, color: colors.success },
    breachSummary: { fontSize: fontSize.sm, color: colors.danger, marginBottom: spacing.sm },
    breachEnvRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    envDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    breachEnvLabel: { flex: 1, fontSize: fontSize.sm, color: colors.text },
    breachEnvAmount: { fontSize: fontSize.sm, color: colors.text },
    topBreachRow: { marginTop: spacing.sm },
    topBreachCategory: { fontSize: fontSize.sm, color: colors.text },
    topBreachDetail: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
    susRow: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 8,
    },
    susBorder: { width: 4 },
    susContent: { flex: 1, padding: 12 },
    susName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
    susDetail: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
    anomalyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    anomalyLeft: { flex: 1 },
    anomalyCategory: { fontSize: fontSize.sm, color: colors.text },
    anomalyAmounts: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
    ratioBadge: {
      backgroundColor: colors.warning,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    ratioText: { color: '#fff', fontSize: fontSize.xs, fontWeight: '700' },
    advisorText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
    errorText: { color: colors.danger, fontSize: fontSize.md, marginBottom: spacing.md },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 8,
    },
    retryText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  }), [colors]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && !audit) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchAll()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const healthSignal = audit?.health_signal?.toLowerCase() ?? 'healthy';
  const healthColor = healthColors[healthSignal] ?? colors.textSecondary;
  const healthLabel = healthSignal.charAt(0).toUpperCase() + healthSignal.slice(1);

  // Burn rate projection
  let projectionText = 'No spending yet this month';
  let projectionColor = colors.textSecondary;
  if (audit && audit.days_to_zero != null) {
    if (audit.days_to_zero >= audit.days_remaining) {
      projectionText = "You're on track";
      projectionColor = colors.success;
    } else {
      projectionText = 'Overspending — will run out before month ends';
      projectionColor = colors.danger;
    }
  }

  // Breach envelope breakdown
  const breachEnvelopes = audit
    ? Object.entries(audit.breach_by_envelope).filter(([, v]) => v > 0)
    : [];

  // Sort anomalies by ratio descending
  const sortedAnomalies = [...anomalies].sort((a, b) => b.ratio - a.ratio);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchAll(true)}
          tintColor={colors.primary}
        />
      }
    >
      {/* Health Signal */}
      {audit && (
        <View style={styles.card}>
          <View style={styles.healthRow}>
            <View style={[styles.healthBadge, { backgroundColor: healthColor }]}>
              <Text style={styles.healthBadgeText}>{healthLabel}</Text>
            </View>
          </View>
          <Text style={styles.spendableAmount}>
            {formatCurrency(audit.spendable_balance, 'UAH')}
          </Text>
          <Text style={styles.spendableLabel}>spendable balance</Text>
          <Text style={styles.safeDaily}>
            Safe to spend {formatCurrency(audit.safe_daily_limit, 'UAH')}/day
          </Text>
          <Text style={styles.daysRemaining}>
            {audit.days_remaining} day{audit.days_remaining !== 1 ? 's' : ''} remaining
          </Text>
        </View>
      )}

      {/* Burn Rate */}
      {audit && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Burn Rate</Text>
          <Text style={styles.burnRate}>
            {formatCurrency(audit.burn_rate_daily, 'UAH')}/day
          </Text>
          <Text style={[styles.projection, { color: projectionColor }]}>
            {projectionText}
          </Text>
          <Text style={styles.totalSpent}>
            {formatCurrency(audit.total_spent_uah, 'UAH')} spent so far
          </Text>
        </View>
      )}

      {/* Breaches */}
      {audit && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Breaches</Text>
          {audit.breach_count === 0 ? (
            <Text style={styles.noBreach}>No breaches this month</Text>
          ) : (
            <>
              <Text style={styles.breachSummary}>
                {audit.breach_count} breach{audit.breach_count !== 1 ? 'es' : ''} totalling{' '}
                {formatCurrency(audit.breach_total_uah, 'UAH')}
              </Text>
              {breachEnvelopes.map(([env, amt]) => (
                <View key={env} style={styles.breachEnvRow}>
                  <View style={[styles.envDot, { backgroundColor: envelopeColors[env] ?? colors.textSecondary }]} />
                  <Text style={styles.breachEnvLabel}>{envelopeLabel(env)}</Text>
                  <Text style={styles.breachEnvAmount}>{formatCurrency(amt as number, 'UAH')}</Text>
                </View>
              ))}
              {audit.top_breaches.slice(0, 5).map((b, i) => (
                <View key={i} style={styles.topBreachRow}>
                  <Text style={styles.topBreachCategory}>
                    {String(b.category ?? '')} — {formatCurrency(Number(b.total ?? 0), 'UAH')}
                  </Text>
                  <Text style={styles.topBreachDetail}>
                    Breach: {formatCurrency(Number(b.breach_amount ?? 0), 'UAH')}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {/* Sustainability */}
      {sustainability && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sustainability</Text>
          {SUSTAINABILITY_KEYS.map(({ key, burnKey, dtzKey, safeKey }) => (
            <View key={key} style={styles.susRow}>
              <View style={[styles.susBorder, { backgroundColor: envelopeColors[key] }]} />
              <View style={styles.susContent}>
                <Text style={styles.susName}>{envelopeLabel(key)}</Text>
                <Text style={styles.susDetail}>
                  {formatCurrency(sustainability[burnKey], 'UAH')}/day
                  {'  '}·{'  '}
                  {sustainability[dtzKey] != null
                    ? `${sustainability[dtzKey]} days left`
                    : 'Safe'}
                </Text>
                <Text style={styles.susDetail}>
                  Safe limit: {formatCurrency(sustainability[safeKey], 'UAH')}/day
                </Text>
              </View>
            </View>
          ))}
          {/* Investments & Dreams — simpler */}
          {(['investments', 'dreams'] as const).map((key) => (
            <View key={key} style={styles.susRow}>
              <View style={[styles.susBorder, { backgroundColor: envelopeColors[key] }]} />
              <View style={styles.susContent}>
                <Text style={styles.susName}>{envelopeLabel(key)}</Text>
                <Text style={styles.susDetail}>Reserve envelope</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Anomalies */}
      {sortedAnomalies.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Spending Spikes</Text>
          {sortedAnomalies.map((a, i) => (
            <View key={i} style={styles.anomalyRow}>
              <View style={styles.anomalyLeft}>
                <Text style={styles.anomalyCategory}>{a.category}</Text>
                <Text style={styles.anomalyAmounts}>
                  Last 7d: {formatCurrency(a.last_7d, 'UAH')} · Avg: {formatCurrency(a.avg_7d, 'UAH')}
                </Text>
              </View>
              <View style={styles.ratioBadge}>
                <Text style={styles.ratioText}>{a.ratio.toFixed(1)}x</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Advisor */}
      {advisor && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Insight</Text>
          <Text style={styles.advisorText}>{advisor.text}</Text>
        </View>
      )}
    </ScrollView>
  );
}
