import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { NetWorthChart } from '@/components/finance/NetWorthChart';
import { Card } from '@/components/ui/Card';
import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import { brand, surface, theme, typo } from '@/theme/tokens';
import { useApp } from '@/context/app';
import { format } from '@/lib/format';

export default function NetWorthDetailScreen() {
  const router = useRouter();
  const app = useApp();
  const history = app.netWorthHistory;

  const stats = useMemo(() => {
    if (history.length < 2) return null;
    const sorted = [...history].sort(
      (a, b) => +new Date(a.date) - +new Date(b.date)
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const change = last.netWorth - first.netWorth;
    const changePct =
      first.netWorth !== 0 ? (change / Math.abs(first.netWorth)) * 100 : 0;
    const values = sorted.map((s) => s.netWorth);
    const high = Math.max(...values);
    const low = Math.min(...values);
    const spanMs = +new Date(last.date) - +new Date(first.date);
    const spanDays = Math.max(1, Math.round(spanMs / (1000 * 60 * 60 * 24)));
    return {
      first,
      last,
      change,
      changePct,
      high,
      low,
      spanDays,
    };
  }, [history]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: 'Net Worth',
          headerTintColor: brand.accent,
          headerLeft: () => <HeaderBackButton onPress={() => router.back()} />,
        }}
      />

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Net worth</Text>
        <Text
          style={[typo.heroBalance, styles.heroValue]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {format.money(app.summary.netWorth)}
        </Text>
        {stats ? (
          <Text style={styles.heroSub}>
            {format.signedMoney(stats.change)}
            {' · '}
            {stats.changePct >= 0 ? '+' : ''}
            {stats.changePct.toFixed(1)}% over {stats.spanDays}d
          </Text>
        ) : null}
      </View>

      <Card style={styles.chartCard}>
        <NetWorthChart snapshots={history} detailed />
      </Card>

      {stats ? (
        <View style={styles.statsRow}>
          <StatCell label="High" value={format.money(stats.high)} />
          <StatCell label="Low" value={format.money(stats.low)} />
          <StatCell label="Start" value={format.money(stats.first.netWorth)} />
        </View>
      ) : null}
    </ScrollView>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: surface.canvas,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 20,
  },
  hero: {
    alignItems: 'flex-start',
  },
  heroLabel: {
    fontSize: 15,
    color: surface.labelMuted,
    marginBottom: 6,
  },
  heroValue: {
    color: surface.label,
  },
  heroSub: {
    marginTop: 8,
    fontSize: 15,
    color: surface.labelSecondary,
    fontVariant: ['tabular-nums'],
  },
  chartCard: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCell: {
    flex: 1,
    backgroundColor: surface.elevated,
    borderRadius: theme.cardCorner,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 6,
  },
  statLabel: {
    fontSize: 13,
    color: surface.labelMuted,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '500',
    color: surface.label,
    fontVariant: ['tabular-nums'],
  },
});
